var webdb = require('../../index.js')
var db = webdb('http://admin:mysecretpassword@localhost:5984')

var name = 'spec'
var collection

async function createIndex(fields) {
  await collection.data.createIndex({
    index: { fields: fields }
  })
}

beforeEach(async function () {
  collection = db(name)
  await collection.drop()
})

//
// INSERT
//

test('insert single document', async function ({ t }) {
  var doc = await collection.set({ name: 'A' })
  t.ok(doc.id)
})

test('insert mutates object with id', async function ({ t }) {
  var obj = { name: 'A' }
  await collection.set(obj)
  t.ok(obj.id)
})

test('bulk insert via array', async function ({ t }) {
  var docs = [{ a: 1 }, { a: 2 }]
  var out = await collection.set(docs)
  t.equal(out.length, 2)
  t.ok(out[0].id && out[1].id)
})

//
// QUERY: equality / missing / null
//

test('eq matches existing field', async function ({ t }) {
  await collection.set({ a: 1 })
  var r = await collection.get({ a: 1 })
  t.ok(r)
})

test('eq fails on missing field', async function ({ t }) {
  await collection.set({ a: 1 })
  var r = await collection.get({ b: 1 })
  t.equal(r, null)
})

test('null distinct from missing', async function ({ t }) {
  await collection.set([{ a: null }, {}])
  var r = await collection.all({ a: null })
  t.equal(r.length, 1)
})

//
// COMPARISONS
//

test('$gt $gte $lt $lte', async function ({ t }) {
  await createIndex(['n'])
  await collection.set([{ n: 1 }, { n: 2 }, { n: 3 }])

  t.equal(await collection.count({ n: { $gt: 1 } }), 2)
  t.equal(await collection.count({ n: { $gte: 2 } }), 2)
  t.equal(await collection.count({ n: { $lt: 3 } }), 2)
  t.equal(await collection.count({ n: { $lte: 2 } }), 2)
})

//
// IN / NIN
//

test('$in', async function ({ t }) {
  await createIndex(['a'])
  await collection.set([{ a: 1 }, { a: 2 }])
  t.equal(await collection.count({ a: { $in: [2] } }), 1)
})

test('$nin matches existing non-equal only', async function ({ t }) {
  await createIndex(['a'])
  await collection.set([{ a: 1 }, { a: 2 }])
  t.equal(await collection.count({ a: { $nin: [1] } }), 1)
})

//
// REGEX
//

test('$regex string', async function ({ t }) {
  await createIndex(['a'])
  await collection.set([{ a: 'abc' }, { a: 'def' }])
  t.equal(await collection.count({ a: { $regex: '^a' } }), 1)
})

test('$regex non-string fails', async function ({ t }) {
  await createIndex(['a'])
  await collection.set({ a: 1 })
  t.equal(await collection.count({ a: { $regex: '1' } }), 0)
})

//
// EXISTS
//

test('$exists true', async function ({ t }) {
  await createIndex(['a'])
  await collection.set([{ a: null }, {}])
  t.equal(await collection.count({ a: { $exists: true } }), 1)
})

test('$exists false', async function ({ t }) {
  await createIndex(['a'])
  await collection.set([{ a: null }, {}])
  t.equal(await collection.count({ a: { $exists: false } }), 1)
})

//
// LOGICAL OPERATORS
//

test('$and', async function ({ t }) {
  await createIndex(['a', 'b'])
  await collection.set([
    { a: 1, b: 1 },
    { a: 1, b: 2 }
  ])

  t.equal(await collection.count({ $and: [{ a: 1 }, { b: 2 }] }), 1)
})

test('$or', async function ({ t }) {
  await createIndex(['a'])
  await createIndex(['b'])
  await collection.set([{ a: 1 }, { b: 1 }])

  t.equal(await collection.count({ $or: [{ a: 1 }, { b: 1 }] }), 2)
})

test('$not', async function ({ t }) {
  await createIndex(['a'])
  await collection.set([{ a: 1 }, { a: 2 }])
  t.equal(await collection.count({ $not: { a: 1 } }), 1)
})

//
// SORT / SKIP / LIMIT
//

test('sort ascending', async function ({ t }) {
  await createIndex(['a'])
  await collection.set([{ a: 2 }, { a: 1 }])

  var out = await collection.all({}, { sort: { a: 1 } })
  t.equal(out[0].a, 1)
})

test('skip + limit', async function ({ t }) {
  await collection.set([{ n: 1 }, { n: 2 }, { n: 3 }])
  var out = await collection.all({}, { skip: 1, limit: 1 })
  t.equal(out.length, 1)
})

//
// PROJECTION
//

test('fields include only', async function ({ t }) {
  await collection.set({ a: 1, b: 2 })
  var out = await collection.all({}, { fields: { a: true } })
  t.deepEqual(Object.keys(out[0]).sort(), ['a', 'id'])
})

//
// COUNT
//

test('count returns only count', async function ({ t }) {
  await collection.set([{ a: 1 }, { a: 1 }])
  t.equal(await collection.count({ a: 1 }), 2)
})

//
// UPDATE
//

test('update shallow merge', async function ({ t }) {
  await collection.set({ a: 1, b: 2 })
  var r = await collection.set({ a: 1 }, { b: 3 })
  t.equal(r.n, 1)
})

test('update undefined removes field', async function ({ t }) {
  await collection.set({ a: 1, b: 2 })
  await collection.set({ a: 1 }, { b: undefined })
  var d = await collection.get({ a: 1 })
  t.equal('b' in d, false)
})

test('update null sets null', async function ({ t }) {
  await collection.set({ a: 1 })
  await collection.set({ a: 1 }, { b: null })
  var d = await collection.get({ a: 1 })
  t.ok(d.hasOwnProperty('b'))
})

//
// DELETE
//

test('delete via set(query, null)', async function ({ t }) {
  await collection.set({ a: 1 })
  var r = await collection.set({ a: 1 }, null)
  t.equal(r.n, 1)
})

test('clear via set({}, null)', async function ({ t }) {
  await collection.set([{ a: 1 }, { a: 2 }])
  await collection.set({}, null)
  t.equal(await collection.count({}), 0)
})
