import { useEffect } from 'react'
import { navigate, useRoute, type Route } from './lib/router'
import { updateData, useData } from './lib/store'
import { isSunday, todayKey } from './lib/date'
import Home from './pages/Home'
import Quiz from './pages/Quiz'
import Exams from './pages/Exams'
import Toeic from './pages/Toeic'
import Review from './pages/Review'
import Settings from './pages/Settings'

const NAV: { route: Route; label: string; icon: string }[] = [
  { route: 'home', label: 'ホーム', icon: '🏠' },
  { route: 'quiz', label: '演習', icon: '📝' },
  { route: 'exams', label: '受験', icon: '🎓' },
  { route: 'toeic', label: 'TOEIC', icon: '🎧' },
  { route: 'review', label: '振り返り', icon: '📊' },
]

const TITLES: Record<Route, string> = {
  home: '今日やること',
  quiz: 'OutSystems 問題演習',
  exams: 'OutSystems 受験スケジュール',
  toeic: 'TOEIC ロードマップ',
  review: '今週の振り返り',
  settings: '設定・バックアップ',
}

export default function App() {
  const route = useRoute()
  const data = useData()
  const theme = data.settings.theme

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', theme)
  }, [theme])

  // 日曜日はその日最初の起動時に振り返り画面を表示する
  useEffect(() => {
    const today = todayKey()
    if (isSunday(today) && data.lastReviewShown !== today) {
      updateData((d) => ({ ...d, lastReviewShown: today }))
      navigate('review')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="app">
      <header className="topbar">
        <h1>{TITLES[route]}</h1>
        <button
          className="icon-btn"
          aria-label="設定"
          onClick={() => navigate(route === 'settings' ? 'home' : 'settings')}
        >
          {route === 'settings' ? '✕' : '⚙️'}
        </button>
      </header>
      <main className="content">
        {route === 'home' && <Home />}
        {route === 'quiz' && <Quiz />}
        {route === 'exams' && <Exams />}
        {route === 'toeic' && <Toeic />}
        {route === 'review' && <Review />}
        {route === 'settings' && <Settings />}
      </main>
      <nav className="tabbar">
        {NAV.map((n) => (
          <button
            key={n.route}
            className={route === n.route ? 'active' : ''}
            onClick={() => navigate(n.route)}
            aria-current={route === n.route ? 'page' : undefined}
          >
            <span className="tab-icon" aria-hidden>
              {n.icon}
            </span>
            <span>{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
