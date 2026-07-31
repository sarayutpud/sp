import { Link } from "react-router-dom";

export function GuidePage() {
  return (
    <div className="page-block">
      <header className="page-head guide-hero">
        <h1>เริ่มต้นใช้งาน</h1>
        <p className="muted">
          โค้ชใช้เครื่องมือนี้ช่วยปรับปรุงทีมเรา — ไม่ต้องจัดการทีมคู่แข่งในระบบ
        </p>
      </header>

      <section className="panel">
        <h2>ขั้นตอนการใช้งาน</h2>
        <ol className="empty-steps guide-steps">
          <li>
            <Link to="/players">เพิ่มผู้เล่นทีมเรา</Link> — ลงทะเบียนชื่อและเบอร์
          </li>
          <li>
            <Link to="/games">สร้างแมตช์</Link> (ทีมเรา + ชื่อคู่แข่ง + เหย้า/เยือน)
            และจัดรายชื่อ/ตัวจริง
          </li>
          <li>
            เปิด Courtside เลือกแมตช์ → บันทึกสถิติข้างสนาม → ซิงก์
          </li>
          <li>
            <Link to="/reports">เปิดรายงาน</Link> ดูคำแนะนำโค้ช ปรับปรุงทีม
          </li>
        </ol>
      </section>

      <section className="panel">
        <h2>คำถามที่พบบ่อย</h2>
        <dl className="guide-faq">
          <dt>คู่แข่งต้องสร้างเป็นทีมในระบบไหม?</dt>
          <dd className="muted">
            ไม่ต้อง — ใส่ชื่อคู่แข่งเป็นข้อความตอนสร้างแมตช์ก็พอ
          </dd>
          <dt>ตัวสำรองมาจากไหน?</dt>
          <dd className="muted">
            จากผู้เล่นที่ติ๊กลงแข่งแต่ไม่ได้เลือกเป็นตัวจริง — Courtside
            จะแสดงเป็นตัวสำรอง
          </dd>
          <dt>บัญชีฤดูกาลคืออะไร?</dt>
          <dd className="muted">
            รายชื่อผู้มีสิทธิ์ในรายการแข่งขัน — เป็นตัวเลือก ไม่บังคับ
            รายชื่อลงแข่งจริงจัดที่หน้าแมตช์
          </dd>
          <dt>แก้ชื่อทีมเราได้ที่ไหน?</dt>
          <dd className="muted">
            หน้าผู้เล่น → บล็อก “ชื่อทีมเรา” — แก้ชื่อเต็ม/ชื่อสั้นได้
          </dd>
          <dt>อะไรยังแก้บนเว็บไม่ได้?</dt>
          <dd className="muted">
            สร้างทีมใหม่ / การแข่งขันใหม่ / สนามแข่ง / ลบแมตช์ — ยังทำผ่าน seed หรือ
            Studio (ไม่จำเป็นสำหรับใช้งานโค้ชปกติ)
          </dd>
        </dl>
      </section>

      <div className="row">
        <Link to="/players" className="btn primary">
          ไปหน้าผู้เล่น
        </Link>
        <Link to="/games" className="btn">
          ไปหน้าแมตช์
        </Link>
      </div>
    </div>
  );
}
