var webdb = require('../../index.js')

var db

beforeEach(async function () {
  db = await webdb('http://admin:mysecretpassword@localhost:5984')
  await db('spec').drop()
})

test('get returns single matching document', async function ({ t }) {
  var doc = await db('spec').set({ id: 'x', name: 'a' })
  var res = await db('spec').get({ id: 'x' })
  t.equal(res.id, doc.id)
  t.equal(res.name, 'a')
})

test('get returns null when no match', async function ({ t }) {
  var res = await db('spec').get({ id: 'missing' })
  t.equal(res, null)
})

test('get with empty query returns a document', async function ({ t }) {
  await db('spec').set({ id: 'x', name: 'a' })
  var res = await db('spec').get({})
  t.ok(res)
  t.ok(res.id)
})

test('get respects fields option', async function ({ t }) {
  await db('spec').set({ id: 'x', name: 'a', value: 1 })
  var res = await db('spec').get({ id: 'x' }, { fields: { name: true } })
  t.equal(res.name, 'a')
  t.equal('value' in res, false)
  t.ok(res.id)
})

test('get respects sort option', async function ({ t }) {
  await db('spec').set({ id: 'a', n: 1 })
  await db('spec').set({ id: 'b', n: 2 })
  var res = await db('spec').get({}, { sort: { n: -1 } })
  t.equal(res.id, 'b')
})

test('get respects skip option', async function ({ t }) {
  await db('spec').set({ id: 'a', n: 1 })
  await db('spec').set({ id: 'b', n: 2 })
  var res = await db('spec').get({}, { sort: { n: 1 }, skip: 1 })
  t.equal(res.id, 'b')
})

test('get respects limit option', async function ({ t }) {
  await db('spec').set({ id: 'a', n: 1 })
  await db('spec').set({ id: 'b', n: 2 })
  var res = await db('spec').get({}, { sort: { n: 1 }, limit: 1 })
  t.equal(res.id, 'a')
})
