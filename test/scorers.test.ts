import { describe, expect, it } from 'vitest'
import { extractChoice, score } from '../src/scorers.ts'
import type { Task } from '../src/types.ts'

const task = (partial: Partial<Task> & Pick<Task, 'scorer' | 'expected'>): Task => ({
  id: 't',
  category: 'c',
  prompt: 'p',
  ...partial,
})

describe('extractChoice', () => {
  it.each([
    ['C', 'C'],
    ['c)', 'C'],
    ['(B)', 'B'],
    ['Cevap: D', 'D'],
    ['Düşününce... Cevap: a', 'A'],
    ['A) çiçek', 'A'],
  ])('"%s" → %s', (output, letter) => {
    expect(extractChoice(output)).toBe(letter)
  })

  it('belirsiz veya harfsiz yanıtta null döner', () => {
    expect(extractChoice('Cevap: A veya Cevap: B')).toBeNull()
    expect(extractChoice('Bilmiyorum')).toBeNull()
    expect(extractChoice('')).toBeNull()
  })
})

describe('score: choice', () => {
  const t = task({ scorer: 'choice', expected: 'C' })
  it('doğru harfi kabul eder, yanlışı ve belirsizi reddeder', () => {
    expect(score(t, 'C')).toBe(true)
    expect(score(t, 'Cevap: c')).toBe(true)
    expect(score(t, 'B')).toBe(false)
    expect(score(t, 'Bence C ya da D')).toBe(false)
  })
})

describe('score: number', () => {
  const t = task({ scorer: 'number', expected: 23000 })
  it('Türkçe biçimli sayıyı kabul eder', () => {
    expect(score(t, '23.000')).toBe(true)
    expect(score(t, 'Yeni maaş 23.000 TL olur.')).toBe(true)
    expect(score(t, '23000')).toBe(true)
  })
  it('işlem gösterilmişse son sayıyı değerlendirir', () => {
    expect(score(t, '20.000 × 1,15 = 23.000')).toBe(true)
  })
  it('"Cevap:" işaretinden sonrasına bakar', () => {
    expect(score(t, '20.000 TL üzerinden %15 hesaplandı. Cevap: 23.000')).toBe(true)
  })
  it('yanlış sayıyı ve sayısız yanıtı reddeder', () => {
    expect(score(t, '2.300')).toBe(false)
    expect(score(t, 'yirmi üç bin')).toBe(false)
  })
  it('ondalık sayıyı virgül veya nokta ile kabul eder', () => {
    const d = task({ scorer: 'number', expected: 2.25 })
    expect(score(d, '2,25')).toBe(true)
    expect(score(d, '2.25')).toBe(true)
    expect(score(d, '2,26')).toBe(false)
  })
})

describe('score: exact', () => {
  const t = task({ scorer: 'exact', expected: ['Zeynep', 'Zeynep Hanım'] })
  it('büyük/küçük harf ve noktalamayı yok sayar', () => {
    expect(score(t, 'zeynep')).toBe(true)
    expect(score(t, 'Zeynep Hanım.')).toBe(true)
    expect(score(t, '"ZEYNEP"')).toBe(true)
  })
  it('Türkçe harf farkını korur', () => {
    expect(score(task({ scorer: 'exact', expected: 'ışık' }), 'isik')).toBe(false)
  })
  it('saat biçimlerini eşdeğer sayar', () => {
    const time = task({ scorer: 'exact', expected: ['10.30', '10:30'] })
    expect(score(time, '10:30')).toBe(true)
    expect(score(time, '10.30')).toBe(true)
    expect(score(time, '11.30')).toBe(false)
  })
})

describe('score: strict', () => {
  it('harf büyüklüğünü Türkçe kurallarıyla birebir ister', () => {
    const lower = task({ scorer: 'strict', expected: 'diyarbakır' })
    expect(score(lower, 'diyarbakır')).toBe(true)
    expect(score(lower, 'diyarbakir')).toBe(false)
    expect(score(lower, 'Diyarbakır')).toBe(false)
    const upper = task({ scorer: 'strict', expected: 'İSTANBUL' })
    expect(score(upper, 'ISTANBUL')).toBe(false)
    expect(score(upper, 'İSTANBUL')).toBe(true)
  })
  it('çevre tırnağı ve sondaki noktayı kabul eder', () => {
    const t = task({ scorer: 'strict', expected: '14.11.2026' })
    expect(score(t, '"14.11.2026"')).toBe(true)
    expect(score(t, '14.11.2026.')).toBe(true)
  })
  it('noktalama biçimini korur', () => {
    const t = task({ scorer: 'strict', expected: '14.11.2026' })
    expect(score(t, '14/11/2026')).toBe(false)
    expect(score(t, '14112026')).toBe(false)
  })
})
