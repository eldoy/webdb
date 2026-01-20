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

test('$eq matches exact value', async function ({ t }) {
  await db('spec').insert([
    { id: 'a', n: 1 },
    { id: 'b', n: 2 }
  ])

  var res = await db('spec').list({ n: { $eq: 1 } })
  t.equal(res.length, 1)
  t.equal(res[0].id, 'a')
})

test('shorthand equality works', async function ({ t }) {
  await db('spec').insert([{ id: 'a', n: 1 }])
  var res = await db('spec').list({ n: 1 })
  t.equal(res.length, 1)
})

test('$ne matches non-equal values', async function ({ t }) {
  await db('spec').insert([
    { id: 'a', n: 1 },
    { id: 'b', n: 2 }
  ])

  var res = await db('spec').list({ n: { $ne: 1 } })
  t.equal(res.length, 1)
  t.equal(res[0].id, 'b')
})

test('$gt and $gte work', async function ({ t }) {
  await db('spec').insert([
    { id: 'a', n: 1 },
    { id: 'b', n: 2 }
  ])

  t.equal((await db('spec').list({ n: { $gt: 1 } })).length, 1)
  t.equal((await db('spec').list({ n: { $gte: 1 } })).length, 2)
})

test('$lt and $lte work', async function ({ t }) {
  await db('spec').insert([
    { id: 'a', n: 1 },
    { id: 'b', n: 2 }
  ])

  t.equal((await db('spec').list({ n: { $lt: 2 } })).length, 1)
  t.equal((await db('spec').list({ n: { $lte: 2 } })).length, 2)
})

test('$in matches any value', async function ({ t }) {
  await db('spec').insert([
    { id: 'a', n: 1 },
    { id: 'b', n: 2 },
    { id: 'c', n: 3 }
  ])

  var res = await db('spec').list({ n: { $in: [1, 3] } })
  t.equal(res.length, 2)
})

test('$nin excludes values', async function ({ t }) {
  await db('spec').insert([
    { id: 'a', n: 1 },
    { id: 'b', n: 2 }
  ])

  var res = await db('spec').list({ n: { $nin: [1] } })
  t.equal(res.length, 1)
  t.equal(res[0].id, 'b')
})

test('$exists true matches present fields', async function ({ t }) {
  await db('spec').insert([{ id: 'a', x: 1 }, { id: 'b' }])

  var res = await db('spec').list({ x: { $exists: true } })
  t.equal(res.length, 1)
  t.equal(res[0].id, 'a')
})

test('$exists false matches missing fields', async function ({ t }) {
  await db('spec').insert([{ id: 'a', x: 1 }, { id: 'b' }])

  var res = await db('spec').list({ x: { $exists: false } })
  t.equal(res.length, 1)
  t.equal(res[0].id, 'b')
})

test('$regex matches strings', async function ({ t }) {
  await db('spec').insert([
    { id: 'a', name: 'alpha' },
    { id: 'b', name: 'beta' }
  ])

  var res = await db('spec').list({ name: { $regex: '^a' } })
  t.equal(res.length, 1)
  t.equal(res[0].id, 'a')
})

test('invalid regex never throws', async function ({ t }) {
  await db('spec').insert([{ id: 'a', name: 'alpha' }])

  var err
  try {
    await db('spec').list({ name: { $regex: '[' } })
  } catch (e) {
    err = e
  }

  t.equal(err, undefined)
})

test('multiple fields imply AND', async function ({ t }) {
  await db('spec').insert([
    { id: 'a', n: 1, x: 1 },
    { id: 'b', n: 1, x: 2 }
  ])

  var res = await db('spec').list({ n: 1, x: 1 })
  t.equal(res.length, 1)
  t.equal(res[0].id, 'a')
})
