import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { anthropicProvider } from './providers/anthropic.ts'
import { baselines } from './providers/baselines.ts'
import { renderReport, type ProviderRun } from './report.ts'
import { runProvider } from './runner.ts'
import { loadTasks } from './tasks.ts'
import type { Price, Provider } from './types.ts'

interface ModelConfig {
  model: string
  fiyat: { girdi: number; cikti: number }
}

const USAGE = `Kullanım: npm run eval -- [--modeller a,b] [--gorevler yol] [--cikti klasor] [--gercek]

  --modeller   Virgülle ayrılmış yöntem kimlikleri. Varsayılan: tüm temel (baseline) yöntemler.
               Temel: ${baselines.map((b) => b.id).join(', ')}
               Gerçek model: config/modeller.json içindeki kimlikler (ücretli API çağrısı yapar).
  --gercek     Gerçek model çağrılarını onaylar. Bu bayrak yoksa ücretli çağrı yapılmaz.
  --gorevler   Görev dosyası (varsayılan: data/gorevler.jsonl).
  --cikti      Sonuç klasörü (varsayılan: sonuclar).`

async function main() {
  const { values } = parseArgs({
    options: {
      modeller: { type: 'string' },
      gorevler: { type: 'string', default: 'data/gorevler.jsonl' },
      cikti: { type: 'string', default: 'sonuclar' },
      gercek: { type: 'boolean', default: false },
      yardim: { type: 'boolean', default: false },
    },
  })
  if (values.yardim) {
    console.log(USAGE)
    return
  }

  const models: Record<string, ModelConfig> = JSON.parse(await readFile('config/modeller.json', 'utf8'))
  const ids = (values.modeller ?? baselines.map((b) => b.id).join(',')).split(',').map((id) => id.trim()).filter(Boolean)

  const providers: Array<{ provider: Provider; price?: Price }> = []
  const unknown: string[] = []
  const paid: string[] = []
  for (const id of ids) {
    const baseline = baselines.find((b) => b.id === id)
    if (baseline) {
      providers.push({ provider: baseline })
    } else if (models[id]) {
      paid.push(id)
    } else {
      unknown.push(id)
    }
  }
  if (unknown.length > 0) {
    console.error(`Bilinmeyen yöntem: ${unknown.join(', ')}\n\n${USAGE}`)
    process.exitCode = 2
    return
  }
  if (paid.length > 0) {
    if (!values.gercek) {
      console.error(`${paid.join(', ')} ücretli API çağrısı yapar. Onaylamak için --gercek ekleyin.`)
      process.exitCode = 2
      return
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY ortam değişkeni ayarlı değil.')
      process.exitCode = 2
      return
    }
    for (const id of paid) {
      const { model, fiyat } = models[id]
      providers.push({ provider: anthropicProvider(id, model), price: { input: fiyat.girdi, output: fiyat.cikti } })
    }
  }

  const tasks = await loadTasks(values.gorevler)
  const runs: ProviderRun[] = []
  for (const { provider, price } of providers) {
    process.stderr.write(`${provider.id}: ${tasks.length} görev çalışıyor…\n`)
    runs.push({ providerId: provider.id, results: await runProvider(provider, tasks), price })
  }

  const now = new Date()
  const report = renderReport(runs, now)
  const dir = path.join(values.cikti, now.toISOString().replace(/[:.]/g, '-'))
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, 'rapor.md'), report, 'utf8')
  await writeFile(path.join(dir, 'sonuclar.json'), `${JSON.stringify(runs, null, 2)}\n`, 'utf8')
  console.log(report)
  console.error(`Sonuçlar yazıldı: ${dir}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
