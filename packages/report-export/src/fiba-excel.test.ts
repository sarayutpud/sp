import { spuBanFixture } from "@sp/rules-engine";
import { describe, expect, it } from "vitest";
import { writeFibaBoxScoreXlsx } from "./fiba-excel";
import { writeFibaBoxScorePdf } from "./fiba-pdf";

describe("writeFibaBoxScoreXlsx", () => {
  it("writes a non-empty workbook with match info and both teams", async () => {
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
    expect(blob).toContain("Tournament");
    expect(blob).toContain("Game No.");
    expect(blob).toContain("Final Score");
    expect(blob).toContain("Field Goals");
    expect(blob).toContain("M/A");
  });
});

describe("writeFibaBoxScorePdf", () => {
  it("writes a non-empty PDF blob", async () => {
    const blob = await writeFibaBoxScorePdf(spuBanFixture);
    expect(blob.size).toBeGreaterThan(500);
    expect(blob.type).toContain("pdf");
  });
});
