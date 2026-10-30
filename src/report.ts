import type { Price, TaskResult } from './types.ts'

export interface ProviderRun {
  providerId: string
  results: TaskResult[]
  price?: Price
}

/** Wilson %95 güven aralığı; küçük örneklemde "yüzde 80" gibi sayıların ne kadar belirsiz olduğunu gösterir. */
export function wilsonInterval(correct: number, total: number, z = 1.96): { low: number; high: number } {
  if (total === 0) return { low: 0, high: 0 }
  const p = correct / total
  const denominator = 1 + (z * z) / total
  const center = (p + (z * z) / (2 * total)) / denominator
  const margin = (z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total))) / denominator
  return { low: Math.max(0, center - margin), high: Math.min(1, center + margin) }
}

export function costUsd(results: TaskResult[], price: Price | undefined): number | undefined {
  if (!price) return undefined
  const input = results.reduce((sum, r) => sum + (r.inputTokens ?? 0), 0)
  const output = results.reduce((sum, r) => sum + (r.outputTokens ?? 0), 0)
  return (input * price.input + output * price.output) / 1_000_000
}

const pct = (value: number) => `%${(value * 100).toFixed(0)}`

export function renderReport(runs: ProviderRun[], generatedAt: Date = new Date()): string {
  const taskCount = runs[0]?.results.length ?? 0
  const lines: string[] = ['# Türkçe LLM değerlendirme raporu', '']
  lines.push(`Oluşturulma: ${generatedAt.toISOString()} · Görev sayısı: ${taskCount} · Karşılaştırılan yöntem: ${runs.length}`, '')

  lines.push('## Genel', '')
  lines.push('| Yöntem | Doğru | Doğruluk | %95 aralık | Ort. gecikme (ms) | Hata | Maliyet (USD) |')
  lines.push('|---|---|---|---|---|---|---|')
  for (const run of runs) {
    const correct = run.results.filter((r) => r.correct).length
    const total = run.results.length
    const interval = wilsonInterval(correct, total)
    const latency = total === 0 ? 0 : Math.round(run.results.reduce((s, r) => s + r.latencyMs, 0) / total)
    const errors = run.results.filter((r) => r.error).length
    const cost = costUsd(run.results, run.price)
    lines.push(
      `| ${run.providerId} | ${correct}/${total} | ${pct(total ? correct / total : 0)} | ${pct(interval.low)}–${pct(interval.high)} | ${latency} | ${errors} | ${cost === undefined ? '–' : cost.toFixed(4)} |`,
    )
  }
  lines.push('')

  const categories = [...new Set(runs.flatMap((run) => run.results.map((r) => r.category)))]
  lines.push('## Kategori bazında doğruluk', '')
  lines.push(`| Kategori (görev sayısı) | ${runs.map((r) => r.providerId).join(' | ')} |`)
  lines.push(`|---|${runs.map(() => '---').join('|')}|`)
  for (const category of categories) {
    const cells = runs.map((run) => {
      const inCategory = run.results.filter((r) => r.category === category)
      const correct = inCategory.filter((r) => r.correct).length
      return `${correct}/${inCategory.length}`
    })
    const n = runs[0].results.filter((r) => r.category === category).length
    lines.push(`| ${category} (${n}) | ${cells.join(' | ')} |`)
  }
  lines.push('')

  lines.push(
    '> Görev sayısı küçüktür; yüzdeler birkaç görevlik farkla değişir. Yöntemleri sıralarken tek başına yüzdeye değil güven aralığına bakın: aralıklar örtüşüyorsa fark güvenilir değildir.',
    '',
  )
  return `${lines.join('\n').trimEnd()}\n`
}
