# SP — FIBA Competition CMS + Courtside Live Stats

Monorepo สำหรับระบบจัดการแข่งขันบาสเก็ตบอลมาตรฐาน FIBA และแอป Courtside Offline-First (Windows / Tauri)

## สแต็ก

| ชั้น | เทคโนโลยี |
|------|-----------|
| Courtside | Tauri 2 + React + SQLite / IndexedDB |
| CMS | Vite + React (Vercel) |
| Sync / DB / Auth | Supabase (ตรงจาก client — ไม่มี Nest API แยก) |
| Shared | Zod types + rules-engine |

## โครงสร้าง

```
apps/courtside   # Windows desktop — บันทึกสถิติข้างสนาม → sync Supabase
apps/cms         # Web CMS → Supabase Auth + ข้อมูล
packages/*       # shared-types, rules-engine, sync-protocol, ui
supabase/        # schema.sql + seed.sql + RLS
```

## เริ่มต้น

```bash
# ต้องมี Node 22+ และ pnpm 9
npx pnpm@9.15.0 install
cp .env.example .env   # ใส่ secrets จริง — ห้าม commit .env

npx pnpm@9.15.0 --filter @sp/rules-engine test
npx pnpm@9.15.0 --filter @sp/cms dev
npx pnpm@9.15.0 --filter @sp/courtside dev
```

Courtside (Windows desktop) ต้องมี:

1. [Rust](https://rustup.rs/)
2. **Visual Studio Build Tools** — workload *Desktop development with C++* (ต้องมี `link.exe`)
3. WebView2

```bash
npx pnpm@9.15.0 --filter @sp/courtside tauri:dev
```

## Deploy CMS (Vercel)

- **Install:** `pnpm install`
- **Build:** `pnpm --filter @sp/cms build`
- **Output Directory:** `apps/cms/dist`

Environment (Production) บน Vercel:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` หรือ `VITE_SUPABASE_PUBLISHABLE_KEY`

ไม่ต้องมี `VITE_API_URL` — client sync ตรงกับ Supabase

## คู่มือผู้ใช้

- Markdown: [`docs/USER_MANUAL.md`](docs/USER_MANUAL.md)
- หน้าเว็บในแอป: `/user-manual.html` (CMS และ Courtside)

## หลักการ Offline-First

- SQLite / IndexedDB บนเครื่อง = source of truth ขณะแข่ง
- กด **ซิงก์** เพื่อส่ง outbox ขึ้น Supabase โดยตรง
- UI บันทึกช็อตด้วยการคลิกแผนที่สนาม — ไม่รอเน็ต
- Export Excel `.xlsx` (Box Score / PBP / Shots)

## ความปลอดภัย

- ใช้ publishable / anon key ฝั่ง client เท่านั้น
- ห้ามใส่ `service_role` ใน CMS / Courtside / Vercel frontend
- เปิด RLS ทุกตารางใน `public`
