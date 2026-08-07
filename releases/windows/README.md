# Windows builds — always publish artifacts here: `D:\sp\releases\windows`

Local artifacts (gitignored binaries; this README is tracked):

- `SP-Courtside.exe` — portable
- `SP-Courtside-Setup-0.1.4.exe` — NSIS installer (แนะนำผู้ใช้ทั่วไป)
- `SP-Courtside-0.1.4.msi` — MSI

Build (from repo root):

```powershell
pnpm --filter @sp/courtside tauri:release
```

Or:

```powershell
.\scripts\build-courtside-windows.ps1
```

Output is always copied to this folder.

Distribute via the CMS **ดาวน์โหลดแอป** button / Google Drive folder (see `apps/cms/src/lib/constants.ts` and `docs/USER_MANUAL.md`). Upload all three file types into that folder when releasing.
