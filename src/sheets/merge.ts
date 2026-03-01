import type { PostRow } from "../types";
import { POST_ROW_HEADERS } from "../types";

/**
 * 2つの行で「更新対象列」だけをマージする
 * 新しい値が存在し、かつ既存値と異なる列だけを newRow の値で上書きする
 */
export function mergeRow(existing: Record<string, unknown>, newRow: PostRow): Record<string, unknown> {
  const result = { ...existing };
  for (const key of POST_ROW_HEADERS) {
    const newVal = newRow[key];
    if (newVal === undefined) continue;
    const existingVal = existing[key];
    const newStr = String(newVal);
    const existingStr = existingVal !== undefined && existingVal !== null ? String(existingVal) : "";
    if (newStr !== existingStr) {
      (result as Record<string, unknown>)[key] = newVal;
    }
  }
  return result;
}

/**
 * 既存の行マップ（id -> 行オブジェクト）と新規取り込み行から、
 * マージ後の行リストを生成する
 * - 既存に同じ id がある: 変更がある列だけ上書きした行
 * - 新規 id: そのまま追加
 * 戻り値は「行の配列」で、列順は POST_ROW_HEADERS に合わせておく想定
 */
export function mergeRows(
  existingRows: Record<string, Record<string, unknown>>,
  newRows: PostRow[]
): Record<string, Record<string, unknown>> {
  const result = { ...existingRows };

  for (const row of newRows) {
    const id = row.id;
    if (!id) continue;

    if (result[id]) {
      result[id] = mergeRow(result[id], row);
    } else {
      result[id] = { ...row } as Record<string, unknown>;
    }
  }

  return result;
}

/**
 * マージ結果のマップを、ヘッダー順の二次元配列に変換（スプレッドシート用）
 */
export function toSheetData(
  rowsMap: Record<string, Record<string, unknown>>,
  order: "newestFirst" | "oldestFirst" = "newestFirst"
): unknown[][] {
  const rows = Object.values(rowsMap);
  const sorted = [...rows].sort((a, b) => {
    const da = (a.created_at as string) || "";
    const db = (b.created_at as string) || "";
    return order === "newestFirst" ? db.localeCompare(da) : da.localeCompare(db);
  });

  const header = [...POST_ROW_HEADERS];
  const body = sorted.map((r) => header.map((h) => r[h] ?? ""));
  return [header, ...body];
}
