var webdb = require('../../index.js')

var db

beforeEach(async function () {
  db = await webdb('http://admin:mysecretpassword@localhost:5984')
  await db('spec').drop()
})

test('set inserts new document and persists it', async function ({ t }) {
  var doc = await db('spec').set({ name: 'a' })
  var stored = await db('spec').get({ id: doc.id })

  t.ok(doc.id)
  t.ok(doc.rev)
  t.equal(stored.name, 'a')
})

test('set with existing id returns existing document without write', async function ({
  t
}) {
  var first = await db('spec').set({ id: 'x', name: 'a' })
  var second = await db('spec').set({ id: 'x', name: 'b' })
  var stored = await db('spec').get({ id: 'x' })

  t.equal(second.id, first.id)
  t.equal(second.rev, first.rev)
  t.equal(stored.name, 'a')
})

test('set removes null properties before insert and persists', async function ({
  t
}) {
  var doc = await db('spec').set({ name: 'a', value: null })
  var stored = await db('spec').get({ id: doc.id })

  t.equal('value' in doc, false)
  t.equal('value' in stored, false)
})

test('set(query, values) updates and persists document', async function ({
  t
}) {
  await db('spec').set({ id: 'x', name: 'a' })
  var doc = await db('spec').set({ id: 'x' }, { name: 'b' })
  var stored = await db('spec').get({ id: 'x' })

  t.equal(doc.id, 'x')
  t.equal(stored.name, 'b')
  t.ok(doc.rev)
})

test('set(query, values) removes null properties and persists', async function ({
  t
}) {
  await db('spec').set({ id: 'x', name: 'a', value: 1 })
  await db('spec').set({ id: 'x' }, { value: null })
  var stored = await db('spec').get({ id: 'x' })

  t.equal('value' in stored, false)
})

test('set(query, null) deletes document from database', async function ({ t }) {
  await db('spec').set({ id: 'x', name: 'a' })
  var doc = await db('spec').set({ id: 'x' }, null)
  var stored = await db('spec').get({ id: 'x' })

  t.equal(doc.id, 'x')
  t.equal(stored, null)
})

test('set(query, null) returns null if no match', async function ({ t }) {
  var doc = await db('spec').set({ id: 'missing' }, null)
  t.equal(doc, null)
})

test('set(query, values) returns null if no match', async function ({ t }) {
  var doc = await db('spec').set({ id: 'missing' }, { name: 'a' })
  t.equal(doc, null)
})
