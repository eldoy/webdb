var nano = require('nano')

async function webdb(url) {
  var client = nano(url)

  var db = function (name) {
    var handle
    var ready

    async function init() {
      if (ready) return ready
      ready = (async () => {
        try {
          await client.db.get(name)
        } catch {
          await client.db.create(name)
        }
        handle = client.db.use(name)
        return handle
      })()
      return ready
    }

    function normalizeSort(sort) {
      return Object.keys(sort).map((k) => ({
        [k]: sort[k] === -1 ? 'desc' : 'asc'
      }))
    }

    function normalizeFields(fields) {
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

    return {
      async all(query = {}, opts = {}) {
        var db = await init()
        var q = { selector: query }

        if (opts.sort) q.sort = normalizeSort(opts.sort)
        if (opts.limit !== undefined) q.limit = opts.limit
        if (opts.skip) q.skip = opts.skip
        if (opts.fields) q.fields = normalizeFields(opts.fields)

        var r = await db.find(q)
        normalizeDocs(r.docs)
        return r.docs
      },

      async get(query = {}) {
        var r = await this.all(query, { limit: 1 })
        return r[0] || null
      },

      async count(query = {}) {
        var db = await init()
        var r = await db.find({ selector: query })
        return r.docs.length
      },

      async set(arg, values) {
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

        var found = await db.find({ selector: arg })

        if (!found.docs.length) {
          if (values === null) return { n: 0 }

          var doc = {}
          for (var k in arg) {
            var v = arg[k]
            if (v && typeof v === 'object' && '$eq' in v) doc[k] = v.$eq
            else if (typeof v !== 'object') doc[k] = v
          }
          for (var k in values) {
            if (values[k] !== undefined) doc[k] = values[k]
          }

          await db.insert(doc)
          return { n: 1 }
        }

        if (values === null) {
          await db.bulk({
            docs: found.docs.map((d) => ({
              _id: d._id,
              _rev: d._rev,
              _deleted: true
            }))
          })
          return { n: found.docs.length }
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
      },

      async drop() {
        try {
          await client.db.destroy(name)
        } catch {}
        handle = null
        ready = null
      },

      async index(indexes) {
        return (await init()).createIndex(indexes)
      }
    }
  }

  db.client = client
  return db
}

module.exports = webdb
