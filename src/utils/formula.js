// Mesin rumus aman (tanpa eval / new Function): tokenizer -> parser -> evaluator.
// Dipakai DataTable. Dukungan: + - * / ^ % & , perbandingan (= <> < <= > >=), teks "..." , TRUE/FALSE,
// rujukan sel (A1), rentang (A1:C5), dan fungsi di FN di bawah. Galat mengikuti Excel (#DIV/0!, #NAME?, #VALUE!, #REF!, #ERROR!).

const num = (v) => { if (typeof v === 'number') return v; if (typeof v === 'boolean') return v ? 1 : 0; const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0 }
const isN = (x) => x !== '' && x != null && typeof x !== 'boolean' && Number.isFinite(Number(x))
const str = (v) => (typeof v === 'boolean' ? (v ? 'TRUE' : 'FALSE') : String(v ?? ''))
const flat = (a) => a.flat(9)
class XlErr extends Error { constructor(code) { super(code); this.code = code } }
const err = (c) => { throw new XlErr(c) }

const crit = (c) => { // kriteria COUNTIF/SUMIF: angka, ">5", "<>x", "a*" (wildcard)
  const m = typeof c === 'string' && c.match(/^(>=|<=|<>|>|<|=)?(.*)$/s), op = m ? m[1] || '=' : '=', v = m ? m[2] : c
  return (x) => {
    const both = isN(x) && isN(v), a = both ? Number(x) : String(x ?? '').toLowerCase(), b = both ? Number(v) : String(v ?? '').toLowerCase()
    if (op === '=' || op === '<>') { const eq = both || !/[*?]/.test(b) ? a === b : new RegExp('^' + b.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$').test(a); return op === '=' ? eq : !eq }
    if (!both && isN(v)) return false   // seperti Excel: teks tidak ikut dihitung pada kriteria angka (>4)
    return op === '>' ? a > b : op === '<' ? a < b : op === '>=' ? a >= b : a <= b
  }
}
const pad = (n) => String(n).padStart(2, '0')
const serial = (d) => Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(1899, 11, 30)) / 864e5)
const iso = (s) => { const m = String(s ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null }

export const FN = {
  SUM: (...a) => flat(a).reduce((s, x) => s + (isN(x) ? Number(x) : 0), 0),
  AVERAGE: (...a) => { const f = flat(a).filter(isN); return f.length ? f.reduce((s, x) => s + Number(x), 0) / f.length : err('#DIV/0!') },
  MIN: (...a) => { const f = flat(a).filter(isN).map(Number); return f.length ? Math.min(...f) : 0 },
  MAX: (...a) => { const f = flat(a).filter(isN).map(Number); return f.length ? Math.max(...f) : 0 },
  COUNT: (...a) => flat(a).filter(isN).length,
  COUNTA: (...a) => flat(a).filter((x) => x !== '' && x != null).length,
  COUNTBLANK: (...a) => flat(a).filter((x) => x === '' || x == null).length,
  COUNTIF: (r, c) => flat([r]).filter(crit(c)).length,
  SUMIF: (r, c, s) => { const t = flat([r]), u = s === undefined ? t : flat([s]), f = crit(c); return t.reduce((n, x, i) => n + (f(x) && isN(u[i]) ? Number(u[i]) : 0), 0) },
  IF: (c, a = true, b = false) => (c ? a : b),
  IFERROR: (a, b) => a,       // galat sudah ditangani di evaluator (lihat lazy di bawah)
  ROUND: (x, n = 0) => { const k = 10 ** n; return Math.round((num(x) + Number.EPSILON) * k) / k },
  ROUNDUP: (x, n = 0) => { const k = 10 ** n; return (num(x) < 0 ? -1 : 1) * Math.ceil(Math.abs(num(x)) * k - 1e-9) / k },
  ROUNDDOWN: (x, n = 0) => { const k = 10 ** n; return (num(x) < 0 ? -1 : 1) * Math.floor(Math.abs(num(x)) * k + 1e-9) / k },
  INT: (x) => Math.floor(num(x)), ABS: (x) => Math.abs(num(x)), SQRT: (x) => (num(x) < 0 ? err('#NUM!') : Math.sqrt(num(x))),
  MOD: (x, y) => (num(y) === 0 ? err('#DIV/0!') : num(x) - num(y) * Math.floor(num(x) / num(y))),
  POWER: (x, y) => num(x) ** num(y),
  UPPER: (x) => str(x).toUpperCase(), LOWER: (x) => str(x).toLowerCase(), LEN: (x) => str(x).length,
  PROPER: (x) => str(x).toLowerCase().replace(/(^|[^a-z0-9])([a-z])/g, (_, a, b) => a + b.toUpperCase()),
  TRIM: (x) => str(x).trim().replace(/\s+/g, ' '),
  CONCAT: (...a) => flat(a).map(str).join(''), CONCATENATE: (...a) => flat(a).map(str).join(''),
  LEFT: (x, n = 1) => str(x).slice(0, Math.max(0, num(n))), RIGHT: (x, n = 1) => (num(n) > 0 ? str(x).slice(-num(n)) : ''),
  MID: (x, s, n) => str(x).substr(Math.max(0, num(s) - 1), Math.max(0, num(n))),
  FIND: (f, t, s = 1) => { const i = str(t).indexOf(str(f), num(s) - 1); return i < 0 ? err('#VALUE!') : i + 1 },
  SEARCH: (f, t, s = 1) => { const i = str(t).toLowerCase().indexOf(str(f).toLowerCase(), num(s) - 1); return i < 0 ? err('#VALUE!') : i + 1 },
  SUBSTITUTE: (t, a, b) => (str(a) ? str(t).split(str(a)).join(str(b)) : str(t)),
  REPT: (x, n) => str(x).repeat(Math.max(0, Math.min(1000, num(n)))),
  VALUE: (x) => (isN(x) ? Number(x) : err('#VALUE!')),
  TEXT: (x, f) => { const n = num(x), d = (str(f).match(/0\.(0+)/)?.[1].length) || 0; return str(f).includes('%') ? (n * 100).toFixed(d) + '%' : /,/.test(str(f)) ? n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : n.toFixed(d) },
  AND: (...a) => flat(a).every(Boolean), OR: (...a) => flat(a).some(Boolean), NOT: (x) => !x,
  ISBLANK: (x) => x === '' || x == null, ISNUMBER: (x) => typeof x === 'number' || isN(x), ISTEXT: (x) => typeof x === 'string' && !isN(x) && x !== '',
  TODAY: () => serial(new Date()), NOW: () => serial(new Date()) + (Date.now() - new Date().setHours(0, 0, 0, 0)) / 864e5,
  DATE: (y, m, d) => serial(new Date(num(y), num(m) - 1, num(d))),
  DAYS: (a, b) => { const x = iso(a), y = iso(b); return x && y ? Math.round((serial(x) - serial(y))) : isN(a) && isN(b) ? num(a) - num(b) : err('#VALUE!') },
  YEAR: (x) => (iso(x) || err('#VALUE!')).getFullYear(), MONTH: (x) => (iso(x) || err('#VALUE!')).getMonth() + 1, DAY: (x) => (iso(x) || err('#VALUE!')).getDate(),
  // tanggal dalam sel disimpan yyyy-mm-dd; hasil tanggal dikembalikan dengan format yang sama
  EDATE: (x, m) => { const d = iso(x) || err('#VALUE!'), e = new Date(d.getFullYear(), d.getMonth() + num(m), 1); e.setDate(Math.min(d.getDate(), new Date(e.getFullYear(), e.getMonth() + 1, 0).getDate())); return `${e.getFullYear()}-${pad(e.getMonth() + 1)}-${pad(e.getDate())}` },
}
const LAZY = new Set(['IF', 'IFERROR'])
const NAMES = Object.keys(FN).sort((a, b) => b.length - a.length)

// ---------- tokenizer ----------
function lex(s) {
  const t = []; let i = 0
  while (i < s.length) {
    const c = s[i]
    if (c === ' ' || c === '\t') { i++; continue }
    if (c === '"') { let j = i + 1, v = ''; for (; j < s.length; j++) { if (s[j] === '"') { if (s[j + 1] === '"') { v += '"'; j++; continue } break } v += s[j] } if (j >= s.length) err('#ERROR!'); t.push({ k: 's', v }); i = j + 1; continue }
    const n = s.slice(i).match(/^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i); if (n) { t.push({ k: 'n', v: parseFloat(n[0]) }); i += n[0].length; continue }
    const w = s.slice(i).match(/^[A-Za-z_][A-Za-z0-9_.]*/)
    if (w) { t.push({ k: 'w', v: w[0].toUpperCase() }); i += w[0].length; continue }
    const o = s.slice(i, i + 2); if (['<>', '<=', '>='].includes(o)) { t.push({ k: 'o', v: o }); i += 2; continue }
    if ('+-*/^%&=<>(),:'.includes(c)) { t.push({ k: 'o', v: c }); i++; continue }
    err('#ERROR!')
  }
  return t
}

// ---------- parser (rekursif, prioritas operator seperti Excel) ----------
// perbandingan < & < +- < */ < ^ < unary - < %
export function parse(src) {
  const t = lex(src); let p = 0
  const peek = () => t[p], eat = (v) => { if (t[p]?.k === 'o' && t[p].v === v) { p++; return true } return false }
  const expect = (v) => { if (!eat(v)) err('#ERROR!') }
  const bin = (next, ops) => () => { let l = next(); for (;;) { const x = peek(); if (x?.k === 'o' && ops.includes(x.v)) { p++; l = { t: 'bin', op: x.v, l, r: next() } } else return l } }
  const primary = () => {
    const x = t[p++]; if (!x) err('#ERROR!')
    if (x.k === 'n') return { t: 'lit', v: x.v }
    if (x.k === 's') return { t: 'lit', v: x.v }
    if (x.k === 'o' && x.v === '(') { const e = cmp(); expect(')'); return e }
    if (x.k === 'w') {
      if (peek()?.k === 'o' && peek().v === '(') { // fungsi
        p++; const args = []
        if (!eat(')')) { do { args.push(peek()?.v === ',' || peek()?.v === ')' ? { t: 'lit', v: '' } : cmp()) } while (eat(',')); expect(')') }
        if (!FN[x.v]) err('#NAME?')
        return { t: 'fn', name: x.v, args }
      }
      if (x.v === 'TRUE' || x.v === 'FALSE') return { t: 'lit', v: x.v === 'TRUE' }
      const m = x.v.match(/^([A-Z])(\d+)$/); if (!m) err('#NAME?')
      let a = { t: 'ref', c: m[1], r: +m[2] }
      if (eat(':')) { const y = t[p++], m2 = y?.k === 'w' && y.v.match(/^([A-Z])(\d+)$/); if (!m2) err('#ERROR!'); a = { t: 'rng', c1: m[1], r1: +m[2], c2: m2[1], r2: +m2[2] } }
      return a
    }
    return err('#ERROR!')
  }
  const pct = () => { let e = primary(); while (eat('%')) e = { t: 'pct', e }; return e }
  const un = () => (eat('-') ? { t: 'neg', e: un() } : eat('+') ? un() : pct())
  const pow = bin(un, ['^']), mul = bin(pow, ['*', '/']), add = bin(mul, ['+', '-']), cat = bin(add, ['&']), cmp = bin(cat, ['=', '<>', '<', '<=', '>', '>='])
  const ast = cmp(); if (p < t.length) err('#ERROR!')
  return ast
}

// ---------- evaluator ----------
// ctx.cell(colLetter, rowNumber) -> nilai sel (lempar XlErr bila galat)
function ev(n, ctx) {
  switch (n.t) {
    case 'lit': return n.v
    case 'ref': return ctx.cell(n.c, n.r)
    case 'rng': { const o = []; for (let r = Math.min(n.r1, n.r2); r <= Math.max(n.r1, n.r2); r++) for (let c = Math.min(n.c1.charCodeAt(0), n.c2.charCodeAt(0)); c <= Math.max(n.c1.charCodeAt(0), n.c2.charCodeAt(0)); c++) { try { o.push(ctx.cell(String.fromCharCode(c), r)) } catch (e) { if (e instanceof XlErr && e.code === '#REF!') o.push(''); else throw e } } return o }
    case 'neg': return -num(ev(n.e, ctx))
    case 'pct': return num(ev(n.e, ctx)) / 100
    case 'bin': {
      const a = ev(n.l, ctx), b = ev(n.r, ctx)
      switch (n.op) {
        case '+': return num(a) + num(b)
        case '-': return num(a) - num(b)
        case '*': return num(a) * num(b)
        case '/': return num(b) === 0 ? err('#DIV/0!') : num(a) / num(b)
        case '^': return num(a) ** num(b)
        case '&': return str(a) + str(b)
        default: {
          const both = isN(a) && isN(b), x = both ? Number(a) : str(a).toLowerCase(), y = both ? Number(b) : str(b).toLowerCase()
          return n.op === '=' ? x === y : n.op === '<>' ? x !== y : n.op === '<' ? x < y : n.op === '<=' ? x <= y : n.op === '>' ? x > y : x >= y
        }
      }
    }
    case 'fn': {
      if (n.name === 'IF') { const c = ev(n.args[0] ?? { t: 'lit', v: '' }, ctx); return c ? (n.args[1] ? ev(n.args[1], ctx) : true) : (n.args[2] ? ev(n.args[2], ctx) : false) }
      if (n.name === 'IFERROR') { try { const v = ev(n.args[0], ctx); return typeof v === 'string' && v[0] === '#' ? (n.args[1] ? ev(n.args[1], ctx) : '') : v } catch (e) { if (e instanceof XlErr) return n.args[1] ? ev(n.args[1], ctx) : ''; throw e } }
      return FN[n.name](...n.args.map((a) => ev(a, ctx)))
    }
    default: return err('#ERROR!')
  }
}

const cache = new Map() // AST per teks rumus (parse sekali, dipakai ulang)
export function evaluate(src, ctx) {
  try {
    let ast = cache.get(src)
    if (!ast) { ast = parse(src); if (cache.size > 2000) cache.clear(); cache.set(src, ast) }
    const r = ev(ast, ctx)
    if (Array.isArray(r)) return '#VALUE!'
    if (typeof r === 'number') return Number.isFinite(r) ? Number(r.toFixed(10)) : '#NUM!'
    if (typeof r === 'boolean') return r ? 'TRUE' : 'FALSE'
    return String(r ?? '')
  } catch (e) { return e instanceof XlErr ? e.code : '#ERROR!' }
}
export { XlErr, LAZY, NAMES }
