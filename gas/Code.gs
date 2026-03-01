/**
 * X投稿管理 - スプレッドシートに紐づく Google Apps Script
 * メニュー「X投稿管理」→「アーカイブをインポート」でサイドバーを開き、
 * ZIP または tweets.js をアップロードして取り込む（重複時は変更部分のみ上書き）
 */

const SHEET_NAME = "投稿一覧";
const HEADERS = [
  "id", "text", "created_at", "url", "source", "is_retweet", "is_reply",
  "like_count", "retweet_count", "urls", "hashtags", "mentions", "media"
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("X投稿管理")
    .addItem("アーカイブをインポート", "openImportSidebar")
    .addToUi();
}

function openImportSidebar() {
  const html = HtmlService.createHtmlOutputFromFile("sidebar")
    .setTitle("アーカイブをインポート")
    .setWidth(320);
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * サイドバーから呼ばれる: ファイル内容（base64）とファイル名を受け取り、パースしてマージしてシートに書き込む
 */
function processUploadedFile(base64Data, filename) {
  if (!base64Data || !filename) {
    return { success: false, message: "ファイルが選択されていません。" };
  }
  try {
    const blob = Utilities.newBlob(Utilities.base64Decode(base64Data));
    let tweetsJsText = "";

    const lower = filename.toLowerCase();
    if (lower.endsWith(".zip")) {
      const blobs = Utilities.unzip(blob);
      for (let i = 0; i < blobs.length; i++) {
        const text = blobs[i].getDataAsString("UTF-8");
        if (text && (text.indexOf("YTD.tweet") >= 0 || text.indexOf("full_text") >= 0 || text.indexOf("id_str") >= 0)) {
          tweetsJsText = text;
          break;
        }
      }
      if (!tweetsJsText) {
        return { success: false, message: "ZIP 内に tweets.js 相当のファイルが見つかりませんでした。" };
      }
    } else {
      tweetsJsText = blob.getDataAsString("UTF-8");
    }

    const newRows = parseTweetsJs(tweetsJsText);
    if (!newRows || newRows.length === 0) {
      return { success: false, message: "有効な投稿データがありませんでした。" };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight("bold");
    }

    const existing = readSheetToMap(sheet);
    const merged = mergeRows(existing, newRows);
    const sheetData = toSheetData(merged, "newestFirst");
    const numRows = sheetData.length;
    const numCols = HEADERS.length;

    if (numRows > 1) {
      sheet.getRange(1, 1, numRows, numCols).setValues(sheetData);
      if (numRows > 1) {
        sheet.getRange(1, 1, 1, numCols).setFontWeight("bold");
      }
    }

    return {
      success: true,
      message: "取り込み完了しました。投稿 " + newRows.length + " 件を処理し、シートを更新しました。"
    };
  } catch (e) {
    return { success: false, message: "エラー: " + (e.message || String(e)) };
  }
}

function readSheetToMap(sheet) {
  const data = sheet.getDataRange().getValues();
  const map = {};
  if (data.length < 2) return map;
  const headerRow = data[0];
  const idIdx = headerRow.indexOf("id");
  if (idIdx < 0) return map;

  for (let r = 1; r < data.length; r++) {
    const id = String(data[r][idIdx] || "").trim();
    if (!id) continue;
    const row = {};
    headerRow.forEach(function (h, c) {
      row[h] = data[r][c];
    });
    map[id] = row;
  }
  return map;
}

function parseTweetsJs(content) {
  const trimmed = content.trim();
  let arr = [];
  const match = trimmed.match(/window\.YTD\.tweets?\.part\d+\s*=\s*(\[[\s\S]*\])\s*;?\s*$/m);
  if (match) {
    try {
      arr = JSON.parse(match[1]);
    } catch (_) {
      return [];
    }
  } else {
    const arrayMatch = trimmed.match(/(\[[\s\S]*\])/);
    if (arrayMatch) {
      try {
        arr = JSON.parse(arrayMatch[1]);
      } catch (_) {
        return [];
      }
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr.map(tweetToRow).filter(function (r) { return r && r.id; });
}

function tweetToRow(t) {
  const id = String(t.id_str != null ? t.id_str : t.id != null ? t.id : "");
  const text = t.full_text != null ? t.full_text : (t.text != null ? t.text : "");
  const createdAt = t.created_at != null ? t.created_at : "";
  const permalink = id ? "https://x.com/i/status/" + id : "";

  const entities = t.entities || {};
  const urls = (entities.urls || []).map(function (u) { return u.expanded_url || u.url || ""; }).filter(Boolean);
  const hashtags = (entities.hashtags || []).map(function (h) { return h.text ? "#" + h.text : ""; }).filter(Boolean);
  const mentions = (entities.user_mentions || []).map(function (m) { return m.screen_name ? "@" + m.screen_name : ""; }).filter(Boolean);
  const mediaE = entities.media || [];
  const extMedia = (t.extended_entities && t.extended_entities.media) ? t.extended_entities.media : [];
  const mediaUrls = mediaE.concat(extMedia).map(function (m) { return m.media_url_https || m.url || ""; }).filter(Boolean);

  function toNum(v) {
    if (v === undefined || v === null) return 0;
    if (typeof v === "number") return v;
    var n = parseInt(String(v), 10);
    return isNaN(n) ? 0 : n;
  }
  function join(a) {
    if (!a || a.length === 0) return "";
    return a.filter(Boolean).join(", ");
  }

  return {
    id: id,
    text: text,
    created_at: createdAt,
    url: permalink,
    source: t.source != null ? t.source : "",
    is_retweet: Boolean(t.retweeted),
    is_reply: Boolean(t.in_reply_to_status_id_str),
    like_count: toNum(t.favorite_count),
    retweet_count: toNum(t.retweet_count),
    urls: join(urls),
    hashtags: join(hashtags),
    mentions: join(mentions),
    media: join(mediaUrls)
  };
}

function mergeRows(existingMap, newRows) {
  const result = {};
  var k;
  for (k in existingMap) {
    if (existingMap.hasOwnProperty(k)) result[k] = Object.assign({}, existingMap[k]);
  }
  newRows.forEach(function (newRow) {
    var id = newRow.id;
    if (!id) return;
    if (result[id]) {
      HEADERS.forEach(function (key) {
        if (newRow[key] === undefined) return;
        var newStr = String(newRow[key]);
        var oldVal = result[id][key];
        var oldStr = (oldVal !== undefined && oldVal !== null) ? String(oldVal) : "";
        if (newStr !== oldStr) result[id][key] = newRow[key];
      });
    } else {
      result[id] = Object.assign({}, newRow);
    }
  });
  return result;
}

function toSheetData(rowsMap, order) {
  const rows = [];
  for (var id in rowsMap) {
    if (rowsMap.hasOwnProperty(id)) rows.push(rowsMap[id]);
  }
  rows.sort(function (a, b) {
    var da = a.created_at || "";
    var db = b.created_at || "";
    return order === "newestFirst" ? (db.localeCompare(da)) : (da.localeCompare(db));
  });
  const out = [HEADERS.slice()];
  rows.forEach(function (r) {
    out.push(HEADERS.map(function (h) { return r[h] != null ? r[h] : ""; }));
  });
  return out;
}
