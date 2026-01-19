# WebDB

A small, fast document database API with a portable query language and native backend execution.

WebDB exposes a **single, well-defined interface** (`get` / `set`) designed to cover most web application use cases without sacrificing performance or backend features.

---

## Installation

```sh
npm i @eldoy/webdb
```

---

## Usage

```js
var webdb = require('@eldoy/webdb')
var db = webdb('http://admin:mysecretpassword@localhost:5984')
```

WebDB supports **named collections**:

```js
var users = db('user')
```

Databases are created automatically on first use.

---

## Insert

### Insert one document

```js
var doc = await users.set({ name: 'Alice' })
console.log(doc.id)
```

The input object may be mutated to attach `id`.

---

### Bulk insert

```js
var docs = await users.set([
  { name: 'A' },
  { name: 'B' }
])
```

Returns the inserted documents (same object references).

---

## Query (Read)

### Get first matching document

```js
var doc = await users.get({ name: 'Alice' })
```

Returns `null` if no match exists.

---

### Count

```js
var r = await users.get({ active: true }, { count: true })
console.log(r.count)
```

---

### Streaming / batch reads

```js
await users.get(
  { active: true },
  { batch: 100, sort: { created: 1 } },
  async function (docs) {
    // process a batch
  }
)
```

Streaming controls **delivery**, not execution.
Internal buffering is allowed.

---

## Query Operators

Supported predicates:

```
$eq   $ne
$gt   $gte
$lt   $lte
$in   $nin
$regex
$exists
```

Examples:

```js
await users.get({ age: { $gte: 18 } })
await users.get({ email: { $regex: '@example.com$' } })
```

Logical operators:

```js
$and   $or   $not
```

Example:

```js
await users.get({
  $or: [{ role: 'admin' }, { active: true }]
})
```

---

## Sorting, Limiting, Projection

### Sort

```js
await users.get(
  {},
  { sort: { created: 1 } }
)
```

Sorting may require backend support or indexes.
If unsupported, the adapter may throw.

---

### Limit / skip

```js
await users.get({}, { skip: 10, limit: 5 })
```

---

### Projection (fields)

```js
await users.get(
  {},
  { fields: { name: true, email: true } }
)
```

Notes:

* Projection is inclusive if any field is `true`
* `id` is included by default
* Excluding `id` is **best-effort**
* Adapters may still return `id`

---

## Update

### Update matching documents

```js
var r = await users.set(
  { active: false },
  { active: true }
)

console.log(r.n)
```

Rules:

* Shallow merge
* `undefined` removes a field
* `null` sets field to `null`

---

## Delete

### Delete matching documents

```js
var r = await users.set({ inactive: true }, null)
console.log(r.n)
```

---

### Clear collection

```js
await users.set({}, null)
```

Deletes all documents in the collection.

---

## Adapter Extensions (Optional)

Adapters may expose additional APIs outside dbspec:

```js
await users.drop()      // drop a collection
await db.drop()         // drop all collections
await db.compact('user')
await db.info()
```

These are **adapter-specific** and non-portable.

---

## Escape Hatch (`data`)

Native backend access is available via:

```js
users.data
```

This exposes the underlying client directly.

Use of `data` is **explicitly non-portable** and bypasses dbspec guarantees.

---

## Design Notes

* The reference implementation prioritizes **native execution**
* No client-side emulation of query semantics
* Performance scales with the backend
* Most web apps do not require the escape hatch
* When switching adapters, application query logic remains stable

---

## License

ISC

Created by [Vidar Eldøy](https://eldoy.com)
