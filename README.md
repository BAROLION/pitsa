# 🍕 Pitsa Dostavka — Telegram Mini App + Admin Panel

## ▶️ Ishga tushirish — bitta buyruq

Loyiha papkasida terminal oching (VS Code → Terminal → New Terminal) va yozing:

```powershell
npm.cmd start
```

> PowerShell `npm start` ni "running scripts is disabled" deb bloklasa, `npm.cmd start` deb yozing —
> bu aynan o'sha buyruq, faqat bu cheklovga tushmaydi.

Taxminan 30 soniyadan keyin terminalda **✅ HAMMASI TAYYOR!** yozuvi chiqadi. Shundan keyin:

- 📱 **Telegram:** **@pitsa_dostavka_bot** ni oching → **/start** → **🍕 Buyurtma berish**
- 🛠 **Admin Panel:** brauzerda http://localhost:5174 · parol: **admin123**
- ⛔ **To'xtatish:** terminalda `Ctrl + C`

`npm start` hamma ishni o'zi bajaradi: Backend, Bot, Mini App va Admin Panel'ni ishga tushiradi,
Cloudflare tunnel orqali HTTPS manzil oladi va uni botga o'zi ulaydi. Qo'lda hech narsa
sozlash shart emas.

> Tunnel manzili har ishga tushirishda yangilanadi. Bot buni o'zi biladi: chat pastidagi
> **🍕 Menyu** tugmasi har doim yangi manzilni ochadi. Eski xabarlardagi tugmalar ishlamasa,
> **/start** ni qaytadan bosing.
>
> Internet uzilib, tunnel o'chib qolsa, `npm start` buni 1–2 daqiqada sezadi, yangi tunnel ochadi
> va botni o'zi qayta ulaydi. Terminalda **"✅ Yangi tunnel ulandi"** yozuvi chiqadi.

---

## Qismlar

| Qism | Manzil | Vazifasi |
|---|---|---|
| Backend (API + Bot) | http://localhost:3000 | Baza, API, Telegram bot |
| Mini App (mijozlar) | http://localhost:5173 | Telegram ichida ochiladigan do'kon |
| Admin Panel | http://localhost:5174 | Buyurtmalar va mahsulotlarni boshqarish |

## Qanday ishlaydi

1. Mijoz botda **/start** bosadi va Mini App'ni ochadi.
2. Birinchi marta 3 ta onboarding slaydi chiqadi. Keyin Bosh sahifa, Katalog, Savatcha va Profil.
3. Savatchada **"Buyurtmani tasdiqlash"** bosiladi. Buyurtma bazaga yoziladi va Mini App yopiladi.
4. Bot mijozga yozadi: *"Buyurtmangiz muvaffaqiyatli qabul qilindi! Kuryerimiz tez orada bog'lanadi 🍕"*
5. Buyurtma Admin Panel'da 5 soniya ichida ovozli signal bilan paydo bo'ladi.
6. Admin holatni **Yetkazildi** ga o'zgartirsa, bot mijozga xabar beradi.

---

## Boshqa buyruqlar

