import { describe, expect, it } from 'vitest'
import { costUsd, renderReport, wilsonInterval } from '../src/report.ts'
import { runProvider } from '../src/runner.ts'
import type { Provider, Task, TaskResult } from '../src/types.ts'

const tasks: Task[] = [
  { id: 'a', category: 'k1', prompt: 'p', scorer: 'exact', expected: 'x' },
  { id: 'b', category: 'k1', prompt: 'p', scorer: 'exact', expected: 'y' },
  { id: 'c', category: 'k2', prompt: 'p', scorer: 'exact', expected: 'z' },
]

describe('runProvider', () => {
  it('sonuçları görev sırasıyla döndürür ve eşzamanlılık sınırını aşmaz', async () => {
    let active = 0
    let peak = 0
    const provider: Provider = {
      id: 'p',
      complete: async (task) => {
        active++
        peak = Math.max(peak, active)
        await new Promise((r) => setTimeout(r, 15))
        active--
        return { output: task.id === 'c' ? 'z' : 'yanlış' }
      },
    }
    const results = await runProvider(provider, tasks, { concurrency: 2 })
    expect(results.map((r) => r.taskId)).toEqual(['a', 'b', 'c'])
    expect(results.map((r) => r.correct)).toEqual([false, false, true])
    expect(peak).toBeLessThanOrEqual(2)
  })

  it('hata veren görevi yanlış sayar, hatayı kaydeder ve diğerlerine devam eder', async () => {
    const provider: Provider = {
      id: 'p',
      complete: async (task) => {
        if (task.id === 'b') throw new Error('API hatası')
        return { output: 'x' }
      },
    }
    const results = await runProvider(provider, tasks)
    expect(results[1]).toMatchObject({ correct: false, error: 'API hatası' })
    expect(results[0].correct).toBe(true)
  })

  it('zaman aşımına uğrayan görevi hata olarak işaretler', async () => {
    const provider: Provider = { id: 'p', complete: () => new Promise(() => {}) }
    const results = await runProvider(provider, tasks.slice(0, 1), { timeoutMs: 20 })
    expect(results[0].error).toMatch(/Zaman aşımı/)
  })
})

describe('wilsonInterval', () => {
  it('küçük örneklemde geniş, büyük örneklemde dar aralık verir', () => {
    const small = wilsonInterval(8, 10)
    const large = wilsonInterval(800, 1000)
    expect(small.high - small.low).toBeGreaterThan(large.high - large.low)
    expect(small.low).toBeLessThan(0.8)
    expect(small.high).toBeGreaterThan(0.8)
  })
  it('uç değerlerde 0–1 aralığını aşmaz', () => {
    expect(wilsonInterval(0, 10).low).toBe(0)
    expect(wilsonInterval(10, 10).high).toBeLessThanOrEqual(1)
    expect(wilsonInterval(0, 0)).toEqual({ low: 0, high: 0 })
  })
})

describe('costUsd', () => {
  const results: TaskResult[] = [
    { taskId: 'a', category: 'k', correct: true, output: '', latencyMs: 1, inputTokens: 1_000_000, outputTokens: 500_000 },
  ]
  it('token ve fiyattan dolar hesaplar', () => {
    expect(costUsd(results, { input: 4, output: 20 })).toBeCloseTo(4 + 10, 6)
  })
  it('fiyat yoksa tanımsız döner', () => {
    expect(costUsd(results, undefined)).toBeUndefined()
  })
})

describe('renderReport', () => {
  it('genel tabloyu, kategori kırılımını ve küçük örneklem uyarısını yazar', () => {
    const results: TaskResult[] = [
      { taskId: 'a', category: 'k1', correct: true, output: 'x', latencyMs: 10 },
      { taskId: 'b', category: 'k1', correct: false, output: '', latencyMs: 30 },
      { taskId: 'c', category: 'k2', correct: false, output: '', latencyMs: 20, error: 'hata' },
    ]
    const report = renderReport([{ providerId: 'model-1', results }], new Date('2026-10-31T00:00:00Z'))
    expect(report).toContain('Görev sayısı: 3')
    expect(report).toContain('| model-1 | 1/3 | %33 |')
    expect(report).toContain('| k1 (2) | 1/2 |')
    expect(report).toContain('| k2 (1) | 0/1 |')
    expect(report).toContain('güven aralığına bakın')
    expect(report).toMatch(/\| 20 \| 1 \| – \|/)
  })
})
