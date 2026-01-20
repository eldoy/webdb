var nano = require('nano')
var crypto = require('crypto')

function uuid() {
  return crypto.randomUUID()
}

function clean(obj) {
  var out = {}
  Object.keys(obj).forEach(function (k) {
    var v = obj[k]
    if (v === null) return
    if (v instanceof Date) out[k] = v.getTime()
    else out[k] = v
  })
  return out
}

/* ---------- lifted helpers (logic unchanged) ---------- */

function matchPredicate(val, pred) {
  if (pred && typeof pred === 'object' && !Array.isArray(pred)) {
    if ('$eq' in pred) return val === pred.$eq
    if ('$ne' in pred) return val !== pred.$ne
    if ('$gt' in pred) return val > pred.$gt
    if ('$gte' in pred) return val >= pred.$gte
    if ('$lt' in pred) return val < pred.$lt
    if ('$lte' in pred) return val <= pred.$lte
    if ('$in' in pred)
      return Array.isArray(pred.$in) && pred.$in.indexOf(val) !== -1
    if ('$nin' in pred)
      return Array.isArray(pred.$nin) && pred.$nin.indexOf(val) === -1
    if ('$exists' in pred)
      return pred.$exists ? val !== undefined : val === undefined
    if ('$regex' in pred) {
      try {
        var re =
          pred.$regex instanceof RegExp ? pred.$regex : new RegExp(pred.$regex)
        return typeof val === 'string' && re.test(val)
      } catch (e) {
        return false
      }
    }
    return false
  }
  return val === pred
}

function matchDoc(doc, query) {
  var keys = Object.keys(query)
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i]
    if (!matchPredicate(doc[k], query[k])) return false
  }
  return true
}

async function ensure(client, name) {
  try {
    await client.db.get(name)
  } catch (e) {
    try {
      await client.db.create(name)
    } catch {}
  }
}

/* ---------- API functions (pure lifts) ---------- */

async function apiDrop(ctx) {
  try {
    await ctx.client.db.destroy(ctx.name)
  } catch (e) {}
}

async function apiIndex(ctx, spec) {
  await ensure(ctx.client, ctx.name)
  return ctx.couch.createIndex(spec)
}

async function apiList(ctx, query, options) {
  await ensure(ctx.client, ctx.name)

  options = options || {}
  var limit = options.limit != null ? options.limit : Infinity
  var skip = options.skip || 0

  var res = await ctx.couch.list({ include_docs: true })
  var rows = res.rows || []
  var out = []

  for (var i = 0; i < rows.length; i++) {
    var raw = rows[i].doc
    if (!matchDoc(raw, query)) continue

    var d = {}
    Object.keys(raw).forEach(function (k) {
      if (k === '_id') d.id = raw[k]
      else if (k === '_rev') d.rev = raw[k]
      else d[k] = raw[k]
    })

    out.push(d)
  }

  if (options.sort) {
    var skey = Object.keys(options.sort)[0]
    var dir = options.sort[skey]
    out.sort(function (a, b) {
      if (a[skey] < b[skey]) return -1 * dir
      if (a[skey] > b[skey]) return 1 * dir
      return 0
    })
  }

  out = out.slice(skip, skip + limit)

  if (options.fields) {
    out = out.map(function (doc) {
      var f = { id: doc.id }
      Object.keys(options.fields).forEach(function (k) {
        if (options.fields[k] && k in doc) f[k] = doc[k]
      })
      if (doc.rev) f.rev = doc.rev
      return f
    })
  }

  return out
}

async function apiBatch(ctx, query, options, handler) {
  await ensure(ctx.client, ctx.name)

  options = options || {}
  var size = options.size || 1000

  var docs = await apiList(ctx, query, options)
  if (!docs.length) return

  for (var i = 0; i < docs.length; i += size) {
    var chunk = docs.slice(i, i + size)
    var res = handler(chunk)
    if (res && typeof res.then === 'function') {
      await res
    }
  }
}

async function apiInsert(ctx, values) {
  await ensure(ctx.client, ctx.name)

  var docs = values.map(function (v) {
    var doc = {}
    var src = v || {}
    var id = src.id || uuid()

    Object.keys(src).forEach(function (k) {
      var val = src[k]
      if (k === 'id') return
      if (val === null) return
      if (val instanceof Date) doc[k] = val.getTime()
      else doc[k] = val
    })

    doc._id = id
    return doc
  })

  var res = await ctx.couch.bulk({ docs: docs })

  return res.map(function (r) {
    var out = { id: r.id }
    if (r.rev) out.rev = r.rev
    return out
  })
}

async function apiUpdate(ctx, query, values) {
  await ensure(ctx.client, ctx.name)

  var res = await ctx.couch.list({ include_docs: true })
  var rows = res.rows || []
  var n = 0

  for (var i = 0; i < rows.length; i++) {
    var doc = rows[i].doc
    var match = true

    Object.keys(query).forEach(function (k) {
      if (doc[k] !== query[k]) match = false
    })

    if (!match) continue

    Object.keys(values).forEach(function (k) {
      var v = values[k]
      if (v === null) delete doc[k]
      else if (v instanceof Date) doc[k] = v.getTime()
      else doc[k] = v
    })

    await ctx.couch.insert(doc)
    n++
  }

  return { n: n }
}

