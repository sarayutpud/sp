# Windows builds — always publish artifacts here: `D:\sp\releases\windows`

Local artifacts (gitignored):

- `SP-Courtside.exe` — portable
- `SP-Courtside-Setup-0.1.4.exe` — NSIS installer
- `SP-Courtside-0.1.4.msi` — MSI (when produced)

Build (from repo root):

```powershell
pnpm --filter @sp/courtside tauri:release
```

Or:

```powershell
.\scripts\build-courtside-windows.ps1
```

Output is always copied to this folder.
