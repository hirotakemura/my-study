import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages のサブパス配信時は BASE_PATH=/<repo>/ を指定してビルドする
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/favicon-64.png', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Presta for OutSystems',
        short_name: 'Presta',
        description: 'OutSystems資格の問題演習と受験スケジュールを管理するアプリ',
        lang: 'ja',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        background_color: '#f4f5f7',
        theme_color: '#1e2530',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // 問題・計画データ(JSON)もプリキャッシュしてオフラインで動作させる
        globPatterns: ['**/*.{js,css,html,svg,png,json}'],
        // 大きいアイコンはインストール時に端末が取得するため、プリキャッシュしない
        globIgnores: ['**/icons/icon-512.png', '**/icons/icon-maskable-512.png'],
        navigateFallback: 'index.html',
      },
    }),
  ],
})
