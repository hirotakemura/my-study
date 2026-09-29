# 学習管理PWA（OutSystems資格 × TOEIC）

OutSystems Specialist資格とTOEICの学習を管理する、スマホ向けのPWAアプリです。
ホーム画面に追加でき、オフラインでも動作します。データは端末のブラウザ（localStorage）に保存されます。

## 機能

| 画面 | 内容 |
|---|---|
| ホーム | 今日の日付に応じたTOEICの「今週やること」と通勤中メニュー、OutSystems次回試験・TOEIC本番までのカウントダウン、学習時間の記録（英語／OutSystems・分単位）、連続学習日数、今週の合計、最低ライン（単語15分）のチェック |
| 演習 | OutSystems 11 Web Developer Specialist のオリジナル4択問題200問。分野別／ランダム10問／本番模試（30問・90分・合格70%）／間違えた問題の復習。選択肢は毎回シャッフル、回答後すぐに正誤と解説を表示。分野別正答率（70%未満を強調） |
| 受験 | 5つのSpecialist試験の日程と結果（未受験／合格／不合格）。不合格時は1週間後の予備枠を再受験日として提案。Expert Developerまでの進捗 |
| TOEIC | 期間ごとのチェックリスト（今日の期間を自動判定）、模試スコア（L/R別）の記録と推移グラフ |
| 振り返り | 週ごとの学習時間、分野別正答率の変化、来週の予定、振り返りメモ。日曜日は起動時に自動で表示 |
| 設定（⚙️） | ダークモード（端末に合わせる／ライト／ダーク）、JSONでのエクスポート／インポート、データ初期化 |

## 開発

```bash
npm install
npm run dev            # 開発サーバー（http://localhost:5173）
npm run build          # 型チェック + 本番ビルド（dist/）
npm run preview        # ビルド結果の確認（Service Worker もここで動作確認できます）
npm run validate:data  # 問題データ・計画データの整合性チェック
```

技術構成：Vite + React + TypeScript、vite-plugin-pwa（Workbox）

## データファイル（アプリ本体と分離）

問題データと計画データは `public/data/` 配下のJSONで管理しています。コードを変更せずに追加・修正できます。

```
public/data/
├── plan/
│   ├── outsystems-exams.json   # 受験日程・予備枠
│   └── toeic-roadmap.json      # TOEICの期間・チェックリスト・通勤メニュー・目標
└── questions/
    ├── index.json              # 試験と分野の一覧（出題比率・ファイルパス）
    └── web-developer-specialist/
        ├── async.json          # 非同期処理（26問）
        ├── bp-data.json        # ベストプラクティス：データ（26問）
        ├── bp-screens.json     # ベストプラクティス：画面（26問）
        ├── bp-queries.json     # ベストプラクティス：クエリ（20問）
        ├── bp-logic.json       # ベストプラクティス：ロジック（28問）
        ├── exceptions.json     # 例外・トランザクション処理（14問）
        ├── integration-db.json # 統合：外部データベース（14問）
        ├── integration-rest.json # 統合：REST API（12問）
        ├── troubleshooting.json  # トラブルシューティング（26問）
        └── team.json           # チーム開発（8問）
```

### 問題の形式

```json
{
  "id": "async-001",
  "exam": "web-developer-specialist",
  "category": "非同期処理",
  "difficulty": "標準",
  "question": "問題文",
  "options": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
  "answer": 0,
  "explanation": "正解の理由",
  "wrongReasons": ["選択肢2が違う理由", "選択肢3が違う理由", "選択肢4が違う理由"]
}
```

- `answer` は `options` の0始まりのインデックス
- `wrongReasons` は **正解以外の選択肢を `options` の並び順に** 並べたもの
- 選択肢は表示時にシャッフルされるため、解説で「A」「B」などの記号を使わないでください
- `difficulty` は `基礎` / `標準` / `応用`

### 別の試験の問題を追加する（例：Front-end Developer Specialist）

1. `public/data/questions/front-end-developer-specialist/` に分野ごとのJSONを作成（`exam` は `front-end-developer-specialist`）
2. `public/data/questions/index.json` の `exams` に試験を追加し、`categories` に分野名・出題比率（`weight`）・ファイルパスを記載（各分野の問題数は `weight` の整数倍にそろえる）
3. `npm run validate:data` でチェック

試験が2つ以上になると、演習画面に試験の切り替えが表示されます。`exam` の値は `plan/outsystems-exams.json` の `id` と揃えておくと管理しやすくなります。

> 注：データJSONはService Workerでプリキャッシュされます。JSONを修正したら再デプロイしてください（アプリを開き直すと自動で更新されます）。

## デプロイ

### GitHub Pages（GitHub Actions）

`.github/workflows/deploy.yml` を同梱しています。

1. このリポジトリを GitHub に push する
2. GitHub のリポジトリで **Settings → Pages → Build and deployment → Source** を **GitHub Actions** にする
3. `main` ブランチに push すると自動でビルド・デプロイされる（Actions タブの「Deploy to GitHub Pages」から手動実行も可能）
4. `https://<ユーザー名>.github.io/<リポジトリ名>/` で公開される

サブパス配信のため、ワークフロー内で `BASE_PATH=/<リポジトリ名>/` を指定してビルドしています。
手元で同じビルドを確認する場合：

```bash
BASE_PATH=/my-study/ npm run build
```

### Vercel

1. [Vercel](https://vercel.com/) にログインし **Add New → Project** からこのリポジトリをインポート
2. Framework Preset は **Vite** が自動選択される（Build Command: `npm run build`、Output Directory: `dist`）
3. **Deploy** を押す。以降は push のたびに自動デプロイされる

Vercel はルートパスで配信されるため `BASE_PATH` の指定は不要です。

## スマホのホーム画面に追加する

- **iPhone（Safari）**：公開URLを開く → 共有ボタン → 「ホーム画面に追加」
- **Android（Chrome）**：公開URLを開く → メニュー → 「ホーム画面に追加」または「アプリをインストール」

一度開けば、以降はオフラインでも起動できます。

## バックアップ

データはその端末のブラウザにのみ保存されます。機種変更やブラウザのデータ削除に備え、⚙️（設定）から定期的に **JSONをエクスポート** してください。別の端末では **JSONをインポート** で復元できます。

## アイコンの再生成

`public/icons/icon.svg` を変更した場合は、PNGアイコンを再生成します（Playwright が必要）。

```bash
node scripts/gen-icons.mjs
```

## 問題について

収録問題はすべてオリジナルです（公式問題の転載ではありません）。OutSystems 11 の公式ドキュメント（success.outsystems.com）の記載と照らして作成・確認していますが、試験対策の最終確認には公式ドキュメントと公式の模擬試験もあわせて利用してください。
