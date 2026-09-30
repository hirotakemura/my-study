// アイコンPNGを docs/icon-source.png（正方形の元画像）から切り出して生成する（Playwright の Chromium を使用）
// 使い方: node scripts/gen-icons.mjs
// 元画像を差し替えた場合は、CROP（モチーフを囲む正方形の範囲。元画像のピクセル）を調整する
import { createRequire } from 'node:module'
import { readFileSync, writeFileSync } from 'node:fs'
const require = createRequire(import.meta.url)
// ローカルに無ければグローバルの playwright を使う
const { chromium } = (() => { try { return require('playwright') } catch { return require(process.env.PW_PATH) } })()

const CROP = [150, 110, 960] // x, y, 辺（通常のアイコン）
const TIGHT = [190, 230, 880] // ファビコン・ヘッダー用（より大きく見せる）
const JOBS = [
  ['icon-512.png', 512, CROP],
  ['icon-192.png', 192, CROP],
  ['apple-touch-icon.png', 180, CROP],
  ['favicon-64.png', 64, TIGHT],
  ['icon-maskable-512.png', 512, null], // 端末側で丸く切り抜かれるため全体を使う
]

const url = 'data:image/png;base64,' + readFileSync(new URL('../docs/icon-source.png', import.meta.url)).toString('base64')
const browser = await chromium.launch()
const page = await browser.newPage()
const out = await page.evaluate(async ({ url, jobs }) => {
  const img = new Image()
  img.src = url
  await img.decode()
  return jobs.map(([name, size, crop]) => {
    const [x, y, s] = crop ?? [0, 0, Math.min(img.width, img.height)]
    const c = document.createElement('canvas')
    c.width = c.height = size
    const g = c.getContext('2d')
    g.imageSmoothingQuality = 'high'
    g.drawImage(img, x, y, s, s, 0, 0, size, size)
    return [name, c.toDataURL('image/png').split(',')[1]]
  })
}, { url, jobs: JOBS })
for (const [name, data] of out) {
  writeFileSync(new URL(`../public/icons/${name}`, import.meta.url), Buffer.from(data, 'base64'))
}
await browser.close()
