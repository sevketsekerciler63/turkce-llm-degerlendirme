/** Türkçe'ye özgü küçük harfe çevirme: İ → i, I → ı (JS'in varsayılan dönüşümü I → i yapar). */
export function trLower(text: string): string {
  return text.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase()
}

/** Türkçe'ye özgü büyük harfe çevirme: i → İ, ı → I. */
export function trUpper(text: string): string {
  return text.replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase()
}

/**
 * Karşılaştırma için normalleştirir: Türkçe küçük harf, noktalama silinir,
 * boşluklar tek boşluğa iner. Büyük/küçük harf ve noktalama önemli değilse kullanılır.
 */
export function normalizeTr(text: string): string {
  return trLower(text)
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Yanıtın çevresindeki tırnak, boşluk ve sondaki noktayı kaldırır; harf ve noktalamaya dokunmaz. */
export function stripWrapping(text: string): string {
  let value = text.trim()
  const quotes: Array<[string, string]> = [
    ['"', '"'],
    ["'", "'"],
    ['“', '”'],
    ['‘', '’'],
    ['`', '`'],
  ]
  for (const [open, close] of quotes) {
    if (value.length >= 2 && value.startsWith(open) && value.endsWith(close)) {
      value = value.slice(open.length, value.length - close.length).trim()
      break
    }
  }
  return value.normalize('NFC')
}

/**
 * Türkçe biçimli sayıyı çözer: "1.250,5" → 1250.5, "20.000" → 20000, "2,25" → 2.25, "%25" → 25.
 * Nokta, yalnızca ardından tam 3 haneli gruplar geliyorsa binlik ayracı sayılır ("0.75" ve "3.5" ondalıktır).
 */
export function parseTrNumber(token: string): number | null {
  let value = token.trim().replace(/^%/, '').replace(/%$/, '')
  if (!/^-?\d[\d.,]*$/.test(value)) return null
  const negative = value.startsWith('-')
  if (negative) value = value.slice(1)

  if (value.includes(',')) {
    const [integerPart, decimalPart, ...rest] = value.split(',')
    if (rest.length > 0 || !/^\d+$/.test(decimalPart)) return null
    const cleaned = integerPart.replace(/\./g, '')
    if (!/^\d+$/.test(cleaned)) return null
    const parsed = Number(`${cleaned}.${decimalPart}`)
    return negative ? -parsed : parsed
  }

  if (value.includes('.')) {
    const groups = value.split('.')
    const thousands = groups[0] !== '0' && groups[0].length <= 3 && groups.slice(1).every((g) => /^\d{3}$/.test(g))
    const parsed = thousands ? Number(groups.join('')) : Number(value)
    if (Number.isNaN(parsed)) return null
    return negative ? -parsed : parsed
  }

  const parsed = Number(value)
  return negative ? -parsed : parsed
}

/** Metindeki tüm sayısal ifadeleri sırasıyla çıkarır. */
export function extractNumbers(text: string): number[] {
  const matches = text.match(/-?\d[\d.,]*\d|-?\d/g) ?? []
  const numbers: number[] = []
  for (const match of matches) {
    const parsed = parseTrNumber(match)
    if (parsed !== null) numbers.push(parsed)
  }
  return numbers
}
