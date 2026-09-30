import { useEffect } from 'react'
import { navigate, useRoute, type Route } from './lib/router'
import { updateData, useData } from './lib/store'
import { isSunday, todayKey } from './lib/date'
import Home from './pages/Home'
import Quiz from './pages/Quiz'
import Exams from './pages/Exams'
import Review from './pages/Review'
import Settings from './pages/Settings'
import { Icon, type IconName } from './icons'

const NAV: { route: Route; label: string; icon: IconName }[] = [
  { route: 'home', label: 'ホーム', icon: 'home' },
  { route: 'quiz', label: '演習', icon: 'quiz' },
  { route: 'exams', label: '受験', icon: 'exams' },
  { route: 'review', label: '振り返り', icon: 'review' },
]

const TITLES: Record<Route, string> = {
  home: '学習ホーム',
  quiz: '問題演習',
  exams: '受験スケジュール',
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
        <div className="brand">
          <span className="brand-mark">
            <Icon name="logo" />
          </span>
          <div className="brand-text">
            <small>OUTSYSTEMS STUDY</small>
            <h1>{TITLES[route]}</h1>
          </div>
        </div>
        <button
          className="icon-btn"
          aria-label="設定"
          onClick={() => navigate(route === 'settings' ? 'home' : 'settings')}
        >
          <Icon name={route === 'settings' ? 'close' : 'settings'} />
        </button>
      </header>
      <main className="content">
        {route === 'home' && <Home />}
        {route === 'quiz' && <Quiz />}
        {route === 'exams' && <Exams />}
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
              <Icon name={n.icon} />
            </span>
            <span>{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
