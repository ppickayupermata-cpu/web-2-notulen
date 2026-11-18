import test from 'node:test'
import assert from 'node:assert/strict'
import { bandingkan, cariGrup, rowKey } from '../src/utils/diffRows.js'

const lama = [{ id: 'a', so: '1', soItem: '10', qty: '2', productName: 'X' }, { id: 'b', so: '1', soItem: '20', qty: '1', productName: 'Y' }]
test('baru / berubah / sama / hilang', () => {
  const d = bandingkan([{ so: '1', soItem: '10', qty: '2', productName: 'X' }, { so: '1', soItem: '20', qty: '5', productName: 'Y' }, { so: '1', soItem: '30', qty: '1', productName: 'Z' }], lama)
  assert.deepEqual(d.map((x) => x.kind), ['sama', 'berubah', 'baru']); assert.deepEqual(d[1].beda, ['qty'])
  assert.equal(bandingkan([{ so: '1', soItem: '10', qty: '2', productName: 'X' }], lama).hilang.map((r) => r.id).join(), 'b')
})
test('kunci baris tidak peka spasi/huruf besar', () => { assert.equal(rowKey({ so: ' 1 ', soItem: '10' }), rowKey({ so: '1', soItem: '10 ' })) })
test('baris kembar tetap dipasangkan satu-satu', () => {
  const d = bandingkan([{ so: '1', soItem: '10' }, { so: '1', soItem: '10' }], [{ id: 'a', so: '1', soItem: '10' }])
  assert.deepEqual(d.map((x) => x.kind), ['sama', 'baru'])
})
test('cari container tujuan', () => {
  const g = [{ id: 'g1', container: 'C1', packingListNo: 'P1' }]
  assert.equal(cariGrup({ container: 'C1' }, [], g, [])?.id, 'g1')
  assert.equal(cariGrup({ container: 'C9' }, [{ so: '1' }], g, [{ so: '1', groupId: 'g1' }])?.id, 'g1')
  assert.equal(cariGrup({ container: 'Q' }, [{ so: '9' }], g, []), null)
})
