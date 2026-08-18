# İSG-Ç Eğitim Takip Sistemi

Personel, eğitim kataloğu ve eğitim kayıtlarını takip eden, adam-saat
raporlaması ve dış kullanıcılar için "Eğitim Pasaportu" sorgu paneli
içeren Next.js uygulaması.

## Geliştirme ortamını çalıştırma

```bash
npm install
cp .env.example .env   # değerleri doldurun
npm run db:migrate
npm run db:seed        # ilk admin kullanıcıyı oluşturur (SEED_ADMIN_EMAIL)
npm run dev
```

`npm run dev` webpack ile çalışır (`next dev --webpack`) — bu ortamda
Turbopack'in font çözümleyicisi bozuk olduğu için Turbopack
kullanılmıyor. Build/typecheck/lint komutları için `package.json`daki
script'lere bakın.

Geliştirme ortamında e-posta ile giriş akışı askıya alınmıştır:
`src/lib/session.ts`'teki `LOGIN_DISABLED_TEMPORARILY` bayrağı sayesinde
her istek otomatik olarak ilk admin kullanıcı olarak oturum açmış
sayılır. Bu bayrak `NODE_ENV=production` olduğunda her koşulda devre
dışıdır — canlıda her zaman gerçek e-posta OTP girişi çalışır.

## Testler

```bash
npm run test
```

Kritik iş mantığı (eğitim durum/geçerlilik hesaplaması, adam-saat
hesaplamaları, silme yetkisi kontrolleri) için Vitest ile yazılmış
birim testleri `src/lib/**/*.test.ts` altında bulunur.

## Canlıya almadan önce

`.env.example` dosyasındaki tüm değişkenler doldurulmalı; özellikle:

- `RESEND_API_KEY` / `RESEND_FROM_EMAIL` — doldurulmazsa giriş kodları
  hiçbir yere gönderilmez (sadece sunucu logunda görünür).
- `BETTER_AUTH_SECRET` — rastgele, uzun ve gizli olmalı.
- `BETTER_AUTH_URL` — uygulamanın gerçek canlı adresi olmalı.

Sunucu ayakta olduğu sürece arka planda otomatik olarak:

- Veritabanının WAL-güvenli günlük yedeği alınır (`backups/`, son 14
  yedek tutulur — bkz. `src/lib/backup.ts`),
- Süresi dolmuş/30 gün içinde dolacak eğitimler için tam yetkili
  adminlere haftalık özet e-postası gönderilir (bkz.
  `src/lib/notifications.ts`).

Bu iki görev `src/db/index.ts` üzerinden, veritabanı modülü ilk
import edildiğinde bir kez kurulan saatlik bir zamanlayıcıyla
tetiklenir.
