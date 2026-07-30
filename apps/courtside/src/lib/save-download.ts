import { isTauri } from "@tauri-apps/api/core";

function filtersFor(name: string) {
  if (name.endsWith(".xlsx")) {
    return [{ name: "Excel", extensions: ["xlsx"] }];
  }
  if (name.endsWith(".json")) {
    return [{ name: "JSON", extensions: ["json"] }];
  }
  return [];
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export type SaveBlobResult = "saved" | "cancelled" | { error: string };

/** Save a blob — native dialog in Tauri, browser download otherwise */
export async function saveBlob(
  blob: Blob,
  defaultName: string,
): Promise<SaveBlobResult> {
  if (isTauri()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeFile } = await import("@tauri-apps/plugin-fs");
    try {
      const path = await save({
        defaultPath: defaultName,
        filters: filtersFor(defaultName),
        title: "บันทึกไฟล์",
      });
      if (!path) return "cancelled";
      await writeFile(path, new Uint8Array(await blob.arrayBuffer()));
      return "saved";
    } catch (err) {
      return { error: errorMessage(err) };
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = defaultName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return "saved";
}
