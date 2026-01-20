var webdb = require('../../index.js')

var db

beforeEach(async function () {
  db = await webdb('http://admin:mysecretpassword@localhost:5984')
  await db('spec').drop()
})

test('insert inserts multiple documents', async function ({ t }) {
  var res = await db('spec').insert([{ name: 'a' }, { name: 'b' }])

  t.equal(res.length, 2)
  t.ok(res[0].id)
  t.ok(res[1].id)
})

test('insert preserves input order', async function ({ t }) {
  var res = await db('spec').insert([
    { name: 'a' },
    { name: 'b' },
    { name: 'c' }
  ])

  var a = await db('spec').get({ id: res[0].id })
  var b = await db('spec').get({ id: res[1].id })
  var c = await db('spec').get({ id: res[2].id })

  t.equal(a.name, 'a')
  t.equal(b.name, 'b')
  t.equal(c.name, 'c')
})

test('insert generates id when missing', async function ({ t }) {
  var res = await db('spec').insert([{ name: 'a' }])
  t.ok(res[0].id)
})

test('insert respects provided id', async function ({ t }) {
  var res = await db('spec').insert([{ id: 'x', name: 'a' }])
  var stored = await db('spec').get({ id: 'x' })

  t.equal(res[0].id, 'x')
  t.equal(stored.name, 'a')
})

test('insert removes null properties', async function ({ t }) {
  var res = await db('spec').insert([{ name: 'a', value: null }])
  var stored = await db('spec').get({ id: res[0].id })

  t.equal('value' in stored, false)
})

test('insert returns rev when available', async function ({ t }) {
  var res = await db('spec').insert([{ name: 'a' }])
  t.ok(res[0].rev)
})

test('insert inserts into empty database after drop', async function ({ t }) {
  await db('spec').drop()
  var res = await db('spec').insert([{ name: 'a' }])
  var stored = await db('spec').get({ id: res[0].id })

  t.equal(stored.name, 'a')
})
