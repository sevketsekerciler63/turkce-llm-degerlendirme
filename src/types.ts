export type ScorerKind = 'choice' | 'number' | 'exact' | 'strict'

export interface Task {
  id: string
  category: string
  prompt: string
  scorer: ScorerKind
  /** Kabul edilen doğru yanıt(lar). `number` için sayı, `choice` için harf. */
  expected: string | number | string[]
  /** Yalnızca `number` için izin verilen mutlak sapma (varsayılan 0,0001). */
  tolerance?: number
}

export interface Completion {
  output: string
  inputTokens?: number
  outputTokens?: number
}

export interface Provider {
  id: string
  complete(task: Task): Promise<Completion>
}

export interface Price {
  /** USD / 1 milyon girdi tokeni. */
  input: number
  /** USD / 1 milyon çıktı tokeni. */
  output: number
}

export interface TaskResult {
  taskId: string
  category: string
  correct: boolean
  output: string
  latencyMs: number
  inputTokens?: number
  outputTokens?: number
  error?: string
}
