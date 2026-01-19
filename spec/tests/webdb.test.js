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
  await collection.get({ a: null }, {}, function (b) {
    t.equal(b.length, 1)
  })
})

//
// COMPARISONS
//

test('$gt $gte $lt $lte', async function ({ t }) {
  await createIndex(['n'])
  await collection.set([{ n: 1 }, { n: 2 }, { n: 3 }])

  t.equal((await collection.get({ n: { $gt: 1 } }, { count: true })).count, 2)
  t.equal((await collection.get({ n: { $gte: 2 } }, { count: true })).count, 2)
  t.equal((await collection.get({ n: { $lt: 3 } }, { count: true })).count, 2)
  t.equal((await collection.get({ n: { $lte: 2 } }, { count: true })).count, 2)
})

//
// IN / NIN
//

test('$in', async function ({ t }) {
  await createIndex(['a'])
  await collection.set([{ a: 1 }, { a: 2 }])
  t.equal((await collection.get({ a: { $in: [2] } }, { count: true })).count, 1)
})

test('$nin matches existing non-equal only', async function ({ t }) {
  await createIndex(['a'])
  await collection.set([{ a: 1 }, { a: 2 }])
  t.equal(
    (await collection.get({ a: { $nin: [1] } }, { count: true })).count,
    1
  )
})

//
// REGEX
//

test('$regex string', async function ({ t }) {
  await createIndex(['a'])
  await collection.set([{ a: 'abc' }, { a: 'def' }])
  t.equal(
    (await collection.get({ a: { $regex: '^a' } }, { count: true })).count,
    1
  )
})

test('$regex non-string fails', async function ({ t }) {
  await createIndex(['a'])
  await collection.set({ a: 1 })
  t.equal(
    (await collection.get({ a: { $regex: '1' } }, { count: true })).count,
    0
  )
})

//
// EXISTS
//

test('$exists true', async function ({ t }) {
  await createIndex(['a'])
  await collection.set([{ a: null }, {}])
  t.equal(
    (await collection.get({ a: { $exists: true } }, { count: true })).count,
    1
  )
})

test('$exists false', async function ({ t }) {
  await createIndex(['a'])
  await collection.set([{ a: null }, {}])
  t.equal(
    (await collection.get({ a: { $exists: false } }, { count: true })).count,
    1
  )
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

  t.equal(
    (await collection.get({ $and: [{ a: 1 }, { b: 2 }] }, { count: true }))
      .count,
    1
  )
})

test('$or', async function ({ t }) {
  await createIndex(['a'])
  await createIndex(['b'])
  await collection.set([{ a: 1 }, { b: 1 }])

  t.equal(
    (await collection.get({ $or: [{ a: 1 }, { b: 1 }] }, { count: true }))
      .count,
    2
  )
})

test('$not', async function ({ t }) {
  await createIndex(['a'])
  await collection.set([{ a: 1 }, { a: 2 }])
  t.equal((await collection.get({ $not: { a: 1 } }, { count: true })).count, 1)
})

//
// SORT / SKIP / LIMIT
//

test('sort ascending', async function ({ t }) {
  await createIndex(['a'])
  await collection.set([{ a: 2 }, { a: 1 }])

  var out = []
  await collection.get({}, { sort: { a: 1 } }, function (b) {
    out.push.apply(out, b)
  })

  t.equal(out[0].a, 1)
})

test('skip + limit', async function ({ t }) {
  await collection.set([{ n: 1 }, { n: 2 }, { n: 3 }])
  var out = []

  await collection.get({}, { skip: 1, limit: 1 }, function (b) {
    out.push.apply(out, b)
  })

  t.equal(out.length, 1)
})

//
// PROJECTION
//

test('fields include only', async function ({ t }) {
  await collection.set({ a: 1, b: 2 })
  var out = []

  await collection.get({}, { fields: { a: true } }, function (b) {
    out.push.apply(out, b)
  })

  t.deepEqual(Object.keys(out[0]), ['a', 'id'])
})

//
// COUNT
//

test('count returns only count', async function ({ t }) {
  await collection.set([{ a: 1 }, { a: 1 }])
  var r = await collection.get({ a: 1 }, { count: true })
  t.equal(r.count, 2)
})

//
// STREAMING / BATCH
//

test('batch streaming obeys size and limit', async function ({ t }) {
  await collection.set([{ n: 1 }, { n: 2 }, { n: 3 }])
  var out = []

  await collection.get({}, { batch: 1, limit: 2 }, function (b) {
    out.push(b[0].n)
  })

  t.deepEqual(out, [1, 2])
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
  t.equal(d.b, undefined)
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
  t.equal((await collection.get({}, { count: true })).count, 0)
})
