var webdb = require('../../index.js')

var db

beforeEach(async function () {
  db = await webdb('http://admin:mysecretpassword@localhost:5984')
  await db('spec').drop()
})

test('list returns matching documents', async function ({ t }) {
  await db('spec').insert([
    { id: 'a', n: 1 },
    { id: 'b', n: 1 },
    { id: 'c', n: 2 }
  ])

  var res = await db('spec').list({ n: 1 })

  t.equal(res.length, 2)
  t.equal(res[0].n, 1)
  t.equal(res[1].n, 1)
})

test('list with empty query returns all documents', async function ({ t }) {
  await db('spec').insert([
    { id: 'a', n: 1 },
    { id: 'b', n: 2 }
  ])

  var res = await db('spec').list({})

  t.equal(res.length, 2)
})

test('list respects limit option', async function ({ t }) {
  await db('spec').insert([
    { id: 'a', n: 1 },
    { id: 'b', n: 2 },
    { id: 'c', n: 3 }
  ])

  var res = await db('spec').list({}, { limit: 2 })

  t.equal(res.length, 2)
})

test('list respects skip option', async function ({ t }) {
  await db('spec').insert([
    { id: 'a', n: 1 },
    { id: 'b', n: 2 },
    { id: 'c', n: 3 }
  ])

  var res = await db('spec').list({}, { sort: { n: 1 }, skip: 1 })

  t.equal(res.length, 2)
  t.equal(res[0].id, 'b')
})

test('list respects sort option', async function ({ t }) {
  await db('spec').insert([
    { id: 'a', n: 1 },
    { id: 'b', n: 3 },
    { id: 'c', n: 2 }
  ])

  var res = await db('spec').list({}, { sort: { n: -1 } })

  t.equal(res[0].n, 3)
  t.equal(res[1].n, 2)
  t.equal(res[2].n, 1)
})

test('list respects fields option', async function ({ t }) {
  await db('spec').insert([{ id: 'a', n: 1, x: 1 }])

  var res = await db('spec').list({}, { fields: { n: true } })

  t.equal(res.length, 1)
  t.equal(res[0].n, 1)
  t.equal('x' in res[0], false)
  t.ok(res[0].id)
})

test('list returns empty array when no matches', async function ({ t }) {
  await db('spec').insert([{ id: 'a', n: 1 }])

  var res = await db('spec').list({ n: 999 })

  t.equal(res.length, 0)
})

test('list on empty database returns empty array', async function ({ t }) {
  var res = await db('spec').list({})
  t.equal(res.length, 0)
})
