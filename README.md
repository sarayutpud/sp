# SP — FIBA Competition CMS + Courtside Live Stats

Monorepo สำหรับระบบจัดการแข่งขันบาสเก็ตบอลมาตรฐาน FIBA และแอป Courtside Offline-First (Windows / Tauri)

## สแต็ก

| ชั้น | เทคโนโลยี |
|------|-----------|
| Courtside | Tauri 2 + React + SQLite / IndexedDB |
| CMS | Vite + React (Vercel) |
| Sync / DB / Auth | Supabase (ตรงจาก client — ไม่มี Nest API แยก) |
| Shared | Zod types + rules-engine + report-export (Excel/PDF + ฟอนต์ไทย) |

## โครงสร้าง

```
apps/courtside   # Windows desktop — บันทึกสถิติข้างสนาม → sync Supabase
apps/cms         # Web CMS — ลีก/ทีม/ผู้เล่น/นำเข้า Excel/แมตช์/รายงาน
packages/*       # shared-types, rules-engine, sync-protocol, report-export, ui
supabase/        # schema.sql + seed.sql (+ migrations เฉพาะ local CLI)
docs/            # คู่มือผู้ใช้ (USER_MANUAL.md)
releases/windows # ปลายทาง build Courtside (exe / Setup / MSI)
```

## ความสามารถหลัก (ผู้ใช้)

- **CMS:** การแข่งขัน · ทีม · ผู้เล่น · **นำเข้า Excel** (เบอร์/ชื่อ/ทีม) · แมตช์สองทีม · รายงาน FIBA + ประเมินผู้เล่น · แชร์ลิงก์ · ดาวน์โหลด Courtside
- **Courtside:** บันทึกช็อต/ฟาล์ว/เปลี่ยนตัว ออฟไลน์ได้ · ซิงก์ · ส่งออก Excel/PDF (ไทย)
- **ล้างข้อมูล:** ลบแมตช์ทีละนัด · ลบทีม (cascade ผู้เล่น) · ล้างระบบทั้งก้อนที่หน้า Import (ยืนยัน 2 ขั้น)

## เริ่มต้น

```bash
# ต้องมี Node 22+ และ pnpm 9
npx pnpm@9.15.0 install
cp .env.example .env   # ใส่ secrets จริง — ห้าม commit .env

npx pnpm@9.15.0 --filter @sp/rules-engine test
npx pnpm@9.15.0 --filter @sp/cms dev
npx pnpm@9.15.0 --filter @sp/courtside dev
```

บัญชี seed ท้องถิ่น: `sp@test.com` / `sptest`

Courtside (Windows desktop) ต้องมี:

1. [Rust](https://rustup.rs/)
2. **Visual Studio Build Tools** — workload *Desktop development with C++* (ต้องมี `link.exe`)
3. WebView2

```bash
npx pnpm@9.15.0 --filter @sp/courtside tauri:dev
```

## Build Courtside (Windows)

```powershell
pnpm --filter @sp/courtside tauri:release
# หรือ: .\scripts\build-courtside-windows.ps1
```

ผลลัพธ์คัดลอกไปที่ `D:\sp\releases\windows` เสมอ — ดู [`releases/windows/README.md`](releases/windows/README.md)

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
- ใน CMS: หน้า **เริ่มต้น / คู่มือ** (`/`) — คู่มือเต็มในแอป
- Courtside: `/user-manual.html` และปุ่ม **คู่มือ** ในแอป
- สำหรับเอเจนต์ / โครงสร้าง repo: [`AGENTS.md`](AGENTS.md) · [`supabase/README.md`](supabase/README.md)

## หลักการ Offline-First

- SQLite / IndexedDB บนเครื่อง = source of truth ขณะแข่ง
- กด **ซิงก์** เพื่อส่ง outbox ขึ้น Supabase โดยตรง
- UI บันทึกช็อตด้วยการคลิกแผนที่สนาม — ไม่รอเน็ต
- Export Excel / PDF FIBA (ฟอนต์ Sarabun โหลดตอนส่ง PDF)

## ความปลอดภัย

- ใช้ publishable / anon key ฝั่ง client เท่านั้น
- ห้ามใส่ `service_role` ใน CMS / Courtside / Vercel frontend
- เปิด RLS ทุกตารางใน `public`
