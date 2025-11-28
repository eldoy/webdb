# WebDB

Document database API backed by CouchDB, exposed through a Mongo-style client.

### Installation
```sh
npm i webdb
````

### Usage

```js
var webdb = require('webdb')
var db = webdb('http://admin:mysecretpassword@localhost:5984')

// Create one
var doc = await db('user').create({ name: 'Heimdal' })

// Bulk insert
var n = await db('user').bulk([
  { name: 'A' },
  { name: 'B' }
])

// Update one or many
var n = await db('user').update(
  { name: 'A' },
  { active: true }
)

// Get one (first match)
var doc = await db('user').get({ name: 'Heimdal' })

// Create indexes
await db('user').index([
  ['name'],
  ['name', 'email']
])

// Find
var docs = await db('user').find({ name: 'Heimdal' })

// Find with sort
var docs = await db('user').find(
  { name: 'Heimdal' },
  { sort: [{ name: 'asc' }] }
)

// Find with limit
var docs = await db('user').find(
  { name: 'Heimdal' },
  { limit: 1 }
)

// Find with projection
var docs = await db('user').find(
  { name: 'Heimdal' },
  { fields: ['name', 'email'] }
)

// Delete one or many
var n = await db('user').delete({ active: false })

// Count
var n = await db('user').count({ name: 'Heimdal' })

// Batch processing (streamed pagination)
await db('user').batch(
  { active: true },
  { size: 500, sort: [{ created: 'asc' }] },
  async function (docs) {
    // handle a chunk
  }
)

// Drop a specific database
await db('user').drop()

// Server-level compact
await db.compact('user')

// Drop all databases
await db.drop()
```

### Notes on Indexing, Sorting, and Mango Queries

**1. Selector fields and indexes**
Mango performs best when the selector matches an existing index.
Any field used in `{ selector: … }` benefits from being part of an index, but it is not required unless sorting is used.

**2. Sorting requires indexing**
Mango enforces that **every field in the sort must be indexed**.
Example:

```js
await db('user').index([['age']])
await db('user').find({}, { sort: [{ age: 'asc' }] })   // valid
```

Sorting without the correct index returns an error.

**3. Compound indexes**
An index like:

```js
await db('user').index([['name', 'email']])
```

supports selectors and sorts that use `name`, or `name` and `email` together, in the defined order.

**4. Projection (`fields`)**
Projection returns only selected fields.
Unindexed projection works fine; indexing does not affect `fields`.

**5. Pagination (batch)**
`batch()` uses Mango bookmarks internally.
It respects all options: `sort`, `limit`, `fields`, and `size`.

**6. Create-on-first-use**
Databases are auto-created when used. Explicit `drop()` allows clean-state tests.

**7. Null results**
`get()` returns `null` when no match exists.

### ID note

CouchDB stores documents with `_id`, but write responses return the same value as `id`.
Use `doc.id` after `create()`, and `_id` for all queries and stored documents.

### Acknowledgements

Created by [Tekki AS](https://tekki.no)

ISC Licensed.