async function apiRemove(ctx, query) {
  await ensure(ctx.client, ctx.name)

  var res = await ctx.couch.list({ include_docs: true })
  var rows = res.rows || []
  var n = 0

  for (var i = 0; i < rows.length; i++) {
    var doc = rows[i].doc
    var match = true

    Object.keys(query).forEach(function (k) {
      if (doc[k] !== query[k]) match = false
    })

    if (!match) continue

    await ctx.couch.destroy(doc._id, doc._rev)
    n++
  }

  return { n: n }
}

async function apiCount(ctx, query) {
  await ensure(ctx.client, ctx.name)

  var res = await ctx.couch.list({ include_docs: true })
  var rows = res.rows || []
  var n = 0

  for (var i = 0; i < rows.length; i++) {
    var doc = rows[i].doc
    var match = true

    Object.keys(query).forEach(function (k) {
      if (doc[k] !== query[k]) match = false
    })

    if (match) n++
  }

  return n
}

async function apiGet(ctx, query, options) {
  options = options || {}

  if (query.id) {
    try {
      var doc = await ctx.couch.get(query.id)
      var out = {}
      Object.keys(doc).forEach(function (k) {
        if (k === '_id') out.id = doc[k]
        else if (k === '_rev') out.rev = doc[k]
        else out[k] = doc[k]
      })

      if (options.fields) {
        var filtered = { id: out.id }
        Object.keys(options.fields).forEach(function (k) {
          if (options.fields[k] && k in out) filtered[k] = out[k]
        })
        if (out.rev) filtered.rev = out.rev
        return filtered
      }

      return out
    } catch (e) {
      return null
    }
  }

  var res = await ctx.couch.list({ include_docs: true })
  var rows = res.rows.map(function (r) {
    var d = {}
    Object.keys(r.doc).forEach(function (k) {
      if (k === '_id') d.id = r.doc[k]
      else if (k === '_rev') d.rev = r.doc[k]
      else d[k] = r.doc[k]
    })
    return d
  })

  if (options.sort) {
    var key = Object.keys(options.sort)[0]
    var dir = options.sort[key]
    rows.sort(function (a, b) {
      if (a[key] < b[key]) return -1 * dir
      if (a[key] > b[key]) return 1 * dir
      return 0
    })
  }

  var skip = options.skip || 0
  var limit = options.limit || 1
  rows = rows.slice(skip, skip + limit)

  if (!rows.length) return null

  var out1 = rows[0]
  if (options.fields) {
    var filtered1 = { id: out1.id }
    Object.keys(options.fields).forEach(function (k) {
      if (options.fields[k] && k in out1) filtered1[k] = out1[k]
    })
    if (out1.rev) filtered1.rev = out1.rev
    return filtered1
  }

  return out1
}

async function apiSet(ctx, query, values) {
  await ensure(ctx.client, ctx.name)

  if (arguments.length === 2) {
    values = query
    var id = values.id || uuid()

    try {
      var existing = await ctx.couch.get(id)
      var out0 = {}
      Object.keys(existing).forEach(function (k) {
        if (k === '_id') out0.id = existing[k]
        else if (k === '_rev') out0.rev = existing[k]
        else out0[k] = existing[k]
      })
      return out0
    } catch (e) {}

    var doc = clean(values)
    doc._id = id
    var res = await ctx.couch.insert(doc)

    var out = {}
    Object.keys(doc).forEach(function (k) {
      if (k !== '_id') out[k] = doc[k]
    })
    out.id = res.id
    out.rev = res.rev
    return out
  }

  if (values === null) {
    var del = await apiGet(ctx, query)
    if (!del) return null
    await ctx.couch.destroy(del.id, del.rev)
    return del
  }

  var found = await apiGet(ctx, query)
  if (!found) return null

  Object.keys(values).forEach(function (k) {
    if (values[k] === null) delete found[k]
    else if (values[k] instanceof Date) found[k] = values[k].getTime()
    else found[k] = values[k]
  })

  var body = {}
  Object.keys(found).forEach(function (k) {
    if (k === 'id') body._id = found[k]
    else if (k === 'rev') body._rev = found[k]
    else body[k] = found[k]
  })

  var res1 = await ctx.couch.insert(body)
  found.rev = res1.rev
  return found
}

/* ---------- factory ---------- */

async function webdb(url) {
  var client = nano(url)

  function db(name) {
    var ctx = {
      client: client,
      name: name,
      couch: client.db.use(name)
    }

    return {
      drop: apiDrop.bind(null, ctx),
      index: apiIndex.bind(null, ctx),
      list: apiList.bind(null, ctx),
      batch: apiBatch.bind(null, ctx),
      insert: apiInsert.bind(null, ctx),
      update: apiUpdate.bind(null, ctx),
      remove: apiRemove.bind(null, ctx),
      count: apiCount.bind(null, ctx),
      set: apiSet.bind(null, ctx),
      get: apiGet.bind(null, ctx)
    }
  }

  db.client = client
  return db
}

module.exports = webdb