| Buyruq | Nima qiladi |
|---|---|
| `npm start` | Hammasi + tunnel (Telegram uchun) — **asosiy buyruq** |
| `npm run dev` | Tunnelsiz, faqat kompyuterda sinash uchun (Mini App: http://localhost:5173) |
| `npm run setup` | Paketlarni o'rnatish (yangi kompyuterda bir marta) |
| `npx prisma migrate dev --name init` | Baza jadvallarini yaratish (bir marta) |
| `npm run db:seed` | Boshlang'ich menyuni bazaga yozish (baza bo'sh bo'lsa) |
| `npm run db:add-menu` | `src/database/seedData.js` dagi yangi taomlarni qo'shadi (borlariga tegmaydi) |
| `npm run db:studio` | Bazani brauzerda ko'rish va tahrirlash |

> Paketlar, jadvallar va mahsulotlar allaqachon o'rnatilgan. Bu buyruqlar faqat loyihani
> boshqa kompyuterga ko'chirganda kerak bo'ladi.

---

## Muammolar va yechimlar

| Muammo | Yechim |
|---|---|
| `409: Conflict` / "Bot allaqachon boshqa joyda ishlayapti" | Bot boshqa terminalda ham ishlab turibdi. Ortiqcha terminalni yoping. |
| `port band` | Eski server ochiq qolgan. Barcha terminallarni yopib, qaytadan `npm start` qiling. |
| "Tunnel 60 soniyada ochilmadi" | Internetni tekshiring va `npm start` ni qayta ishga tushiring. |
| Mini App'da "Avtorizatsiya muvaffaqiyatsiz" | Ilovani brauzerda emas, bot tugmasi orqali oching. |
| Eski tugma bosilganda sahifa ochilmaydi | Botda **/start** bosing yoki pastdagi **🍕 Menyu** tugmasidan foydalaning. |
| Bot buyurtmadan keyin xabar yubormadi | Mijoz botga avval **/start** bosgan bo'lishi kerak. Bu Telegram qoidasi. |

---

## 🚀 Render'ga joylash (doimiy manzil, kompyutersiz)

Render'da hammasi bitta serverda ishlaydi: Mini App `https://SIZNING-NOM.onrender.com`,
Admin Panel `https://SIZNING-NOM.onrender.com/admin`, bot esa webhook orqali. Tunnel kerak emas.

**New → Web Service → GitHub repo** va quyidagilarni to'ldiring:

| Maydon | Qiymat |
|---|---|
| Language | **Node** |
| Branch | `main` |
| Region | **Virginia (US East)** — Neon bazasiga eng yaqin |
| Root Directory | *(bo'sh)* |
| Build Command | `npm install --include=dev && npm run render-build` |
| Start Command | `npm run render-start` |
| Instance Type | Free |
| Health Check Path *(Advanced)* | `/api/health` |

**Environment Variables** (`Add from .env` bilan `.env` ni qo'ying, keyin `ADMIN_PASSWORD` ni almashtiring):

| Kalit | Qiymat |
|---|---|
| `DATABASE_URL`, `DIRECT_URL` | Neon manzillari (`.env` dagidek) |
| `BOT_TOKEN`, `BOT_USERNAME`, `ADMIN_TELEGRAM_ID` | `.env` dagidek |
| `ADMIN_PASSWORD` | **Yangi kuchli parol** (kamida 10 belgi). Kuchsiz bo'lsa, Admin Panel internetda yopiq turadi |

`MINI_APP_URL`, `API_PORT`, `ALLOW_DEV_AUTH` Render'da kerak emas (e'tiborga olinmaydi) — manzilni server o'zi biladi.

> ⚠️ Bot bir vaqtda faqat bitta joyda ishlaydi. Render ishga tushgach, kompyuterdagi `npm start` botga
> tegmaydi (faqat Mini App/Admin lokal ishlaydi). Botni yana kompyuterda sinash kerak bo'lsa —
> `.env` ga `FORCE_LOCAL_BOT=true` yozing (Render'dagi bot o'sha vaqtda to'xtaydi).
>
> 💤 Bepul server 15 daqiqa ishlatilmasa uxlaydi — keyingi birinchi ochilish ~1 daqiqa oladi.
> Doim uyg'oq tursin desangiz, UptimeRobot'da `https://SIZNING-NOM.onrender.com/api/health` ni
> har 10 daqiqada tekshiradigan bepul monitor qo'shing.

### Ixtiyoriy: Mini App sahifasi Vercel'da

`vercel.json` Mini App'ni Vercel'da build qiladi, `/api/*` so'rovlarini esa Render'ga uzatadi
(manzil `vercel.json` ichida). Vercel loyihasida **Root Directory bo'sh** va **Framework: Other** bo'lsin —
qolgan sozlamalar fayldan olinadi. Bot Vercel manzilini ochishi uchun Render → Environment'da
`MINI_APP_URL=https://LOYIHA.vercel.app` qo'shing. Admin Panel baribir Render'da (`/admin`).

---

## Ixtiyoriy: ngrok bilan doimiy manzil

Cloudflare tunneli akkauntsiz ishlaydi, lekin manzili har safar o'zgaradi. Doimiy manzil
kerak bo'lsa, ngrok'dan foydalanish mumkin (ngrok.com'da akkaunt ochish kerak):

1. Akkaunt oching, authtoken'ni ulang va **Domains** bo'limidan bepul domen oling.
2. ngrok'ni ulang:
   ```powershell
   ngrok config add-authtoken TOKENINGIZ
   ```
3. `.env` faylida shu qatorni to'ldiring: `MINI_APP_URL="https://DOMENINGIZ.ngrok-free.app"`
4. Ikkita terminal oching. Birinchisida:
   ```powershell
   npm run dev
   ```
   Ikkinchisida:
   ```powershell
   ngrok http --url=DOMENINGIZ.ngrok-free.app 5173
   ```

---

## Papka tuzilishi

```
telegram app/
├── src/
│   ├── config/default.js          # Sozlamalar (.env dan o'qiladi)
│   ├── core/bot.js                # Telegraf bot instansiyasi
│   ├── database/
│   │   ├── connection.js          # Prisma ulanishi
│   │   └── seedData.js            # Boshlang'ich mahsulotlar
│   ├── models/                    # User.js, Product.js, Order.js
│   ├── controllers/               # botController, cartController, adminController
│   ├── routes/                    # bot.routes, client.routes, admin.routes
│   ├── middlewares/auth.middleware.js  # Telegram imzosi va admin tekshiruvi
│   └── index.js                   # Asosiy ishga tushirish fayli
├── prisma/                        # schema.prisma, migrations/, seed.js
├── mini-app/                      # React — mijozlar uchun Telegram Mini App
├── admin-panel/                   # React — Admin Dashboard
├── scripts/dev.mjs                # npm start / npm run dev ishga tushirgichi
├── tools/cloudflared.exe          # Cloudflare tunnel (rasmiy, imzolangan)
├── .env                           # Maxfiy sozlamalar (hech kimga bermang!)
└── package.json
```

## Xavfsizlik

- `.env` faylida bot tokeni va baza paroli saqlanadi. Uni hech kimga yubormang va internetga joylamang.
- Admin parolini o'zgartirish uchun `.env` dagi `ADMIN_PASSWORD` ni almashtiring va serverni qayta ishga tushiring.
- **Admin Panel faqat sizning kompyuteringizdan ochiladi.** Tunnel orqali internetdan Admin API'ga kirib bo'lmaydi.
- Mini App API'si har bir so'rovda Telegram imzosini (`initData`) tekshiradi. Imzosiz so'rovlar faqat
  `localhost` dan (brauzerda sinash rejimida) o'tadi.
"# Yangi loyiha" 
"# Yangi loyiha" 
