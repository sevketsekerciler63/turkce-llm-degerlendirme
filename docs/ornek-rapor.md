# Türkçe LLM değerlendirme raporu

Oluşturulma: 2026-10-30T22:32:23.727Z · Görev sayısı: 31 · Karşılaştırılan yöntem: 3

## Genel

| Yöntem | Doğru | Doğruluk | %95 aralık | Ort. gecikme (ms) | Hata | Maliyet (USD) |
|---|---|---|---|---|---|---|
| baseline-ilk-sik | 1/31 | %3 | %1–%16 | 0 | 0 | – |
| baseline-bos | 0/31 | %0 | %0–%11 | 0 | 0 | – |
| baseline-yanki | 0/31 | %0 | %0–%11 | 0 | 0 | – |

## Kategori bazında doğruluk

| Kategori (görev sayısı) | baseline-ilk-sik | baseline-bos | baseline-yanki |
|---|---|---|---|
| dilbilgisi-anlam (8) | 1/8 | 0/8 | 0/8 |
| sayisal (8) | 0/8 | 0/8 | 0/8 |
| buyuk-kucuk-harf (6) | 0/6 | 0/6 | 0/6 |
| bilgi-cikarma (5) | 0/5 | 0/5 | 0/5 |
| tarih-bicim (4) | 0/4 | 0/4 | 0/4 |

> Görev sayısı küçüktür; yüzdeler birkaç görevlik farkla değişir. Yöntemleri sıralarken tek başına yüzdeye değil güven aralığına bakın: aralıklar örtüşüyorsa fark güvenilir değildir.
