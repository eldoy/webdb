var webdb = require('../../index.js')
var db = webdb('http://admin:mysecretpassword@localhost:5984')

beforeEach(async function ({ t }) {
  await db.drop()
})

//
// CRUD: create, bulk, update, get, set
//

test('create', async function ({ t }) {
  var doc = await db('user').create({ name: 'Heimdal' })
  t.ok(doc && doc.id)
})

test('bulk', async function ({ t }) {
  var n = await db('user').bulk([{ name: 'A' }, { name: 'B' }])
  t.equal(n, 2)
})

test('upsert create', async function ({ t }) {
  var doc = await db('user').upsert({ name: 'X' }, { name: 'X', age: 10 })

  t.ok(doc && doc._id)
  t.equal(doc.name, 'X')
  t.equal(doc.age, 10)
})

test('upsert update', async function ({ t }) {
  await db('user').create({ name: 'X', age: 10 })

  var doc = await db('user').upsert({ name: 'X' }, { name: 'X', age: 20 })

  t.ok(doc && doc._id)
  t.equal(doc.name, 'X')
  t.equal(doc.age, 20)
})

test('update one', async function ({ t }) {
  var doc = await db('user').create({ name: 'Old' })
  var n = await db('user').update({ _id: doc.id }, { name: 'New' })
  t.equal(n, 1)
})

test('update many', async function ({ t }) {
  await db('user').bulk([{ role: 'x' }, { role: 'x' }, { role: 'y' }])
  var n = await db('user').update({ role: 'x' }, { role: 'z' })
  t.equal(n, 2)
})

test('get', async function ({ t }) {
  await db('user').create({ name: 'Heimdal' })
  var doc = await db('user').get({ name: 'Heimdal' })
  t.ok(doc && doc._id)
})

test('set', async function ({ t }) {
  await db('user').create({ name: 'Old', age: 10 })

  var updated = await db('user').set({ name: 'Old' }, { name: 'New', age: 20 })

  t.ok(updated && updated._id)
  t.equal(updated.name, 'New')
  t.equal(updated.age, 20)
})

test('remove', async function ({ t }) {
  await db('user').create({ name: 'A' })

  var removed = await db('user').remove({ name: 'A' })

  t.ok(removed && removed._id)

  var check = await db('user').get({ name: 'A' })
  t.equal(check, null)
})

test('delete one', async function ({ t }) {
  var a = await db('user').create({ name: 'X' })
  await db('user').create({ name: 'Y' })

  var n = await db('user').delete({ _id: a.id })
  t.equal(n, 1)

  var doc = await db('user').get({ _id: a.id })
  t.equal(doc, null)
})

test('delete many', async function ({ t }) {
  await db('user').bulk([{ role: 'x' }, { role: 'x' }, { role: 'y' }])
  var n = await db('user').delete({ role: 'x' })
  t.equal(n, 2)

  var docs = await db('user').find({ role: 'x' })
  t.equal(docs.length, 0)
})

//
// FIND: base, sort, limit, fields
//

test('find', async function ({ t }) {
  await db('user').bulk([
    { name: 'A', age: 1 },
    { name: 'A', age: 2 },
    { name: 'B', age: 3 }
  ])

  var docs = await db('user').find({ name: 'A' })
  t.ok(Array.isArray(docs))
  t.equal(docs.length, 2)
})

test('find sort', async function ({ t }) {
  await db('user').index([['n']])

  await db('user').bulk([
    { name: 'A', n: 3 },
    { name: 'A', n: 1 },
    { name: 'A', n: 2 }
  ])

  var docs = await db('user').find({ name: 'A' }, { sort: [{ n: 'asc' }] })
  t.equal(docs[0].n, 1)
  t.equal(docs[2].n, 3)
})

test('find limit', async function ({ t }) {
  await db('user').bulk([{ name: 'A' }, { name: 'A' }, { name: 'A' }])
  var docs = await db('user').find({ name: 'A' }, { limit: 1 })
  t.equal(docs.length, 1)
})

test('find fields', async function ({ t }) {
  await db('user').bulk([{ name: 'A', age: 10 }])
  var docs = await db('user').find({ name: 'A' }, { fields: ['name'] })
  t.ok(docs[0].name)
  t.equal(docs[0].age, undefined)
})

//
// INDEX
//

test('index', async function ({ t }) {
  await db('user').index([['name', 'email']])
  var docs = await db('user').find(
    { name: 'X' },
    { sort: [{ name: 'asc' }, { email: 'asc' }] }
  )
  t.ok(Array.isArray(docs))
})

//
// COUNT
//

test('count', async function ({ t }) {
  await db('user').bulk([{ type: 'a' }, { type: 'a' }, { type: 'b' }])
  var n = await db('user').count({ type: 'a' })
  t.equal(n, 2)
})

//
// BATCH: base + query + size + sort + limit + fields
//

test('batch', async function ({ t }) {
  await db('user').bulk([{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }])

  var collected = []

  await db('user').batch({}, { size: 2 }, async function (docs) {
    for (var i = 0; i < docs.length; i++) collected.push(docs[i].v)
  })

  t.equal(collected.length, 4)
  t.ok(collected.includes(1))
  t.ok(collected.includes(4))
})

test('batch with query', async function ({ t }) {
  await db('user').bulk([
    { type: 'a', v: 1 },
    { type: 'a', v: 2 },
    { type: 'b', v: 3 }
  ])

  var out = []

  await db('user').batch({ type: 'a' }, { size: 10 }, async function (docs) {
    for (var i = 0; i < docs.length; i++) out.push(docs[i].v)
  })

  t.equal(out.length, 2)
  t.ok(out.includes(1))
  t.ok(out.includes(2))
})

test('batch with size', async function ({ t }) {
  await db('user').bulk([{ n: 1 }, { n: 2 }, { n: 3 }, { n: 4 }])

  var chunks = []

  await db('user').batch({}, { size: 2 }, async function (docs) {
    chunks.push(docs.length)
  })

  t.equal(chunks.length, 2)
  t.equal(chunks[0], 2)
  t.equal(chunks[1], 2)
})

test('batch respects sort', async function ({ t }) {
  await db('user').index([['n']])

  await db('user').bulk([{ n: 3 }, { n: 1 }, { n: 2 }])

  var list = []

  await db('user').batch(
    {},
    { size: 1, sort: [{ n: 'asc' }] },
    async function (docs) {
      list.push(docs[0].n)
    }
  )

  t.deepEqual(list, [1, 2, 3])
})

test('batch respects limit', async function ({ t }) {
  await db('user').bulk([{ n: 1 }, { n: 2 }, { n: 3 }])

  var list = []

  await db('user').batch({}, { limit: 2 }, async function (docs) {
    for (var i = 0; i < docs.length; i++) list.push(docs[i].n)
  })

  t.equal(list.length, 2)
})

test('batch respects fields', async function ({ t }) {
  await db('user').bulk([{ name: 'A', age: 10 }])

  var fields = []

  await db('user').batch(
    { name: 'A' },
    { fields: ['name'] },
    async function (docs) {
      fields.push(Object.keys(docs[0]))
    }
  )

  t.deepEqual(fields[0], ['name'])
})

//
// DATABASE-LEVEL OPS
//

test('drop database', async function ({ t }) {
  await db('user').create({ name: 'A' })
  await db('user').drop()
  var doc = await db('user').get({ name: 'A' })
  t.equal(doc, null)
})

test('compact', async function ({ t }) {
  await db('user').create({ name: 'A' })
  await db('user').update({ name: 'A' }, { name: 'B' })
  await db.compact('user')
  t.ok(true)
})
