// run: node --experimental-strip-types src/lib/recalls.test.ts (or npm test)
// recalls.sample.json is a recorded slice of the real FDA feed (fetched 2026-09-21).
import assert from 'node:assert/strict'
import sample from './recalls.sample.json' with { type: 'json' }
import { pickRecalls, type FdaRow } from './recalls.ts'

const rows = sample as FdaRow[]
const now = new Date('2026-09-21T12:00:00Z')

const all = pickRecalls(rows, [], now)
assert.ok(all.length >= 3, 'animal recalls inside the window are returned')
assert.ok(all.every((r) => r.date >= '2024-09-21'), 'nothing older than 24 months')
assert.ok(!all.some((r) => /Comforts/.test(r.brand)), 'human food is never returned')
assert.deepEqual([...all].sort((a, b) => b.date.localeCompare(a.date)), all, 'newest first')

const fromm = pickRecalls(rows, ['fromm'], now)
assert.equal(fromm.length, 1)
assert.equal(fromm[0].brand, 'Fromm')
assert.equal(fromm[0].date, '2026-08-21')
assert.match(fromm[0].url, /^https:\/\/www\.fda\.gov\/safety\/recalls/)
assert.ok(fromm[0].reason && fromm[0].product && fromm[0].id)

assert.equal(pickRecalls(rows, ['Pedigree'], now).length, 0, 'the 2024-05 Pedigree recall is outside the window')
assert.equal(pickRecalls(rows, ['Pedigree'], new Date('2025-01-01')).length, 1, 'and inside it for an earlier now')
assert.equal(pickRecalls(rows, ["Hill's Science Diet"], new Date('2019-06-01')).length, 1, 'apostrophes and entities are handled')
assert.equal(pickRecalls(rows, ['Fro'], now).length, 0, 'whole words only')
assert.equal(pickRecalls(rows, ['Purina ONE', 'Blue Buffalo'], now).length, 0, 'no recall, no rows')

console.log('recalls: all checks passed')
