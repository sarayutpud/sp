import { Link } from "react-router-dom";

function FlowInfographic() {
  const steps = [
    { n: "1", title: "ลีก·ทีม", sub: "ตั้งต้น" },
    { n: "2", title: "ผู้เล่น", sub: "สองทีม" },
    { n: "3", title: "แมตช์", sub: "รายชื่อ 5+5" },
    { n: "4", title: "Courtside", sub: "บันทึก + ซิงก์" },
    { n: "5", title: "รายงาน", sub: "FIBA · ประเมิน" },
  ];
  return (
    <div className="guide-flow" role="img" aria-label="ลำดับงาน 5 ขั้น">
      {steps.map((s, i) => (
        <div key={s.n} className="guide-flow-item">
          <div className="guide-flow-node">
            <span className="guide-flow-num">{s.n}</span>
            <strong>{s.title}</strong>
            <small>{s.sub}</small>
          </div>
          {i < steps.length - 1 && <span className="guide-flow-arrow" aria-hidden>→</span>}
        </div>
      ))}
    </div>
  );
}

function CourtInfographic() {
  return (
    <svg
      className="guide-court-svg"
      viewBox="0 0 280 150"
      role="img"
      aria-label="แผนภาพสนาม 2PT และ 3PT"
    >
      <title>โซน 2 คะแนน / 3 คะแนน</title>
      <rect x="1" y="1" width="278" height="148" fill="#e2c48a" stroke="#1a237e" strokeWidth="2" />
      <line x1="140" y1="1" x2="140" y2="149" stroke="#1a237e" strokeWidth="1.5" />
      <rect x="1" y="35" width="58" height="80" fill="rgba(26,35,126,0.08)" stroke="#1a237e" strokeWidth="1.2" />
      <rect x="221" y="35" width="58" height="80" fill="rgba(26,35,126,0.08)" stroke="#1a237e" strokeWidth="1.2" />
      <circle cx="16" cy="75" r="4" fill="#e53935" />
      <circle cx="264" cy="75" r="4" fill="#e53935" />
      <line x1="1" y1="9" x2="30" y2="9" stroke="#1a237e" strokeWidth="1.4" />
      <line x1="1" y1="141" x2="30" y2="141" stroke="#1a237e" strokeWidth="1.4" />
      <path d="M 30 9 A 67.5 67.5 0 0 1 30 141" fill="none" stroke="#1a237e" strokeWidth="1.4" />
      <line x1="279" y1="9" x2="250" y2="9" stroke="#1a237e" strokeWidth="1.4" />
      <line x1="279" y1="141" x2="250" y2="141" stroke="#1a237e" strokeWidth="1.4" />
      <path d="M 250 9 A 67.5 67.5 0 0 0 250 141" fill="none" stroke="#1a237e" strokeWidth="1.4" />
      <text x="48" y="78" fill="#1a237e" fontSize="11" fontWeight="700">2PT</text>
      <text x="88" y="40" fill="#0f1654" fontSize="10" fontWeight="700">3PT</text>
      <text x="210" y="78" fill="#1a237e" fontSize="11" fontWeight="700">2PT</text>
      <text x="168" y="40" fill="#0f1654" fontSize="10" fontWeight="700">3PT</text>
      <text x="8" y="20" fill="#5a628a" fontSize="8">L</text>
      <text x="266" y="20" fill="#5a628a" fontSize="8">R</text>
    </svg>
  );
}

function ShotFlowInfographic() {
  return (
    <ol className="guide-shot-flow">
      <li>
        <strong>1. แตะสนาม</strong>
        <span>ระบบเก็บพิกัด 0–1</span>
      </li>
      <li>
        <strong>2. เข้า / ไม่เข้า</strong>
        <span>เลือกผลช็อต</span>
      </li>
      <li>
        <strong>3. เลือกผู้ยิง</strong>
        <span>เหย้าหรือเยือน — คำนวณ 2P/3P ตามตะกร้าทีมนั้น</span>
      </li>
      <li>
        <strong>4. ขั้นถัดไป</strong>
        <span>เข้า → แอสซิสต์ · ไม่เข้า → OREB / DREB / TO</span>
      </li>
    </ol>
  );
}

