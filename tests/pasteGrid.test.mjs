import test from 'node:test'
import assert from 'node:assert/strict'
import { parseGrid, normDate, petaPaste } from '../src/utils/pasteGrid.js'

test('parseGrid: kolom (tab), baris (Enter), akhir Enter diabaikan', () => { assert.deepEqual(parseGrid('a\tb\nc\td\n'), [['a', 'b'], ['c', 'd']]); assert.deepEqual(parseGrid('x\ny'), [['x'], ['y']]) })
test('parseGrid: sel berkutip Excel berisi Enter dan tanda kutip', () => { assert.deepEqual(parseGrid('"a\nb"\t"c ""d"""\nz'), [['a\nb', 'c "d"'], ['z']]) })
test('normDate: berbagai penulisan -> YYYY-MM-DD', () => {
  for (const [i, o] of [['2026-10-25', '2026-10-25'], ['25/10/2026', '2026-10-25'], ['25-10-26', '2026-10-25'], ['25.10.2026', '2026-10-25'], ['5/1/2026', '2026-01-05'],
    ['25 Okt 2026', '2026-10-25'], ['25 Oktober 2026', '2026-10-25'], ['Minggu, 25 Oktober 2026', '2026-10-25'], ['25-Oct-2026', '2026-10-25'], ['46320', '2026-10-25'], [' 2026-10-25 ', '2026-10-25']]) assert.equal(normDate(i), o, i)
})
test('normDate: tidak valid -> kosong', () => { for (const x of ['', 'abc', '31/02/2026', '13/13/2026', '2026-02-30']) assert.equal(normDate(x), '', x) })
test('petaPaste: satu nilai mengisi seluruh pilihan', () => { assert.equal(petaPaste({ r0: 2, r1: 4, c0: 1, c1: 2 }, [['x']]).length, 6) })
test('petaPaste: banyak nilai dari sel kiri-atas; pilihan kelipatan = diulang', () => {
  assert.deepEqual(petaPaste({ r0: 0, r1: 0, c0: 3, c1: 3 }, [['a', 'b'], ['c', 'd']]).map((x) => [x.i, x.c, x.v]), [[0, 3, 'a'], [0, 4, 'b'], [1, 3, 'c'], [1, 4, 'd']])
  const t = petaPaste({ r0: 0, r1: 3, c0: 0, c1: 0 }, [['a'], ['b']]); assert.deepEqual(t.map((x) => x.v), ['a', 'b', 'a', 'b'])
})
