import type { Provider, Task } from '../types.ts'

/**
 * Gerçek bir modele ihtiyaç duymayan temel (baseline) yöntemler. Raporun alt sınırını gösterir ve
 * görev setinin "sorunun kendisinden" tahmin edilemediğini doğrular.
 */

/** Her soruya "A" yanıtı verir. */
export const firstChoiceBaseline: Provider = {
  id: 'baseline-ilk-sik',
  complete: async () => ({ output: 'A' }),
}

/** Hiçbir şey yazmaz. */
export const emptyBaseline: Provider = {
  id: 'baseline-bos',
  complete: async () => ({ output: '' }),
}

/** Sorunun son satırını olduğu gibi geri yazar. */
export const echoBaseline: Provider = {
  id: 'baseline-yanki',
  complete: async (task: Task) => {
    const lines = task.prompt.trim().split('\n')
    return { output: lines[lines.length - 1] }
  },
}

export const baselines: Provider[] = [firstChoiceBaseline, emptyBaseline, echoBaseline]