export function GuidePage() {
  return (
    <div className="page-block guide-page">
      <header className="page-head guide-hero">
        <p className="guide-kicker">SP FITNESS · CMS + Courtside</p>
        <h1>เริ่มต้น & คู่มือใช้งาน</h1>
        <p className="muted">
          รวมขั้นตอนตั้งต้นกับคำอธิบายละเอียดในหน้าเดียว — สองทีมต่อนัด · รายงานหลักคือ{" "}
          <strong>FIBA Box Score</strong>
        </p>
      </header>

      <nav className="guide-toc panel" aria-label="สารบัญ">
        <h2>สารบัญ</h2>
        <ol>
          <li><a href="#overview">ภาพรวมระบบ</a></li>
          <li><a href="#steps">ลำดับงาน 4 ขั้น</a></li>
          <li><a href="#courtside">Courtside — บันทึกข้างสนาม</a></li>
          <li><a href="#shot-math">2 คะแนน / 3 คะแนน</a></li>
          <li><a href="#formulas">สูตรในใบสถิติ</a></li>
          <li><a href="#reports">รายงาน & ส่งออก</a></li>
          <li><a href="#cleanup">ลบแมตช์ / จบฤดูกาล</a></li>
          <li><a href="#faq">คำถามที่พบบ่อย</a></li>
          <li><a href="#troubleshoot">แก้ปัญหาเบื้องต้น</a></li>
        </ol>
      </nav>

      <section id="overview" className="panel guide-section">
        <h2>1) ภาพรวมระบบ</h2>
        <div className="guide-compare">
          <div className="guide-compare-card">
            <h3>CMS (เว็บนี้)</h3>
            <ul>
              <li>
                หน้าแยก:{" "}
                <Link to="/competitions">การแข่งขัน</Link> ·{" "}
                <Link to="/teams">ทีม</Link> ·{" "}
                <Link to="/players">ผู้เล่น</Link>
              </li>
              <li>สร้างแมตช์ · จัดรายชื่อลงแข่งทั้งสองฝั่ง</li>
              <li>ใบสถิติ FIBA · ประเมินผู้เล่น · แชร์ลิงก์</li>
              <li>ลบแมตช์ที่จบแล้วได้ (ยืนยันก่อน)</li>
            </ul>
          </div>
          <div className="guide-compare-card">
            <h3>Courtside (แอป Windows)</h3>
            <ul>
              <li>เลือกแมตช์ · จัด 5 คนบนสนามทั้งฝั่ง</li>
              <li>แตะสนามบันทึกช็อต / ฟาล์ว / รีบาวด์</li>
              <li>คอลัมน์ขวา: ซิงก์ · อีเวนต์ · Excel/PDF FIBA</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="steps" className="panel guide-section">
        <h2>2) ลำดับงานแนะนำ</h2>
        <FlowInfographic />
        <ol className="empty-steps guide-steps">
          <li>
            <Link to="/competitions">การแข่งขัน</Link> — เพิ่มลีก/ทัวร์นาเมนต์ ·{" "}
            <Link to="/teams">ทีม</Link> — เพิ่มทีมเราและคู่แข่ง
          </li>
          <li>
            <Link to="/players">ผู้เล่น</Link> — เพิ่มชื่อ + เบอร์ของ
            <strong> ทั้งสองทีม</strong> ให้ครบก่อนสร้างแมตช์
          </li>
          <li>
            <Link to="/games">แมตช์</Link> — เลือกการแข่งขัน + ทีมเรา + คู่แข่งจาก
            dropdown · เหย้า/เยือน · กด <strong>จัดรายชื่อ</strong> ทั้งสองแท็บ
            (ตัวจริงไม่เกิน 5 คน/ทีม)
          </li>
          <li>
            เปิด <strong>Courtside</strong> — เลือกแมตช์ → 5 คนบนสนามทั้งเหย้าและเยือน →
            เริ่มบันทึก → กดซิงก์เมื่อมีเน็ต
          </li>
          <li>
            <Link to="/reports">รายงาน</Link> — ใบสถิตินัด · ประเมินผู้เล่น
            (การ์ดโค้ช + แนวโน้มในลีก) · โซนยิง / โค้ช / ฤดูกาล
          </li>
        </ol>
      </section>

      <section id="courtside" className="panel guide-section">
        <h2>3) Courtside — บันทึกข้างสนาม</h2>
        <ShotFlowInfographic />
        <ul className="guide-bullets">
          <li>
            แตะสนาม → เลือกเข้า/พลาด → เลือกผู้ยิงทีหลัง (เห็นทั้งสองทีม)
          </li>
          <li>แตะสกอร์บอร์ดหรือ H/A เพื่อโฟกัสตะกร้าและเปลี่ยนตัวของฝั่งนั้น</li>
          <li>ฟาล์ว → คนทำผิด → ชนิด → คนถูกฟาล์ว (FD) หรือข้าม</li>
          <li>ชิปใต้ชื่อทีมโชว์เบอร์ + จุดฟาล์วของคนบนสนามทั้งสองฝั่ง</li>
          <li>
            คอลัมน์ขวา: สถานะออนไลน์ + ซิงก์ · คู่มือ / จบ Q / เปลี่ยนแมตช์ ·
            อีเวนต์ล่าสุด · Excel/PDF FIBA · Undo · สถานะตะกร้าโฟกัส
          </li>
        </ul>
        <p className="muted report-note">
          คีย์ลัดหลัก: F ฟาล์ว · T โทษ · U เปลี่ยนตัว · R/O รีบาวด์ · Esc ยกเลิก · Ctrl+Z เลิกทำ
        </p>
      </section>

      <section id="shot-math" className="panel guide-section">
        <h2>4) 2 คะแนน / 3 คะแนน ทำงานอย่างไร</h2>
        <p className="muted">
          พิกัดคลิกเป็นสัดส่วนบนสนามเต็ม (ยาว 28 ม. × กว้าง 15 ม.) · ระบบดูว่าผู้ยิงเป็นทีมไหน
          แล้วเทียบกับ<strong>ตะกร้าที่ทีมนั้นกำลังบุก</strong> (สลับฝั่งหลังครึ่งแรก)
        </p>
        <CourtInfographic />
        <ul className="guide-bullets">
          <li>
            <strong>3PT</strong> — นอกเส้นโค้งรัศมี 6.75 ม. จากศูนย์ตะกร้า หรืออยู่มุมสนาม
            นอกเส้นตรงห่างไซด์ไลน์ 0.90 ม.
          </li>
          <li>
            <strong>2PT</strong> — ในเพนต์ / ในเส้น 3 พอยต์ ของตะกร้าฝั่งบุก
          </li>
          <li>
            จุดเดียวกันอาจเป็น 2PT ของทีมหนึ่งและ 3PT ของอีกทีม — หน้าจอจะโชว์ทั้งสองฝั่งก่อนเลือกผู้ยิง
          </li>
        </ul>
      </section>

      <section id="formulas" className="panel guide-section">
        <h2>5) สูตรในใบสถิติ</h2>
        <div className="guide-formula-grid">
          <div className="guide-formula">
            <h3>Field goal %</h3>
            <code>FG% = Made / Attempts × 100</code>
            <p className="muted">เช่น 2PT, 3PT, FT แยกคอลัมน์ M/A และ %</p>
          </div>
          <div className="guide-formula">
            <h3>Efficiency (EF)</h3>
            <code>
              EF = PTS + REB + AST + ST + BS
              <br />− (FGA − FGM) − (FTA − FTM) − TO
            </code>
            <p className="muted">คะแนนประสิทธิภาพแบบ FIBA ที่ใช้ในใบสถิติ</p>
          </div>
          <div className="guide-formula">
            <h3>Effective FG% (eFG%)</h3>
            <code>eFG% = (FGM + 0.5 × 3PM) / FGA</code>
            <p className="muted">ให้น้ำหนักสามแต้มมากกว่าช็อตสองแต้ม</p>
          </div>
          <div className="guide-formula">
            <h3>True shooting % (TS%)</h3>
            <code>TS% = PTS / [2 × (FGA + 0.44 × FTA)]</code>
            <p className="muted">รวมผลฟรีโธรว์ในการวัดประสิทธิภาพการได้คะแนน</p>
          </div>
          <div className="guide-formula">
            <h3>+/−</h3>
            <code>คะแนนทีม − คะแนนคู่แข่ง ขณะผู้เล่นอยู่สนาม</code>
            <p className="muted">คำนวณจากตัวจริงตอนทิปออฟและการเปลี่ยนตัว</p>
          </div>
          <div className="guide-formula">
            <h3>คะแนนช็อต</h3>
            <code>เข้า + isThree → 3 · ไม่ใช่สาม → 2 · FT → 1</code>
            <p className="muted">isThree มาจากตำแหน่งเทียบตะกร้าฝั่งผู้ยิง</p>
          </div>
        </div>
      </section>

      <section id="reports" className="panel guide-section">
        <h2>6) รายงาน & ส่งออก</h2>
        <ul className="guide-bullets">
          <li>
            รายงานหลัก = <strong>FIBA Box Score สองทีม</strong> (Match Information ·
            ตารางสองระดับ · comparison · legend)
          </li>
          <li>
            CMS และ Courtside ใช้ไฟล์ Excel/PDF ชุดเดียวกันจากแพ็กเกจรายงานกลาง
          </li>
          <li>
            ลิงก์แชร์สาธารณะเปิดได้โดยไม่ล็อกอิน — แท็บแรกคือใบสถิตินัดสองทีม
            เหมือนใน CMS · มีสรุปโค้ชและแผนภาพการยิงด้วย
          </li>
          <li>
            แท็บ <strong>ประเมินผู้เล่น</strong> — การ์ดหลังเกม (สรุประดับจาก eFG +
            ปริมาณช็อต, EF, +/−, โซน) และตารางแนวโน้มข้ามนัดในลีกเดียวกัน · ไม่มีนาทีเล่น
          </li>
          <li>
            <Link to="/rosters">บัญชีฤดูกาล</Link> เป็นตัวเลือกเสริม — ไม่แทนรายชื่อลงแข่งต่อแมตช์
          </li>
        </ul>
      </section>

      <section id="cleanup" className="panel guide-section">
        <h2>7) ลบแมตช์ / จบฤดูกาล — แนะนำอย่างไร</h2>
        <div className="guide-callout ok">
          <strong>แนะนำ: ลบทีละแมตช์ในหน้าแมตช์</strong>
          <p>
            เมื่อนัดจบแล้วและไม่ต้องการเก็บสถิติ — กด <strong>ลบ</strong> ที่แถวแมตช์
            (ระบบจะถามยืนยัน) สถิติ/รายชื่อที่ผูกกับแมตช์นั้นถูกลบตาม cascade
          </p>
        </div>
        <div className="guide-callout warn">
          <strong>ไม่แนะนำ: ปุ่ม “ลบทั้งฤดูกาล” บนจอปกติ</strong>
          <p>
            การล้างหลายแมตช์พร้อมกันเสี่ยงพลาด — ใช้สคริปต์{" "}
            <code>node scripts/purge-match-data.mjs --dry-run</code> ก่อน แล้วค่อยรันจริง
            (ต้องมี service role) เมื่อจบไตรมาส/ฤดูกาล
          </p>
        </div>
      </section>

      <section id="faq" className="panel guide-section">
        <h2>8) คำถามที่พบบ่อย</h2>
        <dl className="guide-faq">
          <dt>คู่แข่งต้องเป็นทีมในระบบไหม?</dt>
          <dd className="muted">
            ใช่ — เพิ่มทีมที่หน้า <Link to="/teams">ทีม</Link> และผู้เล่นที่หน้า{" "}
            <Link to="/players">ผู้เล่น</Link> แล้วเลือกจาก dropdown ในหน้าแมตช์
          </dd>
          <dt>ต้องสลับฝั่งก่อนทุกช็อตไหม?</dt>
          <dd className="muted">
            ไม่จำเป็น — เลือกเบอร์ฝั่งที่ทำแอคชันได้เลย การแตะสกอร์ใช้โฟกัสตะกร้า/เปลี่ยนตัว
          </dd>
          <dt>ทำไมจุดเดียวกันโชว์ 2PT กับ 3PT คนละฝั่ง?</dt>
          <dd className="muted">
            เพราะแต่ละทีมบุกคนละตะกร้า — ระบบจะล็อกค่าตอนคุณเลือกผู้ยิงแล้ว
          </dd>
          <dt>นาทีเล่น (Min) อยู่ที่ไหน?</dt>
          <dd className="muted">
            ยังไม่บันทึกนาฬิกาเกมในรอบนี้ — คอลัมน์ Min ในใบสถิติอาจเป็น —
          </dd>
        </dl>
      </section>

      <section id="troubleshoot" className="panel guide-section">
        <h2>9) แก้ปัญหาเบื้องต้น</h2>
        <div className="table-scroll">
          <table className="data-table compact">
            <thead>
              <tr>
                <th>อาการ</th>
                <th>วิธีแก้</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>สร้างแมตช์ไม่ได้ / ไม่มีคู่แข่ง</td>
                <td>
                  เพิ่มที่หน้า การแข่งขัน / ทีม / ผู้เล่น แล้วกลับมาเลือกในหน้าแมตช์
                </td>
              </tr>
              <tr>
                <td>แอปไม่มีรายชื่อฝั่งใดฝั่งหนึ่ง</td>
                <td>
                  ใน CMS จัดรายชื่อทั้งสองแท็บ แล้วรีเฟรช Courtside (เคยออนไลน์อย่างน้อยครั้ง)
                </td>
              </tr>
              <tr>
                <td>ซิงก์ไม่สำเร็จ</td>
                <td>เช็กเน็ตแล้วกดซิงก์ใหม่ — ข้อมูลในเครื่องยังอยู่</td>
              </tr>
              <tr>
                <td>รายงานว่าง</td>
                <td>บันทึกใน Courtside แล้วซิงก์ เปิดรายงานแมตช์นั้นอีกครั้ง</td>
              </tr>
              <tr>
                <td>2P/3P ดูผิด</td>
                <td>
                  ดูว่าเลือกผู้ยิงฝั่งถูกหรือไม่ และอยู่ควอเตอร์ไหน (หลังครึ่งหลังตะกร้าสลับ)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
