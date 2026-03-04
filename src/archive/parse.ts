import type { ArchiveTweet, PostRow } from "../types";

const PERMALINK_BASE = "https://x.com/i/status/";

/**
 * tweets.js の生文字列から JSON 配列を抽出する
 * 形式: window.YTD.tweet.part0 = [ ... ] または window.YTD.tweets.part0 = [ ... ]
 * 配列要素が { "tweet": { ... } } のラップ形式の場合も展開する
 */
export function extractTweetsJson(raw: string): ArchiveTweet[] {
  const trimmed = raw.trim();
  // window.YTD.tweet.part0 = または window.YTD.tweets.part0 = を除去
  const match = trimmed.match(/^window\.YTD\.tweets?\.part\d+\s*=\s*(\[[\s\S]*\])\s*;?\s*$/m);
  let arr: unknown[];
  if (match) {
    arr = JSON.parse(match[1]) as unknown[];
  } else {
    const arrayMatch = trimmed.match(/(\[[\s\S]*\])/);
    if (!arrayMatch) {
      throw new Error("tweets.js の形式が想定と異なります。window.YTD.tweet.part0 = [...] を含むファイルを指定してください。");
    }
    arr = JSON.parse(arrayMatch[1]) as unknown[];
  }
  // 配列要素が { "tweet": { ... } } のラップ形式の場合は中身を取り出す
  return arr.map((item: unknown) => {
    const obj = item as Record<string, unknown>;
    return obj && typeof obj.tweet === "object" && obj.tweet != null ? (obj.tweet as ArchiveTweet) : (item as ArchiveTweet);
  });
}

function toNum(v: number | string | undefined): number {
  if (v === undefined || v === null) return 0;
  if (typeof v === "number") return v;
  const n = parseInt(String(v), 10);
  return isNaN(n) ? 0 : n;
}

function join(arr: string[] | undefined): string {
  if (!arr || arr.length === 0) return "";
  return arr.filter(Boolean).join(", ");
}

/**
 * アーカイブの1ツイートを PostRow に変換
 */
export function archiveTweetToRow(tweet: ArchiveTweet, screenName?: string): PostRow {
  const id = String(tweet.id_str ?? tweet.id ?? "");
  const text = tweet.full_text ?? tweet.text ?? "";
  const createdAt = tweet.created_at ?? "";
  const permalink = id ? `${PERMALINK_BASE}${id}` : "";

  const entities = tweet.entities ?? {};
  const urls = (entities.urls ?? []).map((u) => u.expanded_url || u.url || "").filter(Boolean);
  const hashtags = (entities.hashtags ?? []).map((h) => (h.text ? `#${h.text}` : "")).filter(Boolean);
  const mentions = (entities.user_mentions ?? []).map((m) => (m.screen_name ? `@${m.screen_name}` : "")).filter(Boolean);

  const mediaEntities = entities.media ?? [];
  const extendedMedia = tweet.extended_entities?.media ?? [];
  const mediaUrls = [...mediaEntities, ...extendedMedia]
    .map((m) => m.media_url_https ?? m.url ?? "")
    .filter(Boolean);

  return {
    id,
    text,
    created_at: createdAt,
    url: permalink,
    source: tweet.source ?? "",
    is_retweet: Boolean(tweet.retweeted),
    is_reply: Boolean(tweet.in_reply_to_status_id_str),
    like_count: toNum(tweet.favorite_count),
    retweet_count: toNum(tweet.retweet_count),
    urls: join(urls),
    hashtags: join(hashtags),
    mentions: join(mentions),
    media: join(mediaUrls),
  };
}

/**
 * tweets.js の文字列をパースして PostRow の配列を返す
 */
export function parseTweetsJs(content: string, screenName?: string): PostRow[] {
  const tweets = extractTweetsJson(content);
  return tweets.map((t) => archiveTweetToRow(t, screenName));
}
