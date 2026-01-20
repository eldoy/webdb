var webdb = require('../../index.js')

var db

beforeEach(async function () {
  db = await webdb('http://admin:mysecretpassword@localhost:5984')
  await db('spec').drop()
})

test('index creates an index without throwing', async function ({ t }) {
  var res = await db('spec').index({
    index: { fields: ['name'] },
    name: 'name-index',
    type: 'json'
  })

  t.ok(res)
})

test('index is idempotent', async function ({ t }) {
  await db('spec').index({
    index: { fields: ['name'] },
    name: 'name-index',
    type: 'json'
  })

  await db('spec').index({
    index: { fields: ['name'] },
    name: 'name-index',
    type: 'json'
  })

  t.ok(true)
})

test('index does not affect reads or writes', async function ({ t }) {
  await db('spec').index({
    index: { fields: ['name'] },
    name: 'name-index',
    type: 'json'
  })

  var doc = await db('spec').set({ name: 'a' })
  var stored = await db('spec').get({ id: doc.id })

  t.equal(stored.name, 'a')
})

test('index throws on invalid arguments', async function ({ t }) {
  var err
  try {
    await db('spec').index('arbitrary', { any: 'value' })
  } catch (e) {
    err = e
  }
  t.ok(err)
})
