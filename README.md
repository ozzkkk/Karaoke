# Karaoke

Telefon ve bilgisayar tarayıcısında çalışan, mikrofondan duyduğu şarkıyı tanıyıp sözlerini senkronize gösteren web uygulaması.

## Nasıl çalışır?

1. **Müziği Dinle** düğmesine basılır ve mikrofon izni verilir.
2. Tarayıcı yaklaşık 10 saniyelik sesi WAV dosyasına dönüştürür.
3. Ses kaydı Cloudflare Worker'a gönderilir; Worker, gizli API anahtarını kullanarak AudD'ye iletir.
4. Şarkı adı ve sanatçı bulunduktan sonra Better Lyrics üzerinden kelime zamanlı TTML aranır; bulunamazsa LRCLIB üzerinden senkronize LRC veya düz söz aranır.
5. Zaman damgalı satırlar müzik ilerledikçe vurgulanıp kaydırılır.

## Yayına alma

### 1. AudD API anahtarı al

AudD hesabından API token oluştur: https://dashboard.audd.io/

**API anahtarını GitHub'a, `app.js` dosyasına veya herkese açık bir yere yazma.** Anahtar yalnızca Cloudflare Worker'ın gizli değişkeni olarak saklanmalıdır. Anahtar daha önce sohbet, ekran görüntüsü veya herkese açık bir yerde paylaşıldıysa AudD panelinden iptal edip yenisini üret.

### 2. Cloudflare Worker oluştur

1. https://dash.cloudflare.com/ adresinde **Workers & Pages → Create → Create Worker** bölümüne git.
2. Worker adını `karaoke-api` yap ve oluştur.
3. **Edit Code** bölümünü aç.
4. Bu depodaki `worker/index.js` dosyasının tamamını editöre yapıştır ve **Deploy** et.

### 3. AudD anahtarını Worker'a gizli olarak ekle

Cloudflare'da Worker → **Settings → Variables and Secrets** bölümüne git.

- **Add** → **Secret** seç.
- Variable name: `AUDD_API_TOKEN`
- Value: AudD panelinden aldığın API anahtarı.
- Kaydet ve gerekiyorsa Worker'ı yeniden Deploy et.

Bu secret, istemci tarafındaki JavaScript'e gönderilmez ve GitHub deposunda bulunmaz.

### 4. Worker adresini uygulamaya bağla

Worker'ın verdiği adresi kopyala. GitHub'daki `app.js` dosyasının ilk satırındaki:

```js
const WORKER_URL = 'https://YOUR-WORKER-NAME.YOUR-SUBDOMAIN.workers.dev';
```

değerini kendi adresinle değiştir ve commit et.

Worker CORS ayarı şu an GitHub Pages alan adı `https://ozzkkk.github.io` için yapılandırılmıştır.

### 5. GitHub Pages'i aç

Repository → **Settings → Pages → Deploy from a branch → main → / (root)**. Oluşan HTTPS adresini telefon veya bilgisayarda aç. APK veya kurulum gerekmez.

## Bilinen sınırlar

- Mikrofon erişimi için HTTPS (veya localhost) ve kullanıcı izni gerekir.
- Uygulama mikrofonun duyduğu hoparlör sesini algılar; cihazın dahili/sistem sesini doğrudan yakalamaz. Aynı telefonda müziği hoparlörden çal.
- Dinleme ve söz takibi sırasında sayfanın ön planda kalması gerekir; mobil tarayıcılar arka planda mikrofonu durdurabilir.
- AudD standart tanıma isteği en fazla yaklaşık 12 saniyelik bir klibi analiz eder; bu uygulama 10 saniye kaydeder. API kullanım kotası ve ücretleri AudD hesabına bağlıdır.
- Senkronize söz bulunamazsa düz sözler zamanlamasız gösterilir.
- Cloudflare Worker, bu depodaki örnek CORS izin listesiyle yalnızca `https://ozzkkk.github.io` ve yerel geliştirme adreslerini kabul eder.

Kurulum/derleme bağımlılığı yoktur. Web dosyaları HTTPS üzerinden sunulmalıdır. Worker ayrıca deploy edilir.
