var webdb = require('../../index.js')

var db

beforeEach(async function () {
  db = await webdb('http://admin:mysecretpassword@localhost:5984')
  await db('spec').drop()
})

//
// INSERT
//

test('insert single document', async function ({ t }) {
  var doc = await db('spec').set({ name: 'A' })
  t.ok(doc.id)
})

test('insert mutates object with id', async function ({ t }) {
  var obj = { name: 'A' }
  await db('spec').set(obj)
  t.ok(obj.id)
})

test('bulk insert via array', async function ({ t }) {
  var docs = [{ a: 1 }, { a: 2 }]
  var out = await db('spec').set(docs)
  t.equal(out.length, 2)
  t.ok(out[0].id && out[1].id)
})

//
// QUERY: equality / missing / null
//

test('eq matches existing field', async function ({ t }) {
  await db('spec').set({ a: 1 })
  t.ok(await db('spec').get({ a: 1 }))
})

test('eq fails on missing field', async function ({ t }) {
  await db('spec').set({ a: 1 })
  t.equal(await db('spec').get({ b: 1 }), null)
})

test('null distinct from missing', async function ({ t }) {
  await db('spec').set([{ a: null }, {}])
  t.equal((await db('spec').all({ a: null })).length, 1)
})

//
// COMPARISONS
//

test('$gt $gte $lt $lte', async function ({ t }) {
  await db('spec').index({ index: { fields: ['n'] } })
  await db('spec').set([{ n: 1 }, { n: 2 }, { n: 3 }])

  t.equal(await db('spec').count({ n: { $gt: 1 } }), 2)
  t.equal(await db('spec').count({ n: { $gte: 2 } }), 2)
  t.equal(await db('spec').count({ n: { $lt: 3 } }), 2)
  t.equal(await db('spec').count({ n: { $lte: 2 } }), 2)
})

//
// IN / NIN
//

test('$in', async function ({ t }) {
  await db('spec').index({ index: { fields: ['a'] } })
  await db('spec').set([{ a: 1 }, { a: 2 }])
  t.equal(await db('spec').count({ a: { $in: [2] } }), 1)
})

test('$nin matches existing non-equal only', async function ({ t }) {
  await db('spec').index({ index: { fields: ['a'] } })
  await db('spec').set([{ a: 1 }, { a: 2 }])
  t.equal(await db('spec').count({ a: { $nin: [1] } }), 1)
})

//
// REGEX
//

test('$regex string', async function ({ t }) {
  await db('spec').index({ index: { fields: ['a'] } })
  await db('spec').set([{ a: 'abc' }, { a: 'def' }])
  t.equal(await db('spec').count({ a: { $regex: '^a' } }), 1)
})

test('$regex non-string fails', async function ({ t }) {
  await db('spec').index({ index: { fields: ['a'] } })
  await db('spec').set({ a: 1 })
  t.equal(await db('spec').count({ a: { $regex: '1' } }), 0)
})

//
// EXISTS
//

test('$exists true', async function ({ t }) {
  await db('spec').index({ index: { fields: ['a'] } })
  await db('spec').set([{ a: null }, {}])
  t.equal(await db('spec').count({ a: { $exists: true } }), 1)
})

test('$exists false', async function ({ t }) {
  await db('spec').index({ index: { fields: ['a'] } })
  await db('spec').set([{ a: null }, {}])
  t.equal(await db('spec').count({ a: { $exists: false } }), 1)
})

//
// LOGICAL OPERATORS
//

test('$and', async function ({ t }) {
  await db('spec').index({ index: { fields: ['a', 'b'] } })
  await db('spec').set([
    { a: 1, b: 1 },
    { a: 1, b: 2 }
  ])
  t.equal(await db('spec').count({ $and: [{ a: 1 }, { b: 2 }] }), 1)
})

test('$or', async function ({ t }) {
  await db('spec').index({ index: { fields: ['a'] } })
  await db('spec').index({ index: { fields: ['b'] } })
  await db('spec').set([{ a: 1 }, { b: 1 }])
  t.equal(await db('spec').count({ $or: [{ a: 1 }, { b: 1 }] }), 2)
})

test('$not', async function ({ t }) {
  await db('spec').index({ index: { fields: ['a'] } })
  await db('spec').set([{ a: 1 }, { a: 2 }])
  t.equal(await db('spec').count({ $not: { a: 1 } }), 1)
})

//
// SORT / SKIP / LIMIT
//

test('sort ascending', async function ({ t }) {
  await db('spec').index({ index: { fields: ['a'] } })
  await db('spec').set([{ a: 2 }, { a: 1 }])
  t.equal((await db('spec').all({}, { sort: { a: 1 } }))[0].a, 1)
})

test('skip + limit', async function ({ t }) {
  await db('spec').set([{ n: 1 }, { n: 2 }, { n: 3 }])
  t.equal((await db('spec').all({}, { skip: 1, limit: 1 })).length, 1)
})

//
// PROJECTION
//

test('fields include only', async function ({ t }) {
  await db('spec').set({ a: 1, b: 2 })
  var keys = Object.keys((await db('spec').all({}, { fields: { a: true } }))[0])
  t.deepEqual(keys.sort(), ['a', 'id'])
})

//
// COUNT
//

test('count returns only count', async function ({ t }) {
  await db('spec').set([{ a: 1 }, { a: 1 }])
  t.equal(await db('spec').count({ a: 1 }), 2)
})

//
// UPDATE
//

test('update shallow merge', async function ({ t }) {
  await db('spec').set({ a: 1, b: 2 })
  t.equal((await db('spec').set({ a: 1 }, { b: 3 })).n, 1)
})

test('update undefined removes field', async function ({ t }) {
  await db('spec').set({ a: 1, b: 2 })
  await db('spec').set({ a: 1 }, { b: undefined })
  t.equal('b' in (await db('spec').get({ a: 1 })), false)
})

test('update null sets null', async function ({ t }) {
  await db('spec').set({ a: 1 })
  await db('spec').set({ a: 1 }, { b: null })
  t.ok((await db('spec').get({ a: 1 })).hasOwnProperty('b'))
})

//
// DELETE
//

test('delete via set(query, null)', async function ({ t }) {
  await db('spec').set({ a: 1 })
  t.equal((await db('spec').set({ a: 1 }, null)).n, 1)
})

test('clear via set({}, null)', async function ({ t }) {
  await db('spec').set([{ a: 1 }, { a: 2 }])
  await db('spec').set({}, null)
  t.equal(await db('spec').count({}), 0)
})
