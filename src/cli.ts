/**
 * CLI: ローカルでアーカイブをパースして CSV 出力する（オプション）
 * 例: npx ts-node src/cli.ts parse ./path/to/tweets.js
 */
import * as fs from "fs";
import * as path from "path";
import { loadAndParse } from "./archive";
import { POST_ROW_HEADERS } from "./types";

const args = process.argv.slice(2);
const command = args[0];
const inputPath = args[1];

if (command === "parse" && inputPath) {
  const resolved = path.resolve(inputPath);
  if (!fs.existsSync(resolved)) {
    console.error("ファイルが見つかりません:", resolved);
    process.exit(1);
  }
  try {
    const rows = loadAndParse(resolved);
    console.error("パース完了: %d 件", rows.length);

    // CSV として出力（ヘッダー + 行）
    const header = POST_ROW_HEADERS.join(",");
    const escape = (v: unknown) => {
      const s = String(v ?? "");
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };
    const lines = [header, ...rows.map((r) => POST_ROW_HEADERS.map((h) => escape(r[h])).join(","))];
    console.log(lines.join("\n"));
  } catch (e) {
    console.error("エラー:", (e as Error).message);
    process.exit(1);
  }
} else {
  console.log("使い方: npx ts-node src/cli.ts parse <tweets.js または archive.zip のパス>");
  console.log("例: npx ts-node src/cli.ts parse ./tweets.js");
}
