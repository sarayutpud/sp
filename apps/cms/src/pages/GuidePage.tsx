import { Link } from "react-router-dom";

export function GuidePage() {
  return (
    <div className="page-block">
      <header className="page-head guide-hero">
        <h1>เริ่มต้นใช้งาน</h1>
        <p className="muted">
          บันทึกสถิติ<strong>สองทีม</strong>ในนัดเดียว — รายงานหลักคือใบสถิตินัด
          (FIBA Box Score) มีตารางผู้เล่นแยกทีมเหย้า/เยือน
        </p>
      </header>

      <section className="panel">
        <h2>ลำดับงานแนะนำ</h2>
        <ol className="empty-steps guide-steps">
          <li>
            <Link to="/players">ผู้เล่น</Link> — เพิ่มผู้เล่นของ
            <strong>ทั้งสองทีม</strong> (ทีมเรา + คู่แข่ง) ให้ครบก่อนสร้างแมตช์
          </li>
          <li>
            <Link to="/games">แมตช์</Link> — เลือกทีมเรา + ทีมคู่แข่งจาก dropdown
            (ต้องเป็นทีมในระบบ) · เลือกเหย้า/เยือน · กรอกโค้ช/กรรมการได้ถ้าต้องการ ·
            กด <strong>จัดรายชื่อ</strong> ทั้งแท็บทีมเราและคู่แข่ง (ตัวจริงไม่เกิน 5
            คนต่อทีม)
          </li>
          <li>
            เปิด <strong>Courtside</strong> — เลือกแมตช์ → จัด 5 คนบนสนาม
            <strong>ทั้งเหย้าและเยือน</strong> → เริ่มบันทึก
            <ul className="guide-substeps">
              <li>แตะสนาม → เข้า/ไม่เข้า → แตะเบอร์ฝั่งที่ยิง (สีแยกเหย้า/เยือน)</li>
              <li>ยิงเข้า → เลือกแอสซิสต์หรือกด “ไม่มี”</li>
              <li>ยิงไม่เข้า → OREB / DREB / TO ในชีตเดียวกัน</li>
              <li>ฟาล์ว → คนทำผิด → ชนิด → คนถูกฟาล์ว (FD) หรือข้าม</li>
              <li>กดซิงก์เมื่อมีเน็ต · ส่งออก Excel/PDF ได้บนคอม</li>
            </ul>
          </li>
          <li>
            <Link to="/reports">รายงาน</Link> — เปิดใบสถิตินัดสองทีม · ส่งออก
            Excel/PDF/PNG · แท็บอื่นใช้ดูโซนยิง / โค้ช / ฤดูกาลตามต้องการ
          </li>
        </ol>
        <p className="muted report-note">
          คู่มือละเอียด:{" "}
          <a href="/user-manual.html" target="_blank" rel="noreferrer">
            เปิดคู่มือเต็ม
          </a>
        </p>
      </section>

      <section className="panel">
        <h2>คำถามที่พบบ่อย</h2>
        <dl className="guide-faq">
          <dt>คู่แข่งต้องเป็นทีมในระบบไหม?</dt>
          <dd className="muted">
            ใช่ — เลือกจาก dropdown เท่านั้น ไม่พิมพ์ชื่อเอง ทั้ง CMS และสร้างแมตช์ด่วนใน
            Courtside ถ้ายังไม่มีทีม/ผู้เล่น ให้เพิ่มก่อน
          </dd>
          <dt>ต้องสลับฝั่งก่อนทุกช็อตไหม?</dt>
          <dd className="muted">
            ไม่จำเป็น — ตอนเลือกผู้เล่นจะเห็นทั้งสองทีมสีต่างกัน แตะเบอร์ฝั่งที่ทำแอคชันได้เลย
            การแตะสกอร์บอร์ด/H·A ใช้โฟกัสตะกร้าและเปลี่ยนตัวของฝั่งนั้น
          </dd>
          <dt>รายงานหลักคืออะไร?</dt>
          <dd className="muted">
            FIBA Box Score สองทีม (สกอร์รวม · ควอเตอร์ · ตารางคนละทีม · FD / +/- / EF)
            ส่งออก Excel ได้โครงเดียวกับใบสถิติ
          </dd>
          <dt>ตัวสำรองมาจากไหน?</dt>
          <dd className="muted">
            จากรายชื่อลงแข่งของแต่ละทีมในแมตช์ — คนที่ไม่ใช่ตัวจริง = สำรองใน Courtside
          </dd>
        </dl>
      </section>
    </div>
  );
}
