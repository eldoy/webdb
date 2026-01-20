var webdb = require('../../index.js')

var db

beforeEach(async function () {
  db = await webdb('http://admin:mysecretpassword@localhost:5984')
  await db('spec').drop()
})

test('batch processes documents in batches', async function ({ t }) {
  await db('spec').insert([
    { id: 'a', n: 1 },
    { id: 'b', n: 1 },
    { id: 'c', n: 1 }
  ])

  var seen = []

  await db('spec').batch({ n: 1 }, { size: 2 }, async function (docs) {
    seen.push(docs.length)
  })

  t.equal(seen.length, 2)
  t.equal(seen[0], 2)
  t.equal(seen[1], 1)
})

test('batch respects default batch size', async function ({ t }) {
  await db('spec').insert([
    { id: 'a', n: 1 },
    { id: 'b', n: 1 }
  ])

  var seen = 0

  await db('spec').batch({ n: 1 }, {}, function (docs) {
    seen += docs.length
  })

  t.equal(seen, 2)
})

test('batch with empty query processes all documents', async function ({ t }) {
  await db('spec').insert([
    { id: 'a', n: 1 },
    { id: 'b', n: 2 }
  ])

  var seen = []

  await db('spec').batch({}, { size: 1 }, function (docs) {
    seen.push(docs[0].id)
  })

  t.equal(seen.length, 2)
})

test('batch does nothing when no documents match', async function ({ t }) {
  await db('spec').insert([{ id: 'a', n: 1 }])

  var called = false

  await db('spec').batch({ n: 999 }, {}, function () {
    called = true
  })

  t.equal(called, false)
})

test('batch supports async handler', async function ({ t }) {
  await db('spec').insert([
    { id: 'a', n: 1 },
    { id: 'b', n: 1 }
  ])

  var seen = 0

  await db('spec').batch({ n: 1 }, { size: 1 }, async function (docs) {
    seen += docs.length
  })

  t.equal(seen, 2)
})
