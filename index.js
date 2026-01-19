var nano = require('nano')

module.exports = function (url) {
  var server = nano(url)

  function db(name) {
    return collection(name, server)
  }

  db.drop = async function () {
    var list = await server.db.list()
    for (var i = 0; i < list.length; i++) {
      await server.db.destroy(list[i])
    }
  }

  db.compact = async function (name) {
    await server.db.compact(name)
  }

  db.info = async function () {
    return server.info()
  }

  return db
}

function collection(name, server) {
  var handle = null
  var initPromise = null

  function init() {
    if (initPromise) return initPromise

    initPromise = (async function () {
      try {
        await server.db.get(name)
      } catch (e) {
        try {
          await server.db.create(name)
        } catch (e2) {}
      }
      handle = server.db.use(name)
      return handle
    })()

    return initPromise
  }

  var data = new Proxy(
    {},
    {
      get: function (_, prop) {
        return async function () {
          var db = await init()
          return db[prop].apply(db, arguments)
        }
      }
    }
  )

  return {
    data: data,

    get: async function (query, opts, onBatch) {
      var db = await init()
      opts = opts || {}

      if (opts.count) {
        var r = await db.find({ selector: query })
        return { count: r.docs.length }
      }

      if (onBatch) {
        var batch = opts.batch || 100
        var remaining = opts.limit
        var bookmark = null

        for (;;) {
          var limit = batch
          if (remaining !== undefined && remaining < limit) {
            limit = remaining
          }

          var q = { selector: query, limit: limit }
          if (opts.sort) q.sort = normalizeSort(opts.sort)

          var mf = opts.fields && normalizeFields(opts.fields)
          if (mf) q.fields = mf
          if (bookmark) q.bookmark = bookmark

          var r = await db.find(q)
          if (!r.docs.length) break

          normalizeDocs(r.docs)
          await onBatch(r.docs)

          if (remaining !== undefined) {
            remaining -= r.docs.length
            if (remaining <= 0) break
          }

          if (!r.bookmark || r.docs.length < limit) break
          bookmark = r.bookmark
        }
        return
      }

      var q = { selector: query }
      if (opts.sort) q.sort = normalizeSort(opts.sort)
      if (opts.limit !== undefined) q.limit = opts.limit
      if (opts.skip) q.skip = opts.skip

      var mf = opts.fields && normalizeFields(opts.fields)
      if (mf) q.fields = mf

      var r = await db.find(q)
      normalizeDocs(r.docs)
      return r.docs[0] || null
    },

    set: async function (arg, values) {
      var db = await init()

      if (Array.isArray(arg)) {
        var out = []
        for (var i = 0; i < arg.length; i++) {
          var d = arg[i]
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

      var r = await db.find({ selector: arg })
      if (!r.docs.length) return { n: 0 }

      if (values === null) {
        var del = []
        for (var i = 0; i < r.docs.length; i++) {
          del.push({
            _id: r.docs[i]._id,
            _rev: r.docs[i]._rev,
            _deleted: true
          })
        }
        await db.bulk({ docs: del })
        return { n: del.length }
      }

      var upd = []
      for (var i = 0; i < r.docs.length; i++) {
        var cur = r.docs[i]
        var next = {}
        for (var k in cur) next[k] = cur[k]

        for (var k in values) {
          if (values[k] === undefined) delete next[k]
          else next[k] = values[k]
        }
        upd.push(next)
      }

      await db.bulk({ docs: upd })
      return { n: upd.length }
    },

    drop: async function () {
      try {
        await server.db.destroy(name)
      } catch (e) {}
      handle = null
      initPromise = null
    }
  }
}

function normalizeSort(sort) {
  var out = []
  for (var k in sort) {
    if (sort[k] === 1) out.push({ [k]: 'asc' })
    else if (sort[k] === -1) out.push({ [k]: 'desc' })
  }
  return out
}

function normalizeFields(fields) {
  var include = []
  for (var k in fields) {
    if (fields[k]) {
      include.push(k === 'id' ? '_id' : k)
    }
  }
  if (include.length) {
    if (fields.id !== false && include.indexOf('_id') === -1)
      include.push('_id')
    return include
  }
  return null
}

function normalizeDocs(docs) {
  for (var i = 0; i < docs.length; i++) {
    docs[i].id = docs[i]._id
    delete docs[i]._id
    delete docs[i]._rev
  }
}
