# X投稿管理（x-post-manager）

X（旧Twitter）のデータアーカイブから投稿一覧を取得し、Google スプレッドシートで管理するツールです。

- **スプレッドシート上にボタン**を配置し、ZIP または `tweets.js` をアップロードして取り込み
- **重複時は変更がある列だけ上書き**（いいね数・リツイート数などが更新された分だけ反映）
- API 不要（X の「データのアーカイブをダウンロード」で取得したファイルのみで利用可能）

---

## 使い方（スプレッドシート）

1. **アーカイブの取得**  
   X にログイン → 設定とプライバシー → アカウント → 「データのアーカイブをダウンロード」で ZIP をリクエスト（準備に24時間程度かかることがあります）。

2. **スプレッドシートに GAS を紐づける**
   - 新しい Google スプレッドシートを作成する
   - 拡張機能 → Apps Script を開く
   - `gas/Code.gs` の内容をそのままコピーして、デフォルトの `Code.gs` を置き換える
   - ファイル → 新規 → HTML ファイル → 名前を `sidebar` にし、`gas/sidebar.html` の内容を貼り付けて保存
   - 保存後、スプレッドシートを再読み込みする

3. **取り込み**
   - スプレッドシートのメニューに「X投稿管理」→「アーカイブをインポート」が表示される
   - クリックでサイドバーが開くので、ZIP または `tweets.js` を選択して「取り込み実行」を押す
   - 同じシート内に「投稿一覧」シートが自動作成され、1行1投稿で書き出される（既に同じ ID の行がある場合は、変更がある列だけ上書き）

---

## 開発（Node / CLI）

```bash
cd x-post-manager
npm install
```

- **CLI でパースのみ（CSV 出力）**  
  `npx ts-node src/cli.ts parse ./path/to/tweets.js`  
  または ZIP のパスを指定してもよい。

---

## プロジェクト構成

```
x-post-manager/
├── src/           # Node 用: アーカイブパーサー・マージロジック・CLI
├── gas/           # スプレッドシートにコピーして使う GAS（Code.gs, sidebar.html）
├── package.json
└── README.md
```

---

## スプレッドシートの列

| 列 | 説明 |
|----|------|
| id | 投稿ID（ツイートID） |
| text | 本文 |
| created_at | 投稿日時 |
| url | 投稿の permalink |
| source | クライアント名 |
| is_retweet / is_reply | リツイート・リプライか |
| like_count / retweet_count | いいね数・リツイート数 |
| urls / hashtags / mentions / media | 本文内URL・ハッシュタグ・メンション・メディアURL（カンマ区切り） |
