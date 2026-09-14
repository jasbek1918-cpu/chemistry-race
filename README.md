# CHEMISTRY RACE PRO v6 — PUBLIC INTERNET GAME

## Nima o‘zgardi
- LocalTunnel olib tashlandi — endi o‘yinning o‘zi tunnel ochmaydi.
- O‘yin public hosting (masalan Render) ga joylashtirilganda QR va havola to‘g‘ridan-to‘g‘ri public HTTPS manzilga olib boradi.
- O‘quvchi boshqa Wi‑Fi yoki mobil internetdan ham qo‘shila oladi.
- Teacher panelida QR, havolani nusxalash va Telegramga yuborish tugmalari bor.
- `/join?game=...` qulay qo‘shilish sahifasi.
- `/api/health` hosting uchun health-check.

## Lokal ishga tushirish
```cmd
npm install
npm start
```
Teacher: http://localhost:3000/teacher.html

Lokal rejimda boshqa telefonlardan internet orqali kirish uchun public hosting/tunnel kerak. v6 ichida LocalTunnel ishlatilmaydi.

## INTERNETDA ISHLATISH — Render
1. Loyiha papkasini GitHub repository sifatida yuklang.
2. Render’da **New + → Web Service** tanlang.
3. GitHub repositoryni ulang.
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Deploy qiling.
7. Render bergan `https://...onrender.com` manzilini ochib `/teacher.html` ga kiring.
8. **YANGI O‘YIN** → **INTERNET HAVOLA + QR** ni bosing.
9. QR-ni sinf ekraniga chiqaring yoki **TELEGRAMGA YUBORISH** tugmasidan foydalaning.

### Muhim
- `npm start` ishlayotgan server o‘chsa, o‘yin ham to‘xtaydi.
- O‘quvchilar internetga ega bo‘lishi kerak.
- QR/havola ishlashi uchun o‘yin public HTTPS manzilda ishlashi kerak.
- `data/database.json` savollarni saqlaydi. Hostingning fayl saqlash siyosatiga qarab doimiy saqlash uchun persistent disk yoki alohida database kerak bo‘lishi mumkin.

## Word savol import
1. 1 ta savol blokini quyidagicha yozing:

```text
1. H₂SO₄ ning molyar massasi qancha?
A) 96 g/mol
B) 98 g/mol
C) 100 g/mol
D) 102 g/mol
Javob: B
Mavzu: Molyar massa
```

Savollar orasini bo‘sh qator bilan ajrating.
