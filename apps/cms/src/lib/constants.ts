/** Public Drive folder with Courtside Windows builds (Setup + MSI + portable exe). */
export const COURTSIDE_DOWNLOAD_URL =
  "https://drive.google.com/drive/folders/15_9P9_FCxJmUuS3ZOu0n2knrLNRodTiJ?usp=drive_link";

export const COURTSIDE_DOWNLOAD_FILES = [
  {
    name: "SP-Courtside-Setup-*.exe",
    note: "ตัวติดตั้ง NSIS — แนะนำผู้ใช้ทั่วไป",
  },
  {
    name: "SP-Courtside-*.msi",
    note: "ตัวติดตั้ง MSI",
  },
  {
    name: "SP-Courtside.exe",
    note: "รันแบบพกพา ไม่ต้องติดตั้ง",
  },
] as const;
