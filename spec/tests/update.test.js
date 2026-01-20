var webdb = require('../../index.js')

var db

beforeEach(async function () {
  db = await webdb('http://admin:mysecretpassword@localhost:5984')
  await db('spec').drop()
})

test('update modifies matching documents', async function ({ t }) {
  await db('spec').insert([
    { id: 'a', n: 1 },
    { id: 'b', n: 1 }
  ])

  var res = await db('spec').update({ n: 1 }, { n: 2 })

  t.equal(res.n, 2)

  var a = await db('spec').get({ id: 'a' })
  var b = await db('spec').get({ id: 'b' })

  t.equal(a.n, 2)
  t.equal(b.n, 2)
})

test('update removes null properties', async function ({ t }) {
  await db('spec').insert([
    { id: 'a', n: 1, x: 1 },
    { id: 'b', n: 1, x: 1 }
  ])

  await db('spec').update({ n: 1 }, { x: null })

  var a = await db('spec').get({ id: 'a' })
  var b = await db('spec').get({ id: 'b' })

  t.equal('x' in a, false)
  t.equal('x' in b, false)
})

test('update returns number of modified documents', async function ({ t }) {
  await db('spec').insert([
    { id: 'a', n: 1 },
    { id: 'b', n: 2 }
  ])

  var res = await db('spec').update({ n: 1 }, { n: 3 })

  t.equal(res.n, 1)
})

test('update with no matches returns n = 0', async function ({ t }) {
  await db('spec').insert([{ id: 'a', n: 1 }])

  var res = await db('spec').update({ n: 999 }, { n: 2 })

  t.equal(res.n, 0)
})

test('update does not create new documents', async function ({ t }) {
  await db('spec').update({ n: 1 }, { n: 2 })
  var doc = await db('spec').get({})
  t.equal(doc, null)
})
