var webdb = require('../../index.js')

var db

beforeEach(async function () {
  db = await webdb('http://admin:mysecretpassword@localhost:5984')
})

test('drop removes database', async function ({ t }) {
  await db('spec').set({ name: 'a' })
  await db('spec').drop()

  var err
  try {
    await db('spec').get({})
  } catch (e) {
    err = e
  }
  t.ok(err)
})

test('drop is idempotent', async function ({ t }) {
  await db('spec').drop()
  await db('spec').drop()
  t.ok(true)
})

test('drop recreates clean database on reuse', async function ({ t }) {
  await db('spec').set({ name: 'a' })
  await db('spec').drop()

  var doc = await db('spec').set({ name: 'b' })
  t.ok(doc.id)
  t.equal(doc.name, 'b')
})
