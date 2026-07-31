# Supabase — โครงสร้างฐานข้อมูล

โปรเจกต์ hosted **รัน schema แล้ว** — อย่ารัน migration แบบ ALTER ซ้ำ

## ไฟล์อ้างอิง

| ไฟล์ | ใช้เมื่อ |
|------|----------|
| `schema.sql` | **แหล่งความจริง** — โครงสร้างตาราง + RLS ทั้งหมด |
| `seed.sql` | ใส่ข้อมูลตั้งต้น (ทีม, ผู้เล่น, แมตช์) |
| `migrations/` | **เฉพาะ local CLI** (`supabase start` / `db reset`) — baseline = สำเนา `schema.sql` + role grants |
| `../scripts/seed-default-data.mjs` | สร้าง user CMS + seed ครบ (`pnpm seed`) |
| `../scripts/purge-match-data.mjs` | ล้างเฉพาะแมตช์/สถิติ (เก็บทีม/ผู้เล่น) |
| `../scripts/add-game-staff.sql` | one-shot: เพิ่มคอลัมน์โค้ช/กรรมการบน `games` (รันครั้งเดียวบน hosted แล้วลบได้) |

## ติดตั้งโปรเจกต์ใหม่ (hosted)

1. รัน `schema.sql` ใน Supabase SQL Editor (โปรเจกต์ว่าง)
2. รัน `seed.sql` หรือ `pnpm seed` (ต้องมี `SUPABASE_SERVICE_ROLE_KEY`)
3. ถ้า CMS แก้ผู้เล่นไม่ได้ — รันส่วน **CMS policies** ท้าย `schema.sql` อีกครั้ง

## Local CLI

```bash
supabase start
# หรือรีเซ็ตใหม่:
supabase db reset
```

อย่าเพิ่มไฟล์ migration แบบ incremental ในโฟลเดอร์นี้เพื่อแก้ hosted — อัปเดต `schema.sql` แล้วคัดลอกไป `migrations/20260101000000_baseline_schema.sql` แทน
