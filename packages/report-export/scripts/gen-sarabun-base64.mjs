import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fonts = path.join(root, "fonts");
const reg = fs.readFileSync(path.join(fonts, "Sarabun-Regular.ttf")).toString("base64");
const bold = fs.readFileSync(path.join(fonts, "Sarabun-Bold.ttf")).toString("base64");
const out = `/** Auto-generated Sarabun TTF as base64 for jsPDF Thai text. Do not edit by hand. */
export const SARABUN_REGULAR_BASE64 = "${reg}";
export const SARABUN_BOLD_BASE64 = "${bold}";
`;
const dest = path.join(root, "src", "sarabun-base64.ts");
fs.writeFileSync(dest, out);
console.log("wrote", dest, "bytes", fs.statSync(dest).size);
