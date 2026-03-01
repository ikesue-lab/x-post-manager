/**
 * スプレッドシートの1行 = 1投稿を表す型
 */
export interface PostRow {
  id: string;
  text: string;
  created_at: string;
  url: string;
  source: string;
  is_retweet: boolean;
  is_reply: boolean;
  like_count: number;
  retweet_count: number;
  urls: string;
  hashtags: string;
  mentions: string;
  media: string;
}

/** スプレッドシートの列順（ヘッダーと一致させる） */
export const POST_ROW_HEADERS: (keyof PostRow)[] = [
  "id",
  "text",
  "created_at",
  "url",
  "source",
  "is_retweet",
  "is_reply",
  "like_count",
  "retweet_count",
  "urls",
  "hashtags",
  "mentions",
  "media",
];

/**
 * X データアーカイブの tweets.js 内の1件の生データ（アーカイブ形式）
 */
export interface ArchiveTweet {
  id_str?: string;
  id?: number | string;
  full_text?: string;
  text?: string;
  created_at?: string;
  favorite_count?: number | string;
  retweet_count?: number | string;
  retweeted?: boolean;
  in_reply_to_status_id_str?: string | null;
  in_reply_to_user_id_str?: string | null;
  source?: string;
  entities?: {
    urls?: Array<{ expanded_url?: string; url?: string; display_url?: string }>;
    hashtags?: Array<{ text?: string }>;
    user_mentions?: Array<{ screen_name?: string; name?: string }>;
    media?: Array<{ media_url_https?: string; type?: string; url?: string }>;
  };
  extended_entities?: {
    media?: Array<{ media_url_https?: string; type?: string; url?: string }>;
  };
}
