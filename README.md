# OutSystems 学習管理PWA

OutSystems Specialist資格（最終目標：Expert Developer）の問題演習と受験スケジュールを管理する、スマホ向けのPWAアプリです。
ホーム画面に追加でき、オフラインでも動作します。データは端末のブラウザ（localStorage）に保存されます。

> TOEICの学習管理は別アプリに分離しました。新しいTOEICアプリを作るためのプロンプトは [docs/TOEIC_APP_PROMPT.md](docs/TOEIC_APP_PROMPT.md) にあります。以前このアプリで記録したTOEICのデータは、⚙️（設定）の「TOEICデータを書き出す」で移行用のJSONとして保存できます。

> アプリアイコンを画像生成AIで作るためのプロンプトは [docs/ICON_PROMPT.md](docs/ICON_PROMPT.md) にあります。

## 機能

| 画面 | 内容 |
|---|---|
| ホーム | 次の試験までのカウントダウンと準備状況（着手数・正答率・直近の模試）、状況に応じた「今日のおすすめ」（苦手分野／未着手／間違えた問題／本番模試をワンタップで開始）、今日の学習時間・連続学習日数・今週の合計、この後の受験予定 |
| 演習 | Web Developer Specialist（200問）と Front-end Developer Specialist（100問）、Mobile Developer Specialist（100問）のオリジナル4択問題。資格は画面上部の「資格」ボタンから一覧で切り替え（選んだ資格は次回も表示）。未着手の問題数（全体・分野別）、分野別の正答率（70%未満を強調）、ランダム10問／本番模試（30問・90分・合格70%）／間違えた問題／未着手の問題／分野別の出題。選択肢は毎回シャッフル、回答後すぐに正誤と解説を表示 |
| 受験 | 5つのSpecialist試験の日程と結果（未受験／合格／不合格）。不合格時は1週間後の予備枠を再受験日として提案。Expert Developerまでの進捗 |
| 振り返り | 週ごとの学習時間（問題演習／その他）、回答数・正答率・模試、分野別正答率の変化、来週の受験予定、振り返りメモ。日曜日は起動時に自動で表示 |
| 設定（⚙️） | ダークモード、JSONでのエクスポート／インポート、旧TOEICデータの書き出し、データ初期化 |

### 学習時間の自動記録

問題演習の画面を開いている時間が、自動で学習時間に加算されます。

- タップ・キー入力・スクロールが5分以上ない場合、それ以降は数えません（放置対策）
- アプリがバックグラウンドの間は数えません
- 15秒ごとに保存するため、途中でアプリを閉じても計測済みの時間は残ります

ドキュメントや動画など、問題演習以外の学習はホームの「問題演習以外の学習を記録」から手動で追加できます。
連続学習日数は、1問でも回答した日、または学習時間を記録した日を「学習した日」として数えます。

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
│   └── outsystems-exams.json   # 受験日程・予備枠
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
    └── front-end-developer-specialist/   # Front-end Developer Specialist（計100問）
        ├── fe-fundamentals.json      # フロントエンド基礎（10問）
        ├── fe-css.json               # CSSの適用と優先順位（14問）
        ├── fe-themes.json            # テーマとスタイルシート（12問）
        ├── fe-patterns.json          # UIパターンとレイアウト（14問）
        ├── fe-customization.json     # UIのカスタマイズ（8問）
        ├── fe-javascript.json        # JavaScript（12問）
        ├── fe-best-practices.json    # スタイリングのベストプラクティス（8問）
        ├── fe-responsive-a11y.json   # レスポンシブとアクセシビリティ（10問）
        ├── fe-debugging.json         # デバッグとトラブルシューティング（6問）
        └── fe-architecture.json      # フロントエンドアーキテクチャと再利用（6問）
    └── mobile-developer-specialist/      # Mobile Developer Specialist（計100問）
        ├── mo-basics.json            # モバイルアプリの基礎とライフサイクル（10問）
        ├── mo-local-storage.json     # ローカルストレージ（12問）
        ├── mo-sync.json              # オフラインとデータ同期（16問）
        ├── mo-plugins.json           # ネイティブプラグイン（12問）
        ├── mo-ui.json                # モバイルのUIとUX（10問）
        ├── mo-performance.json       # 性能のベストプラクティス（10問）
        ├── mo-security.json          # セキュリティ（8問）
        ├── mo-distribution.json      # アプリのビルドと配布（12問）
        ├── mo-debugging.json         # デバッグとトラブルシューティング（6問）
        └── mo-architecture.json      # アーキテクチャと再利用（4問）
```

> Front-end Developer Specialist と Mobile Developer Specialist の分野と比率は暫定です（公式の出題比率が掲載されている learn.outsystems.com の試験詳細はログインが必要なため、公開されている出題トピックを基に設定）。公式の比率が確認できたら `index.json` の `weight` と問題数を調整してください。

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

アイコンの元画像は `docs/icon-source.png` です。差し替えた場合は、各サイズのPNGを再生成します（Playwright が必要）。

```bash
node scripts/gen-icons.mjs
```

## 問題について

収録問題はすべてオリジナルです（公式問題の転載ではありません）。OutSystems 11 の公式ドキュメント（success.outsystems.com）の記載と照らして作成・確認していますが、試験対策の最終確認には公式ドキュメントと公式の模擬試験もあわせて利用してください。
