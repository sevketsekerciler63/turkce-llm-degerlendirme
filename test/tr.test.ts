import { describe, expect, it } from 'vitest'
import { extractNumbers, normalizeTr, parseTrNumber, stripWrapping, trLower, trUpper } from '../src/tr.ts'

describe('trLower / trUpper', () => {
  it('İ ve I harflerini Türkçe kurallarıyla küçültür', () => {
    expect(trLower('DİYARBAKIR')).toBe('diyarbakır')
    expect(trLower('IŞIK')).toBe('ışık')
    expect(trLower('İZMİR')).toBe('izmir')
  })

  it('i ve ı harflerini Türkçe kurallarıyla büyütür', () => {
    expect(trUpper('istanbul')).toBe('İSTANBUL')
    expect(trUpper('ısparta')).toBe('ISPARTA')
    expect(trUpper('şişli')).toBe('ŞİŞLİ')
  })

  it('JavaScript varsayılanının Türkçede neden yetersiz olduğunu gösterir', () => {
    expect('DİYARBAKIR'.toLowerCase()).not.toBe('diyarbakır')
    expect('istanbul'.toUpperCase()).not.toBe('İSTANBUL')
  })
})

describe('normalizeTr', () => {
  it('harf büyüklüğünü, noktalamayı ve fazla boşluğu yok sayar', () => {
    expect(normalizeTr('  Zeynep  Hanım. ')).toBe('zeynep hanım')
    expect(normalizeTr('ANKARA!')).toBe('ankara')
  })
})

describe('stripWrapping', () => {
  it('çevre tırnağı ve boşluğu atar, harfe dokunmaz', () => {
    expect(stripWrapping('  "İZMİR"  ')).toBe('İZMİR')
    expect(stripWrapping('“ışık”')).toBe('ışık')
  })
})

describe('parseTrNumber', () => {
  it.each([
    ['20.000', 20000],
    ['1.250,5', 1250.5],
    ['2,25', 2.25],
    ['0,75', 0.75],
    ['0.75', 0.75],
    ['3.5', 3.5],
    ['1.250', 1250],
    ['%25', 25],
    ['-4,5', -4.5],
    ['450', 450],
  ])('"%s" → %d', (token, expected) => {
    expect(parseTrNumber(token)).toBe(expected)
  })

  it('sayı olmayanı ve bozuk biçimi reddeder', () => {
    expect(parseTrNumber('abc')).toBeNull()
    expect(parseTrNumber('1,2,3')).toBeNull()
    expect(parseTrNumber('14.11.2026')).toBeNull()
  })
})

describe('extractNumbers', () => {
  it('cümle içindeki sayıları sırasıyla çıkarır ve sondaki noktayı almaz', () => {
    expect(extractNumbers('Yeni maaş 23.000 TL olur.')).toEqual([23000])
    expect(extractNumbers('85 × 0,8 = 68.')).toEqual([85, 0.8, 68])
  })
})
