import Anthropic from '@anthropic-ai/sdk'
import type { Provider } from '../types.ts'

const SYSTEM_PROMPT =
  'Soruları Türkçe düşün ve yanıtla. Yalnızca istenen biçimde, ek açıklama yapmadan kısa cevap ver.'

/**
 * Resmî Anthropic SDK ile gerçek model çağrısı yapar. API anahtarı ortamdan (ANTHROPIC_API_KEY) okunur.
 * Düşünme tokenleri de `max_tokens` içinde sayılır; bu yüzden kısa yanıtlar için bile pay geniş tutulur.
 */
export function anthropicProvider(id: string, model: string): Provider {
  const client = new Anthropic()
  return {
    id,
    async complete(task) {
      const response = await client.messages.create({
        model,
        max_tokens: 4000,
        output_config: { effort: 'low' },
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: task.prompt }],
      })
      const output = response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n')
      return {
        output: response.stop_reason === 'refusal' ? '' : output,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      }
    },
  }
}
