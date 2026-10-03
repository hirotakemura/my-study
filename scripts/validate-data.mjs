// 問題データ・計画データの整合性チェック
// 使い方: npm run validate:data
import { readFileSync } from 'node:fs'

const root = new URL('../public/data/', import.meta.url)
const read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'))
const errors = []
const warn = []

const index = read('questions/index.json')
const ids = new Set()
for (const exam of index.exams) {
  let total = 0
  console.log(`\n# ${exam.name}`)
  for (const cat of exam.categories) {
    const list = read(`questions/${cat.file}`)
    total += list.length
    const diff = { 基礎: 0, 標準: 0, 応用: 0 }
    const answerPos = [0, 0, 0, 0]
    for (const q of list) {
      const where = `${cat.file} ${q.id}`
      if (ids.has(q.id)) errors.push(`${where}: id が重複`)
      ids.add(q.id)
      if (q.exam !== exam.id) errors.push(`${where}: exam が ${exam.id} ではない`)
      if (q.category !== cat.name) errors.push(`${where}: category が "${cat.name}" ではない`)
      if (!(q.difficulty in diff)) errors.push(`${where}: difficulty が不正`)
      else diff[q.difficulty]++
      if (!Array.isArray(q.options) || q.options.length !== 4) errors.push(`${where}: 選択肢が4つではない`)
      if (new Set(q.options).size !== q.options.length) errors.push(`${where}: 選択肢が重複`)
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) errors.push(`${where}: answer が範囲外`)
      else answerPos[q.answer]++
      if (!Array.isArray(q.wrongReasons) || q.wrongReasons.length !== q.options.length - 1)
        errors.push(`${where}: wrongReasons は正解以外の選択肢数と同じ数が必要`)
      if (!q.question || !q.explanation) errors.push(`${where}: 問題文または解説が空`)
      // 選択肢はシャッフル表示されるため、解説で記号を参照してはいけない
      const texts = [q.question, q.explanation, ...(q.wrongReasons ?? [])].join('\n')
      if (/(選択肢\s*[A-DＡ-Ｄ1-4１-４]|[（(][A-D][)）]|\b[A-D]は|\b[A-D]の選択肢)/.test(texts))
        errors.push(`${where}: 選択肢の記号を参照している`)
    }
    // 分野ごとの問題数は出題比率（weight）と比例していなくてよい（本番模試は weight に沿って出題する）
    if (list.length < cat.weight) warn.push(`${cat.name}: ${list.length}問（比率 ${cat.weight} より少なく、模試の出題数が足りない可能性）`)
    console.log(
      `${cat.name.padEnd(16, '　')} ${String(list.length).padStart(3)}問  基礎${diff.基礎} 標準${diff.標準} 応用${diff.応用}  正解位置${answerPos.join('/')}`,
    )
  }
  console.log(`合計: ${total}問`)
}

const os = read('plan/outsystems-exams.json')
for (const d of [...os.exams.map((e) => e.date), ...os.reserveSlots])
  if (new Date(d).getUTCDay() !== 6) errors.push(`outsystems-exams: ${d} が土曜日ではない`)

if (warn.length) console.log('\n警告:\n- ' + warn.join('\n- '))
if (errors.length) {
  console.error('\nエラー:\n- ' + errors.join('\n- '))
  process.exit(1)
}
console.log('\nOK')
