import { useQuery } from "@tanstack/react-query";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export function App() {
  const health = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const res = await fetch(`${API}/health`);
      if (!res.ok) throw new Error("API offline");
      return res.json() as Promise<{ ok: boolean; service: string }>;
    },
    refetchInterval: 10_000,
  });

  return (
    <div className="page">
      <header className="hero">
        <p className="brand">SP</p>
        <h1>ระบบจัดการแข่งขันบาสเก็ตบอล</h1>
        <p className="lead">
          CMS สำหรับรายการแข่ง ทีม ตาราง และรายงานสถิติมาตรฐาน FIBA
        </p>
      </header>

      <section className="panel">
        <h2>สถานะระบบ</h2>
        {health.isLoading && <p>กำลังเชื่อมต่อ API…</p>}
        {health.isError && (
          <p className="err">ยังเชื่อม API ไม่ได้ — รัน `@sp/api` ที่พอร์ต 3001</p>
        )}
        {health.data && (
          <p className="ok">API พร้อม · {health.data.service}</p>
        )}
      </section>

      <section className="panel">
        <h2>เมนู (Phase 1)</h2>
        <ul>
          <li>รายการแข่งขัน + Ruleset FIBA</li>
          <li>ทีม / ผู้เล่น / Roster</li>
          <li>ตารางแข่ง / เริ่มเกม</li>
          <li>Box Score + Export Excel</li>
        </ul>
      </section>
    </div>
  );
}
