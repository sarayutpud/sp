# Supabase — โครงสร้างฐานข้อมูล

โปรเจกต์นี้ **รัน schema บน Supabase แล้ว** ไม่ใช้โฟลเดอร์ `migrations/` อีกต่อไป (ลบเพื่อไม่ให้สับสน)

## ไฟล์อ้างอิง

| ไฟล์ | ใช้เมื่อ |
|------|----------|
| `schema.sql` | ดูโครงสร้างตาราง + RLS ทั้งหมด (baseline) |
| `seed.sql` | ใส่ข้อมูลตั้งต้น (ทีม, ผู้เล่น, แมตช์) |
| `../scripts/seed-default-data.mjs` | สร้าง user CMS + seed ครบ (`pnpm seed`) |

## ติดตั้งโปรเจกต์ใหม่

1. รัน `schema.sql` ใน Supabase SQL Editor (โปรเจกต์ว่าง)
2. รัน `seed.sql` หรือ `pnpm seed` (ต้องมี `SUPABASE_SERVICE_ROLE_KEY`)
3. ถ้า CMS แก้ผู้เล่นไม่ได้ — รันส่วน **CMS policies** ท้าย `schema.sql` อีกครั้ง
