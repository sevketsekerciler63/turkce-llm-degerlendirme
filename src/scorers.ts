import { extractNumbers, normalizeTr, stripWrapping } from './tr.ts'
import type { Task } from './types.ts'

function asList(expected: Task['expected']): string[] {
  return (Array.isArray(expected) ? expected : [expected]).map(String)
}

/**
 * Çoktan seçmeli yanıttan tek bir harf (A–E) çıkarır. "Cevap: C", "C)", "(c)", "C" biçimlerini
 * kabul eder. Birden fazla farklı harf bulunursa belirsiz sayılır (null).
 */
export function extractChoice(output: string): string | null {
  const text = output.trim()
  const marked = [...text.matchAll(/cevap\s*[:\-–]?\s*\(?([A-Ea-e])\b/giu)].map((m) => m[1].toUpperCase())
  if (marked.length > 0) {
    const last = marked[marked.length - 1]
    return marked.every((letter) => letter === last) ? last : null
  }
  const leading = /^\(?([A-Ea-e])(?:[).:]|\s|$)/.exec(text)
  return leading ? leading[1].toUpperCase() : null
}

function scoreChoice(task: Task, output: string): boolean {
  const picked = extractChoice(output)
  if (!picked) return false
  return asList(task.expected).some((answer) => answer.toUpperCase() === picked)
}

/** "Cevap:" işaretinden sonrasını, yoksa tüm metni alır; oradaki SON sayıyı değerlendirir. */
function scoreNumber(task: Task, output: string): boolean {
  const marker = [...output.matchAll(/cevap\s*[:\-–]/giu)].pop()
  const scope = marker?.index !== undefined ? output.slice(marker.index + marker[0].length) : output
  const numbers = extractNumbers(scope)
  if (numbers.length === 0) return false
  const final = numbers[numbers.length - 1]
  const tolerance = task.tolerance ?? 0.0001
  return asList(task.expected).some((answer) => Math.abs(Number(answer) - final) <= tolerance)
}

/** Büyük/küçük harf ve noktalamayı yok sayar; Türkçe kurallarıyla normalleştirir. */
function scoreExact(task: Task, output: string): boolean {
  const got = normalizeTr(stripWrapping(output))
  return asList(task.expected).some((answer) => normalizeTr(answer) === got)
}

/** Harf büyüklüğü ve noktalama dahil birebir eşleşme ister (yalnızca çevre tırnak/boşluk/son nokta atılır). */
function scoreStrict(task: Task, output: string): boolean {
  let got = stripWrapping(output)
  if (got.endsWith('.') && !asList(task.expected).some((answer) => answer.endsWith('.'))) {
    got = got.slice(0, -1).trimEnd()
  }
  return asList(task.expected).some((answer) => answer.normalize('NFC') === got)
}

export function score(task: Task, output: string): boolean {
  switch (task.scorer) {
    case 'choice':
      return scoreChoice(task, output)
    case 'number':
      return scoreNumber(task, output)
    case 'exact':
      return scoreExact(task, output)
    case 'strict':
      return scoreStrict(task, output)
  }
}
