import * as fs from "fs";
import * as path from "path";
import AdmZip from "adm-zip";
import { parseTweetsJs } from "./parse";
import type { PostRow, ArchiveTweet } from "../types";

export { parseTweetsJs, extractTweetsJson, archiveTweetToRow } from "./parse";
export type { ArchiveTweet };

const TWEETS_JS_NAMES = ["tweets.js", "data/tweets.js", "tweet.js", "data/tweet.js"];

/**
 * ZIP バッファから tweets.js の内容を取得する
 */
function getTweetsJsFromZip(zipBuffer: Buffer): string {
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();

  for (const name of TWEETS_JS_NAMES) {
    const entry = entries.find((e) => e.entryName === name || e.entryName.endsWith("/" + name));
    if (entry && !entry.isDirectory) {
      return entry.getData().toString("utf8");
    }
  }
  // ファイル名が tweets.js を含むもの
  const anyTweets = entries.find((e) => !e.isDirectory && e.entryName.toLowerCase().includes("tweet") && e.entryName.endsWith(".js"));
  if (anyTweets) {
    return anyTweets.getData().toString("utf8");
  }
  throw new Error("ZIP 内に tweets.js が見つかりませんでした。");
}

/**
 * ファイルパスまたはバッファから投稿一覧を取得する
 * - .js / .json: そのまま tweets.js としてパース
 * - .zip: 解凍して tweets.js を探してパース
 */
export function loadAndParse(input: string | Buffer, screenName?: string): PostRow[] {
  if (Buffer.isBuffer(input)) {
    const str = input.toString("utf8");
    if (str.trimStart().startsWith("[")) {
      return parseTweetsJs(str, screenName);
    }
    if (str.includes("YTD.tweet") || str.includes("YTD.tweets")) {
      return parseTweetsJs(str, screenName);
    }
    return parseTweetsJs(getTweetsJsFromZip(input), screenName);
  }

  const p = path.resolve(input);
  const stat = fs.statSync(p);
  if (!stat.isFile()) {
    const dir = p;
    for (const name of TWEETS_JS_NAMES) {
      const full = path.join(dir, name);
      if (fs.existsSync(full)) {
        return parseTweetsJs(fs.readFileSync(full, "utf8"), screenName);
      }
    }
    throw new Error(`ディレクトリ内に tweets.js が見つかりません: ${dir}`);
  }

  const ext = path.extname(p).toLowerCase();
  const content = fs.readFileSync(p, "utf8");

  if (ext === ".zip") {
    const buf = fs.readFileSync(p);
    const tweetsContent = getTweetsJsFromZip(buf);
    return parseTweetsJs(tweetsContent, screenName);
  }

  return parseTweetsJs(content, screenName);
}
