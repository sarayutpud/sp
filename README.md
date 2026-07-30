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

Courtside ต้องมี [Rust](https://rustup.rs/) + WebView2 (Windows) ก่อน:

```bash
npx pnpm@9.15.0 --filter @sp/courtside dev
```

## หลักการ Offline-First

- SQLite บนเครื่อง = source of truth ขณะแข่ง
- Network เป็นชั้น sync แบบ async (outbox delta)
- UI บันทึกช็อตด้วยการคลิกแผนที่สนาม — ไม่รอเน็ต
- Export Excel `.xlsx` (Box Score / PBP / Shots)

## ความปลอดภัย

- ใช้ publishable key ฝั่ง client เท่านั้น
- `service_role` / `DATABASE_URL` อยู่ฝั่ง API เท่านั้น
- เปิด RLS ทุกตารางใน `public`
