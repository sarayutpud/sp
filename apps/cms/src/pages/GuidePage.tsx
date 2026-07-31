import { Link } from "react-router-dom";

export function GuidePage() {
  return (
    <div className="page-block">
      <header className="page-head guide-hero">
        <h1>เริ่มต้นใช้งาน</h1>
        <p className="muted">
          บันทึกสถิติสองทีมในนัดเดียว — รายงานหลักคือใบสถิตินัด (IYBC Box Score)
        </p>
      </header>

      <section className="panel">
        <h2>ขั้นตอนการใช้งาน</h2>
        <ol className="empty-steps guide-steps">
          <li>
            <Link to="/players">เพิ่มผู้เล่น</Link> ของทีมเราและทีมคู่แข่งในระบบ
          </li>
          <li>
            <Link to="/games">สร้างแมตช์</Link> เลือกทีมเรา + ทีมคู่แข่ง + เหย้า/เยือน
            แล้วจัดรายชื่อ/ตัวจริง
          </li>
          <li>
            เปิด Courtside เลือกแมตช์ → สลับฝั่ง HOME/AWAY บันทึกสถิติ → ซิงก์
            → ส่งออกใบสถิติ Excel/PDF ได้บนคอม
          </li>
          <li>
            <Link to="/reports">เปิดรายงาน</Link> ดูใบสถิตินัดสองทีม และส่งออก
            Excel/PDF/PNG ตามแท็บ
          </li>
        </ol>
      </section>

      <section className="panel">
        <h2>คำถามที่พบบ่อย</h2>
        <dl className="guide-faq">
          <dt>คู่แข่งต้องเป็นทีมในระบบไหม?</dt>
          <dd className="muted">
            ใช่ — เลือกทีมคู่แข่งจากรายการทีม เพื่อให้บันทึกสถิติและใบสถิติครบสองฝั่ง
          </dd>
          <dt>รายงานหลักคืออะไร?</dt>
          <dd className="muted">
            ใบสถิตินัด (คอลัมน์ IYBC: 2PT/3PT/FT, REB O/D, AST, ST, BLK, TO, PF, PTS)
            พร้อมสกอร์รายควอเตอร์
          </dd>
          <dt>ตัวสำรองมาจากไหน?</dt>
          <dd className="muted">
            จากรายชื่อลงแข่งของแต่ละทีมในแมตช์ — เลือกตัวจริงได้ไม่เกิน 5 คนต่อทีม
          </dd>
        </dl>
      </section>
    </div>
  );
}
