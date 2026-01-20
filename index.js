var nano = require('nano')

module.exports = function (url) {
  var server = nano(url)

  function db(name) {
    return collection(name, server)
  }

  return db
}

function collection(name, server) {
  var handle
  var initPromise

  async function init() {
    if (initPromise) return initPromise
    initPromise = (async () => {
      try {
        await server.db.get(name)
      } catch {
        await server.db.create(name)
      }
      handle = server.db.use(name)
      return handle
    })()
    return initPromise
  }

  function normalizeQuery(q) {
    return q || {}
  }

  function normalizeSort(sort) {
    if (!sort) return undefined
    return Object.keys(sort).map((k) => ({
      [k]: sort[k] === -1 ? 'desc' : 'asc'
    }))
  }

  function normalizeFields(fields) {
    if (!fields) return undefined
    var inc = []
    for (var k in fields) {
      if (fields[k]) inc.push(k === 'id' ? '_id' : k)
    }
    if (!inc.length) return undefined
    if (!inc.includes('_id')) inc.push('_id')
    return inc
  }

  function normalizeDocs(docs) {
    for (var d of docs) {
      d.id = d._id
      delete d._id
      delete d._rev
    }
  }

  async function all(query, opts = {}) {
    var db = await init()
    var q = { selector: normalizeQuery(query) }
    if (opts.sort) q.sort = normalizeSort(opts.sort)
    if (opts.limit !== undefined) q.limit = opts.limit
    if (opts.skip) q.skip = opts.skip
    if (opts.fields) q.fields = normalizeFields(opts.fields)

    var r = await db.find(q)
    normalizeDocs(r.docs)
    return r.docs
  }

  async function get(query) {
    var r = await all(query, { limit: 1 })
    return r[0] || null
  }

  async function count(query) {
    var db = await init()
    var r = await db.find({ selector: normalizeQuery(query) })
    return r.docs.length
  }

  async function set(arg, values) {
    var db = await init()

    if (Array.isArray(arg)) {
      var out = []
      for (var d of arg) {
        var r = await db.insert(d)
        d.id = r.id
        out.push(d)
      }
      return out
    }

    if (values === undefined) {
      var r = await db.insert(arg)
      arg.id = r.id
      return arg
    }

    var found = await db.find({ selector: normalizeQuery(arg) })

    if (!found.docs.length) {
      if (values === null) return { n: 0 }
      var doc = {}
      for (var k in arg) {
        if (typeof arg[k] !== 'object' || arg[k].$eq !== undefined) {
          doc[k] = arg[k].$eq ?? arg[k]
        }
      }
      for (var k in values) {
        if (values[k] !== undefined) doc[k] = values[k]
      }
      var ins = await db.insert(doc)
      return { n: 1 }
    }

    if (values === null) {
      var del = found.docs.map((d) => ({
        _id: d._id,
        _rev: d._rev,
        _deleted: true
      }))
      await db.bulk({ docs: del })
      return { n: del.length }
    }

    var upd = []
    for (var cur of found.docs) {
      var next = { ...cur }
      for (var k in values) {
        if (values[k] === undefined) delete next[k]
        else next[k] = values[k]
      }
      upd.push(next)
    }

    await db.bulk({ docs: upd })
    return { n: upd.length }
  }

  async function drop() {
    try {
      await server.db.destroy(name)
    } catch {}
    handle = null
    initPromise = null
  }

  return {
    all,
    get,
    count,
    set,
    drop,
    data: new Proxy(
      {},
      {
        get(_, prop) {
          return async function () {
            var db = await init()
            return db[prop].apply(db, arguments)
          }
        }
      }
    )
  }
}
