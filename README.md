# SP — FIBA Competition CMS + Courtside Live Stats

Monorepo สำหรับระบบจัดการแข่งขันบาสเก็ตบอลมาตรฐาน FIBA และแอป Courtside Offline-First (Windows / Tauri)

## สแต็ก

| ชั้น | เทคโนโลยี |
|------|-----------|
| Courtside | Tauri 2 + React + SQLite |
| CMS | Vite + React |
| API | NestJS + Drizzle |
| Cloud DB | Supabase PostgreSQL |
| Shared | Zod types + rules-engine |

## โครงสร้าง

```
apps/courtside   # Windows desktop — บันทึกสถิติข้างสนาม
apps/cms         # Web CMS
apps/api         # Sync API
packages/*       # shared-types, rules-engine, sync-protocol, ui
supabase/        # migrations + RLS
```

## เริ่มต้น

```bash
# ต้องมี Node 22+ และ pnpm 9
npx pnpm@9.15.0 install
cp .env.example .env   # ใส่ secrets จริง — ห้าม commit .env

npx pnpm@9.15.0 --filter @sp/rules-engine test
npx pnpm@9.15.0 --filter @sp/api dev
npx pnpm@9.15.0 --filter @sp/cms dev
```

Courtside (Windows desktop) ต้องมี:

1. [Rust](https://rustup.rs/)
2. **Visual Studio Build Tools** — workload *Desktop development with C++* (ต้องมี `link.exe`)
3. WebView2

```bash
npx pnpm@9.15.0 --filter @sp/courtside tauri:dev
# หรือดู UI บนเว็บก่อน: npx pnpm@9.15.0 --filter @sp/courtside dev
```

API จะซิงก์ขึ้น Supabase อัตโนมัติถ้ามี `SUPABASE_URL` + anon/publishable ใน `.env`  
ใส่ `DATABASE_URL` ถ้าต้องการใช้ Drizzle ต่อ Postgres โดยตรง

## Deploy CMS (Vercel)

Repo นี้เป็น monorepo — บน Vercel ให้ใช้ root เป็น repo ทั้งก้อน (อย่าตั้ง Root Directory เป็น `apps/cms` อย่างเดียว ถ้ายังไม่มี `vercel.json`)

ค่าที่ถูกต้อง (มีใน [`vercel.json`](vercel.json) แล้ว):

- **Install:** `pnpm install`
- **Build:** `pnpm --filter @sp/cms build`
- **Output Directory:** `apps/cms/dist`

Environment (Production):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` หรือ `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_API_URL` (URL ของ Nest API ถ้ามี)

## คู่มือผู้ใช้

- Markdown: [`docs/USER_MANUAL.md`](docs/USER_MANUAL.md)
- หน้าเว็บในแอป: `/user-manual.html` (CMS และ Courtside)

## หลักการ Offline-First

- SQLite บนเครื่อง = source of truth ขณะแข่ง
- Network เป็นชั้น sync แบบ async (outbox delta)
- UI บันทึกช็อตด้วยการคลิกแผนที่สนาม — ไม่รอเน็ต
- Export Excel `.xlsx` (Box Score / PBP / Shots)

## ความปลอดภัย

- ใช้ publishable key ฝั่ง client เท่านั้น
- `service_role` / `DATABASE_URL` อยู่ฝั่ง API เท่านั้น
- เปิด RLS ทุกตารางใน `public`
