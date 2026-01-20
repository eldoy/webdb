var webdb = require('../../index.js')

var db

beforeEach(async function () {
  db = await webdb('http://admin:mysecretpassword@localhost:5984')
  await db('spec').drop()
})

test('remove deletes matching documents', async function ({ t }) {
  await db('spec').insert([
    { id: 'a', n: 1 },
    { id: 'b', n: 1 },
    { id: 'c', n: 2 }
  ])

  var res = await db('spec').remove({ n: 1 })

  t.equal(res.n, 2)

  var a = await db('spec').get({ id: 'a' })
  var b = await db('spec').get({ id: 'b' })
  var c = await db('spec').get({ id: 'c' })

  t.equal(a, null)
  t.equal(b, null)
  t.equal(c.n, 2)
})

test('remove with empty query removes all documents', async function ({ t }) {
  await db('spec').insert([
    { id: 'a', n: 1 },
    { id: 'b', n: 2 }
  ])

  var res = await db('spec').remove({})

  t.equal(res.n, 2)

  var doc = await db('spec').get({})
  t.equal(doc, null)
})

test('remove returns n = 0 when no documents match', async function ({ t }) {
  await db('spec').insert([{ id: 'a', n: 1 }])

  var res = await db('spec').remove({ n: 999 })

  t.equal(res.n, 0)
})

test('remove does not throw on empty database', async function ({ t }) {
  var res = await db('spec').remove({ n: 1 })
  t.equal(res.n, 0)
})

test('remove does not affect non-matching documents', async function ({ t }) {
  await db('spec').insert([
    { id: 'a', type: 'x' },
    { id: 'b', type: 'y' }
  ])

  await db('spec').remove({ type: 'x' })

  var a = await db('spec').get({ id: 'a' })
  var b = await db('spec').get({ id: 'b' })

  t.equal(a, null)
  t.equal(b.type, 'y')
})
