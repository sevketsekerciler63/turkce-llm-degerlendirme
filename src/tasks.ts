import { readFile } from 'node:fs/promises'
import type { ScorerKind, Task } from './types.ts'

const SCORERS: ScorerKind[] = ['choice', 'number', 'exact', 'strict']

/** Görevleri JSON Lines dosyasından okur ve her satırı doğrular; hata mesajı satır numarası içerir. */
export function parseTasks(text: string): Task[] {
  const tasks: Task[] = []
  const seen = new Set<string>()
  text.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return
    const where = `satır ${index + 1}`
    let raw: unknown
    try {
      raw = JSON.parse(line)
    } catch {
      throw new Error(`Geçersiz JSON (${where})`)
    }
    const task = raw as Partial<Task>
    if (typeof task.id !== 'string' || !task.id) throw new Error(`id eksik (${where})`)
    if (seen.has(task.id)) throw new Error(`Yinelenen id: ${task.id} (${where})`)
    seen.add(task.id)
    if (typeof task.category !== 'string' || !task.category) throw new Error(`category eksik: ${task.id}`)
    if (typeof task.prompt !== 'string' || !task.prompt.trim()) throw new Error(`prompt eksik: ${task.id}`)
    if (!task.scorer || !SCORERS.includes(task.scorer)) throw new Error(`Bilinmeyen scorer: ${task.id}`)
    if (task.expected === undefined || task.expected === '') throw new Error(`expected eksik: ${task.id}`)
    if (task.scorer === 'number' && !(Array.isArray(task.expected) ? task.expected : [task.expected]).every((v) => !Number.isNaN(Number(v)))) {
      throw new Error(`number görevinde expected sayı olmalı: ${task.id}`)
    }
    tasks.push(task as Task)
  })
  if (tasks.length === 0) throw new Error('Görev dosyası boş')
  return tasks
}

export async function loadTasks(path: string): Promise<Task[]> {
  return parseTasks(await readFile(path, 'utf8'))
}
