# アプリアイコン生成用プロンプト

画像生成AI（ChatGPT / DALL·E、Midjourney、Gemini など）に渡すプロンプトです。
アプリの配色（濃紺 `#1E2530` ＋ 赤 `#C8102E` ＋ 白）に合わせています。

> OutSystems の公式ロゴや商標をそのまま使うのは避け、「OutSystems風の配色の学習アプリ」として独自のデザインにしています。

## プロンプト（英語・推奨）

```
A modern, minimal app icon for a study app that helps developers prepare for low-code platform certification exams.
Flat vector style, square canvas 1024x1024, full-bleed background (no rounded corners, no transparency, no border, no drop shadow outside the icon).
Background: solid deep navy #1E2530.
Center motif: a bold, simple red (#C8102E) rounded speech-bubble / document shape that also suggests a checkmark or a stack of learning blocks, with one or two clean white (#FFFFFF) accents.
Geometric, clean lines, generous padding: keep all important shapes inside the central 70% of the canvas so it can be cropped into a circle or rounded square.
No text, no letters, no numbers, no logos of real companies, no gradients or only a very subtle one, high contrast, readable at 48x48 px.
```

## プロンプト（日本語）

```
低コード開発プラットフォームの資格試験対策アプリのアイコンを作成してください。
フラットなベクタースタイル、1024×1024の正方形。角丸や透過、枠線、外側の影は付けず、背景は全面塗りつぶし。
背景色：濃紺 #1E2530。
中央のモチーフ：赤 #C8102E の太くシンプルな角丸の吹き出し（または書類）の形。チェックマークや積み重なった学習ブロックを連想させ、白 #FFFFFF のアクセントを1〜2か所入れる。
幾何学的で整った線。重要な要素はキャンバス中央70%以内に収め、円形や角丸に切り抜いても欠けないようにする。
文字・数字・実在企業のロゴは入れない。グラデーションは使わないか、ごく控えめに。48×48pxでも判別できる高いコントラスト。
```

## バリエーション（気に入らなかったとき）

- もっとシンプルに：`Only one shape: a red rounded square with a white checkmark, on navy background.`
- 学習感を強く：`Motif: an open book whose right page turns into a red checkmark.`
- 積み木（低コード）感：`Motif: three stacked rounded blocks, the top one red, the others white.`

## 生成後の差し替え手順

1. 生成した正方形の画像を `docs/icon-source.png` に上書きする。
2. `node scripts/gen-icons.mjs` を実行し、`public/icons/` の各PNG（512・192・180・64・マスカブル512）を生成する。モチーフの位置が変わった場合はスクリプト内の `CROP` を調整する。
3. コミットして `main` に push すると GitHub Pages に反映される。インストール済みのPWAはアイコンの更新に時間がかかることがある（再インストールで確実に反映）。

画像をこのリポジトリに追加してもらえれば、各サイズへの書き出しと差し替えはこちらで行えます。
