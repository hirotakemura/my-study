// アイコンPNGを icon.svg から生成する（Playwright の Chromium を使用）
// 使い方: node scripts/gen-icons.mjs
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
// ローカルに無ければグローバルの playwright を使う
const { chromium } = (() => { try { return require('playwright') } catch { return require(process.env.PW_PATH) } })()
import { readFileSync } from 'node:fs'

const svg = readFileSync(new URL('../public/icons/icon.svg', import.meta.url), 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage()
for (const [size, name, pad] of [[192, 'icon-192.png', 0], [512, 'icon-512.png', 0], [180, 'apple-touch-icon.png', 0]]) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(`<style>html,body{margin:0}svg{width:${size - pad * 2}px;height:${size - pad * 2}px;display:block}</style>${svg}`)
  await page.screenshot({ path: new URL(`../public/icons/${name}`, import.meta.url).pathname, omitBackground: true })
}
await browser.close()
