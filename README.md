# Karaoke

Tarayıcıda çalışan sade bir şarkı tanıma ve senkronize söz uygulaması.

## Akış

1. Kullanıcı **Müziği Dinle** düğmesine basar ve mikrofon izni verir.
2. Tarayıcı yaklaşık 10 saniye ortam sesini kaydeder; Shazam uyumlu ses parmak izini cihazda üretir. Ham ses kaydı tanıma servisine gönderilmez.
3. Parmak izi Cloudflare Worker proxy'sine gider; proxy Shazam'ın şu anda belgelenmemiş discovery uç noktasına sorar.
4. Şarkı bulunduğunda Better Lyrics üzerinden kelime zamanlı TTML aranır; bulunamazsa LRCLIB üzerinden senkronize LRC veya düz söz aranır.
5. Zaman damgalı satırlar müzik ilerledikçe vurgulanıp kaydırılır. Sağlayıcı kelime zamanlaması verdiyse kelime seviyesinde görüntülenir.

## Yayına alma

### 1. Cloudflare Worker'ı kur (zorunlu)

GitHub Pages statik barındırmadır; Shazam ve söz servisleri için gereken proxy'yi çalıştıramaz. Cloudflare panelinde yeni bir Worker oluştur, `worker/index.js` içeriğini editöre yapıştır ve Deploy et. Worker adresini kopyala.

### 2. Worker adresini bağla

`app.js` dosyasının başındaki `WORKER_URL` değerini kendi Worker adresinle değiştir:

```js
const WORKER_URL = 'https://senin-worker-adresin.workers.dev';
```

### 3. GitHub Pages'i aç

Repository → Settings → Pages → Deploy from a branch → `main` → `/ (root)`. Oluşan HTTPS adresini telefon veya bilgisayarda aç. APK veya kurulum gerekmez.

## Bilinen sınırlar

- Mikrofon erişimi için HTTPS (veya localhost) ve kullanıcı izni gerekir.
- Uygulama mikrofonun duyduğu hoparlör sesini algılar; cihazın dahili/sistem sesini doğrudan yakalamaz. Aynı telefonda müziği hoparlörden çal.
- Dinleme ve söz takibi sırasında sayfanın ön planda kalması gerekir; mobil tarayıcılar arka planda mikrofonu durdurabilir.
- Shazam uç noktası resmî olmayan/belgelenmemiş bir arayüzdür; değişebilir veya istekleri sınırlandırabilir.
- Senkronize söz bulunamazsa düz sözler zamanlamasız gösterilir.
- Parmak izi kodu, sağlanan Prism ZIP'indeki GPL-3.0 lisanslı ShazamSignature yaklaşımının JavaScript uyarlamasıdır. Atıf için THIRD_PARTY_NOTICES.md dosyasına bak.

Bağımlılık kurulumu veya derleme adımı yoktur. Web dosyaları HTTPS üzerinden sunulmalıdır. Worker ayrıca deploy edilir.