import { useRef, useState } from 'react'
import { Async } from '../components/Async'
import { loadAllQuestions, useLoad } from '../lib/content'
import { todayKey } from '../lib/date'
import { deleteToeicData, exportJson, exportToeicJson, hasToeicData, importJson, resetData, updateData, useData } from '../lib/store'
import type { ThemeSetting } from '../types'

const THEMES: { id: ThemeSetting; label: string }[] = [
  { id: 'system', label: '端末に合わせる' },
  { id: 'light', label: 'ライト' },
  { id: 'dark', label: 'ダーク' },
]

export default function Settings() {
  const data = useData()
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')
  const content = useLoad(loadAllQuestions)

  const save = (text: string, name: string) => {
    const blob = new Blob([text], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  }
  const download = () => {
    save(exportJson(), `outsystems-study-backup-${todayKey()}.json`)
    setMsg('バックアップをダウンロードしました')
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    try {
      const text = await file.text()
      if (!confirm('現在のデータをバックアップの内容で置き換えます。よろしいですか？')) return
      importJson(text)
      setMsg('インポートしました')
    } catch (e) {
      setMsg(`インポートに失敗しました：${e instanceof Error ? e.message : String(e)}`)
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="stack">
      <section className="card">
        <h2>表示</h2>
        <div className="segmented">
          {THEMES.map((t) => (
            <button
              key={t.id}
              className={data.settings.theme === t.id ? 'on' : ''}
              onClick={() => updateData((d) => ({ ...d, settings: { ...d.settings, theme: t.id } }))}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>バックアップ</h2>
        <p className="small muted">
          データはこの端末のブラウザ（localStorage）にのみ保存されています。機種変更やブラウザのデータ削除に備えて、定期的にエクスポートしてください。
        </p>
        <div className="btn-row">
          <button className="btn primary" onClick={download}>
            JSONをエクスポート
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            JSONをインポート
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
        {msg && <p className="small">{msg}</p>}
        <ul className="plain small muted">
          <li>問題の回答履歴：{data.answers.length}件</li>
          <li>模試の記録：{data.mockExams.length}件</li>
          <li>手動の学習記録：{data.studyLogs.filter((l) => l.subject === 'outsystems').length}件</li>
          <li>振り返りメモ：{Object.keys(data.reviewMemos).length}件</li>
        </ul>
      </section>

      {hasToeicData(data) && (
        <section className="card">
          <h2>TOEICデータ（別アプリへの移行）</h2>
          <p className="small muted">
            TOEICの学習管理は別アプリに移しました。以前このアプリで記録したTOEICの学習時間・チェックリスト・スコアを書き出して、新しいTOEICアプリで読み込めます。
          </p>
          <div className="btn-row">
            <button
              className="btn primary"
              onClick={() => {
                save(exportToeicJson(), `toeic-data-${todayKey()}.json`)
                setMsg('TOEICデータを書き出しました')
              }}
            >
              TOEICデータを書き出す
            </button>
            <button
              className="btn danger"
              onClick={() =>
                confirm('このアプリからTOEICデータを削除します。書き出し済みか確認してください。削除しますか？') &&
                deleteToeicData()
              }
            >
              このアプリから削除
            </button>
          </div>
        </section>
      )}

      <section className="card">
        <h2>問題データ</h2>
        <Async state={content}>
          {({ index, questions }) => (
            <ul className="plain small">
              {index.exams.map((e) => (
                <li key={e.id}>
                  {e.name}：{questions.filter((q) => q.exam === e.id).length}問
                </li>
              ))}
            </ul>
          )}
        </Async>
        <p className="small muted">問題・受験計画のデータは public/data 配下のJSONファイルで管理しています。</p>
      </section>

      <section className="card">
        <h2>データの初期化</h2>
        <button
          className="btn danger"
          onClick={() => confirm('すべての学習データを削除します。元に戻せません。よろしいですか？') && resetData()}
        >
          すべてのデータを削除
        </button>
      </section>
    </div>
  )
}
