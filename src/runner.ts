import { score } from './scorers.ts'
import type { Provider, Task, TaskResult } from './types.ts'

export interface RunOptions {
  /** Aynı anda en fazla kaç görev çalışsın. */
  concurrency?: number
  /** Tek bir görev için zaman sınırı (ms). */
  timeoutMs?: number
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Zaman aşımı (${timeoutMs} ms)`)), timeoutMs)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

async function runOne(provider: Provider, task: Task, timeoutMs: number): Promise<TaskResult> {
  const started = performance.now()
  try {
    const completion = await withTimeout(provider.complete(task), timeoutMs)
    return {
      taskId: task.id,
      category: task.category,
      correct: score(task, completion.output),
      output: completion.output,
      latencyMs: Math.round(performance.now() - started),
      inputTokens: completion.inputTokens,
      outputTokens: completion.outputTokens,
    }
  } catch (error) {
    return {
      taskId: task.id,
      category: task.category,
      correct: false,
      output: '',
      latencyMs: Math.round(performance.now() - started),
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/** Görevleri sağlayıcıya verir; sonuçlar görev sırasıyla döner. Hata veren görev "yanlış" sayılır ve hatası kaydedilir. */
export async function runProvider(provider: Provider, tasks: Task[], options: RunOptions = {}): Promise<TaskResult[]> {
  const concurrency = Math.max(1, options.concurrency ?? 4)
  const timeoutMs = options.timeoutMs ?? 60_000
  const results: TaskResult[] = []
  let next = 0

  async function worker() {
    while (next < tasks.length) {
      const index = next++
      results[index] = await runOne(provider, tasks[index], timeoutMs)
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker))
  return results
}
