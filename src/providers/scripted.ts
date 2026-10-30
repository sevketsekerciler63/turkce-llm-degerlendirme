import type { Provider } from '../types.ts'

/** Görev kimliğine göre önceden belirlenmiş yanıt veren sağlayıcı; testlerde ve boru hattı doğrulamasında kullanılır. */
export function scriptedProvider(id: string, answers: Record<string, string>, fallback = ''): Provider {
  return {
    id,
    complete: async (task) => ({ output: answers[task.id] ?? fallback, inputTokens: 100, outputTokens: 10 }),
  }
}
