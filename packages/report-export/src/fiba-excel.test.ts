import { spuBanFixture } from "@sp/rules-engine";
import { describe, expect, it } from "vitest";
import { writeFibaBoxScoreXlsx } from "./fiba-excel";

describe("writeFibaBoxScoreXlsx", () => {
  it("writes a non-empty workbook with both team names", async () => {
    const buf = await writeFibaBoxScoreXlsx(spuBanFixture);
    expect(buf.byteLength).toBeGreaterThan(1000);
    const ExcelJS = await import("exceljs");
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const ws = wb.getWorksheet("FIBA Box Score");
    expect(ws).toBeTruthy();
    const text: string[] = [];
    ws?.eachRow((row) => {
      const values = Array.isArray(row.values) ? row.values : [];
      text.push(
        values
          .filter((v) => v != null && v !== "")
          .map((v) => String(v))
          .join(" "),
      );
    });
    const blob = text.join("\n");
    expect(blob).toContain("SPU");
    expect(blob).toContain("BAN");
    expect(blob).toContain("FIBA Box Score");
    expect(blob).toContain("Vaughn Donald Chester");
    expect(blob).toContain("Nyang Wek");
  });
});
