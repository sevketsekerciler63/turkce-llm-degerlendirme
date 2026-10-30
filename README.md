# Türkçe LLM Değerlendirme

[![CI](https://github.com/sevketsekerciler63/turkce-llm-degerlendirme/actions/workflows/ci.yml/badge.svg)](https://github.com/sevketsekerciler63/turkce-llm-degerlendirme/actions/workflows/ci.yml)

Dil modellerini (veya istem yöntemlerini) küçük bir **Türkçe görev seti** üzerinde karşılaştıran, tekrarlanabilir bir komut satırı aracı. Doğruluk, gecikme, token ve maliyeti tek raporda verir; küçük örneklemde yüzdelerin ne kadar güvenilir olduğunu **%95 güven aralığıyla** gösterir.

> **Durum — dürüst özet:** Araç, görev seti ve puanlayıcılar tamamlandı ve test edildi. **Gerçek bir dil modeliyle henüz çalıştırılmadı** (geliştirme ortamında API anahtarı yoktu). Aşağıdaki sonuç tablosu yalnızca modelsiz *temel (baseline)* yöntemleri içerir. Claude sağlayıcısı resmî SDK ile yazıldı ve derleniyor, ama canlı API ile denenmedi.

## Neden Türkçe'ye özgü?

Genel amaçlı değerlendirme araçları Türkçe'nin küçük ayrıntılarını yanlış puanlar:

- **İ/ı harfleri:** JavaScript'te `'DİYARBAKIR'.toLowerCase()` Türkçe kuralının verdiği `diyarbakır` yerine `di̇yarbakir` üretir (`İ` harfi `i` + birleşik nokta işaretine, `I` harfi ise `ı` yerine `i`'ye döner); `'istanbul'.toUpperCase()` de `İSTANBUL` yerine `ISTANBUL` verir. İkisi de testte doğrulanır. Aracın puanlayıcıları Türkçe kurallarını uygular (`src/tr.ts`) ve modelin bu hatayı yapıp yapmadığını ayrı bir kategoride ölçer.
- **Sayı biçimi:** `20.000` yirmi bindir, `2,25` iki tam yüzde yirmi beştir. `"23.000"` yanıtı 23000 olarak okunur, `"2.300"` yanlış sayılır.
- **Noktalama ve büyük/küçük harf:** Bazı görevlerde biçim önemlidir (`14.11.2026`), bazılarında önemli değildir (`Ankara` / `ankara.`). Bu yüzden dört ayrı puanlayıcı vardır.

## Hızlı başlangıç

Gereksinim: Node.js 24 veya üstü.

```bash
npm install
npm test            # birim testleri
npm run eval        # modelsiz temel yöntemleri çalıştırır, ücretsizdir
```

Çıktı `sonuclar/<zaman>/` altına `rapor.md` ve ham `sonuclar.json` olarak yazılır.

### Gerçek model çalıştırma (ücretlidir)

```bash
export ANTHROPIC_API_KEY=...        # anahtar yalnızca ortamdan okunur, depoya yazılmaz
npm run eval -- --modeller claude-opus-5-5,claude-sonnet-5-5,claude-haiku-5-5 --gercek
```

- `--gercek` olmadan ücretli çağrı **yapılmaz**; anahtar yoksa araç durur.
- 31 görev için istek sayısı = görev sayısı × model sayısı. Modeller ve fiyatlar `config/modeller.json` içindedir; fiyatlar zamanla değişir, çalıştırmadan önce güncel fiyatla karşılaştırın.
- Bu yol canlı API ile **denenmedi**.

## Görev seti

31 görev, 5 kategori (`data/gorevler.jsonl`, satır başına bir JSON):

| Kategori | Görev | Puanlayıcı | Ne ölçer |
|---|---|---|---|
| `dilbilgisi-anlam` | 8 | `choice` | Yazım, deyim, atasözü, eş/sesteş sözcük, özne, yapım eki, "ki" |
| `sayisal` | 8 | `number` | Yüzde, oran, orantı, kesir, Türkçe sayı biçimi |
| `buyuk-kucuk-harf` | 6 | `strict` | İ/ı dönüşümü (İSTANBUL, ışık, …) |
| `bilgi-cikarma` | 5 | `exact` / `number` | Kısa Türkçe metinden şehir, saat, ad, sayı |
| `tarih-bicim` | 4 | `strict` | `14.11.2026` ↔ `14 Kasım 2026` |

## Puanlayıcılar

| Ad | Davranış |
|---|---|
| `choice` | `C`, `c)`, `(B)`, `Cevap: D` biçimlerinden tek harf çıkarır; birbiriyle çelişen birden fazla harf varsa yanlış sayar. |
| `number` | `Cevap:` işaretinden sonrasındaki (yoksa tüm metindeki) **son** sayıyı Türkçe biçimiyle çözer; toleranslıdır. |
| `exact` | Türkçe küçük harf + noktalama silme + boşluk düzeltme sonrası eşitlik. |
| `strict` | Harf büyüklüğü ve noktalama dahil birebir; yalnızca çevre tırnak/boşluk ve sondaki nokta atılır. |

## Doğrulama

`npm test` → 62 test (Türkçe metin işlemleri, her puanlayıcı, çalıştırıcı, rapor, görev seti). Öne çıkanlar:

- **Oracle testi:** her görevin beklenen yanıtı kendi puanlayıcısından geçer; tamamen yanlış yanıt hiçbir görevi geçmez.
- **Temel yöntem testi:** "hep A de", "boş bırak", "soruyu geri yaz" yöntemlerinin hiçbiri görev setinde %20'yi geçemez.
- **Bağımsız hesap:** sayısal görevlerin beklenen değerleri testte görevden bağımsız yeniden hesaplanır; metindeki gün adı (`14 Kasım 2026 Cumartesi`) gerçek takvimle karşılaştırılır. Bu test geliştirme sırasında gerçek bir hatayı yakaladı (gün adını elle yanlış düzeltmiştim).
- `npm run lint`, `npm run typecheck` ve `npm audit` temiz; aynı adımlar GitHub Actions'ta çalışır.

## Sonuçlar (yalnızca temel yöntemler)

[Örnek rapor](docs/ornek-rapor.md):

| Yöntem | Doğru | %95 aralık |
|---|---|---|
| baseline-ilk-sik (hep "A") | 1/31 | %1–%16 |
| baseline-bos | 0/31 | %0–%11 |
| baseline-yanki | 0/31 | %0–%11 |

Bunlar bir modelin başarısı değildir; yalnızca görev setinin soru metninden tahmin edilemediğini gösteren alt sınırdır.

## Sınırlar

- **Küçük görev seti (31):** sonuçlar birkaç görevle değişir; güven aralıkları geniştir. Modelleri sıralamak için yeterli değildir, kaba ayrımlar ve hata türlerini görmek için uygundur.
- **Görevleri bir dil uzmanı doğrulamadı.** Yazım, deyim ve atasözü sorularının tek doğru yanıtlı olduğundan emin olmak için ek inceleme gerekir.
- `number` puanlayıcısı son sayıya bakar; yanıtta işlem gösterilip sonuçtan sonra başka sayı yazılırsa yanlış okunabilir (`Yalnızca sayıyı yaz` yönergesi bu yüzden istemde vardır).
- Tek istem şablonu ve tek deneme; sıcaklık/tekrar varyansı ölçülmez.
- Gerçek model sonucu yok (yukarıdaki not).

## Nasıl geliştirdim

Bu projeyi yapay zekâ kodlama asistanıyla birlikte yazdım. Neyin ölçüleceğine ben karar verdim (Türkçe'ye özgü puanlama, güven aralığı, ücretli çağrı için açık onay); kod, testler ve görev taslakları asistanla üretildi ve testlerle doğrulandı. Gerçek bir modelle çalıştırmadığım için sonuç tablosunda model yok.

## Lisans

[MIT](LICENSE).
