import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluate, XlErr } from '../src/utils/formula.js'

const data = { A: { 1: 5, 2: '7', 3: '', 4: 'abc' }, B: { 1: 2 } }
const cell = (c, n) => { if (!(c in data)) throw new XlErr('#REF!'); const v = data[c][n] ?? ''; return v !== '' && !isNaN(Number(v)) ? Number(v) : v }
const ev = (f) => evaluate(f, { cell })

test('aritmetika dan prioritas operator', () => { assert.equal(ev('A1+A2*2'), 19); assert.equal(ev('-2^2'), 4); assert.equal(ev('A1%'), 0.05) })
test('SUM / COUNTA / COUNTIF', () => { assert.equal(ev('SUM(A1:A3)'), 12); assert.equal(ev('COUNTA(A1:A4)'), 3); assert.equal(ev('COUNTIF(A1:A4,">4")'), 2) })
test('teks dan IF', () => { assert.equal(ev('IF(A1>3,"BANYAK","SEDIKIT")'), 'BANYAK'); assert.equal(ev('A4&" "&A1'), 'abc 5'); assert.equal(ev('UPPER(A4)'), 'ABC') })
test('galat seperti Excel', () => {
  assert.equal(ev('1/0'), '#DIV/0!'); assert.equal(ev('FOO(1)'), '#NAME?'); assert.equal(ev('Z9'), '#REF!')
  assert.equal(ev('IFERROR(A1/0,"x")'), 'x')
})
test('kode berbahaya tidak dijalankan (tanpa eval)', () => {
  globalThis.__bocor = false
  const r = ev('(globalThis.__bocor=true)')
  assert.equal(globalThis.__bocor, false); assert.ok(String(r).startsWith('#'))
})
