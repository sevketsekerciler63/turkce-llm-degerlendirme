import { describe, expect, it } from 'vitest'
import { baselines } from '../src/providers/baselines.ts'
import { runProvider } from '../src/runner.ts'
import { score } from '../src/scorers.ts'
import { scriptedProvider } from '../src/providers/scripted.ts'
import { loadTasks, parseTasks } from '../src/tasks.ts'

describe('parseTasks', () => {
  const valid = '{"id":"a","category":"c","scorer":"exact","expected":"x","prompt":"p"}'

  it('geçerli satırı okur', () => {
    expect(parseTasks(valid)).toHaveLength(1)
  })
  it('yinelenen id, bilinmeyen puanlayıcı ve eksik alanı reddeder', () => {
    expect(() => parseTasks(`${valid}\n${valid}`)).toThrow(/Yinelenen id/)
    expect(() => parseTasks(valid.replace('exact', 'sihir'))).toThrow(/Bilinmeyen scorer/)
    expect(() => parseTasks(valid.replace('"expected":"x",', ''))).toThrow(/expected eksik/)
    expect(() => parseTasks('{bozuk')).toThrow(/Geçersiz JSON/)
    expect(() => parseTasks('')).toThrow(/boş/)
  })
  it('number görevinde sayı olmayan beklentiyi reddeder', () => {
    expect(() => parseTasks(valid.replace('exact', 'number'))).toThrow(/sayı olmalı/)
  })
})

describe('gerçek görev seti (data/gorevler.jsonl)', async () => {
  const tasks = await loadTasks('data/gorevler.jsonl')

  it('beklenen sayıda ve kategoride görev içerir', () => {
    expect(tasks).toHaveLength(31)
    const categories = new Set(tasks.map((t) => t.category))
    expect([...categories].sort()).toEqual(
      ['bilgi-cikarma', 'buyuk-kucuk-harf', 'dilbilgisi-anlam', 'sayisal', 'tarih-bicim'].sort(),
    )
  })

  it('çoktan seçmeli görevlerin doğru şıkları tek bir harfe yığılmaz', () => {
    const answers = tasks.filter((t) => t.scorer === 'choice').map((t) => String(t.expected))
    expect(new Set(answers).size).toBeGreaterThanOrEqual(3)
  })

  it('her görevin beklenen yanıtı kendi puanlayıcısından geçer (oracle)', async () => {
    const answers: Record<string, string> = {}
    for (const t of tasks) answers[t.id] = String(Array.isArray(t.expected) ? t.expected[0] : t.expected)
    const results = await runProvider(scriptedProvider('oracle', answers), tasks)
    const failed = results.filter((r) => !r.correct).map((r) => r.taskId)
    expect(failed).toEqual([])
  })

  it('yanlış yanıt hiçbir görevi geçmez (puanlayıcılar cömert değil)', async () => {
    const results = await runProvider(scriptedProvider('yanlis', {}, 'zzz 99999'), tasks)
    expect(results.filter((r) => r.correct)).toEqual([])
  })

  it('temel yöntemler görev setini sorunun kendisinden tahmin edemez', async () => {
    for (const baseline of baselines) {
      const results = await runProvider(baseline, tasks)
      const accuracy = results.filter((r) => r.correct).length / tasks.length
      expect(accuracy, baseline.id).toBeLessThan(0.2)
    }
  })

  it('sorulardaki sabit gün adı gerçek takvimle uyumludur', () => {
    // 14 Kasım 2026 Cumartesi'dir; metindeki gün adı yanlışsa görev hatalı bilgi taşır.
    const day = new Date(Date.UTC(2026, 10, 14)).toLocaleDateString('tr-TR', { weekday: 'long', timeZone: 'UTC' })
    expect(day).toBe('Cumartesi')
    const meeting = tasks.find((t) => t.id === 'cikarim-01')
    expect(meeting?.prompt).toContain('14 Kasım 2026 Cumartesi')
  })

  it('score() aynı görevi ikinci kez değerlendirince aynı sonucu verir', () => {
    const t = tasks.find((x) => x.id === 'sayisal-05')!
    expect(score(t, '23.000')).toBe(score(t, '23.000'))
  })
})

// Matematik görevlerinin beklenen değerlerini görevden bağımsız olarak yeniden hesaplar.
describe('sayısal görevlerin beklenen değerleri', () => {
  it.each([
    ['sayisal-01', 85 * 0.8],
    ['sayisal-02', (270 / 3) * 5],
    ['sayisal-03', (12 * 15) / 20],
    ['sayisal-04', 28 - (28 * 3) / 7],
    ['sayisal-05', 20000 * 1.15],
    ['sayisal-06', 47.5 / 2.5],
    ['sayisal-07', 0.75 + 1.5],
    ['sayisal-08', (25 - 4) / 3],
  ])('%s', async (id, computed) => {
    const tasks = await loadTasks('data/gorevler.jsonl')
    const t = tasks.find((x) => x.id === id)!
    expect(Number(t.expected)).toBeCloseTo(computed, 6)
  })
})
