var webdb = require('../../index.js')

var db

beforeEach(async function () {
  db = await webdb('http://admin:mysecretpassword@localhost:5984')
  await db('spec').drop()
})

test('count returns number of matching documents', async function ({ t }) {
  await db('spec').insert([
    { id: 'a', n: 1 },
    { id: 'b', n: 1 },
    { id: 'c', n: 2 }
  ])

  var n = await db('spec').count({ n: 1 })
  t.equal(n, 2)
})

test('count with empty query counts all documents', async function ({ t }) {
  await db('spec').insert([
    { id: 'a', n: 1 },
    { id: 'b', n: 2 }
  ])

  var n = await db('spec').count({})
  t.equal(n, 2)
})

test('count returns 0 when no documents match', async function ({ t }) {
  await db('spec').insert([{ id: 'a', n: 1 }])

  var n = await db('spec').count({ n: 999 })
  t.equal(n, 0)
})

test('count on empty database returns 0', async function ({ t }) {
  var n = await db('spec').count({})
  t.equal(n, 0)
})

test('count does not modify documents', async function ({ t }) {
  await db('spec').insert([{ id: 'a', n: 1 }])

  await db('spec').count({ n: 1 })
  var doc = await db('spec').get({ id: 'a' })

  t.equal(doc.n, 1)
})
