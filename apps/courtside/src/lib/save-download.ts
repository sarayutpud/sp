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

/** Save a blob — native dialog in Tauri, browser download otherwise */
export async function saveBlob(
  blob: Blob,
  defaultName: string,
): Promise<"saved" | "cancelled"> {
  if (isTauri()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeFile } = await import("@tauri-apps/plugin-fs");
    const path = await save({
      defaultPath: defaultName,
      filters: filtersFor(defaultName),
    });
    if (!path) return "cancelled";
    await writeFile(path, new Uint8Array(await blob.arrayBuffer()));
    return "saved";
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
