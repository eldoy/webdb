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

async function webdb(url) {
  var client = nano(url)

  function db(name) {
    var couch = client.db.use(name)
    var api = {}

    async function ensure() {
      try {
        await client.db.get(name)
      } catch (e) {
        await client.db.create(name)
      }
    }

    api.drop = async function () {
      try {
        await client.db.destroy(name)
      } catch (e) {}
    }

    api.index = async function (spec) {
      await ensure()
      return couch.createIndex(spec)
    }

    api.insert = async function (values) {
      await ensure()

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

      var res = await couch.bulk({ docs: docs })

      return res.map(function (r, i) {
        var out = { id: r.id }
        if (r.rev) out.rev = r.rev
        return out
      })
    }

    api.update = async function (query, values) {
      await ensure()

      var res = await couch.list({ include_docs: true })
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

        await couch.insert(doc)
        n++
      }

      return { n: n }
    }

    api.remove = async function (query) {
      await ensure()

      var res = await couch.list({ include_docs: true })
      var rows = res.rows || []
      var n = 0

      for (var i = 0; i < rows.length; i++) {
        var doc = rows[i].doc
        var match = true

        Object.keys(query).forEach(function (k) {
          if (doc[k] !== query[k]) match = false
        })

        if (!match) continue

        await couch.destroy(doc._id, doc._rev)
        n++
      }

      return { n: n }
    }

    api.set = async function (query, values) {
      await ensure()

      if (arguments.length === 1) {
        values = query
        var id = values.id || uuid()

        try {
          var existing = await couch.get(id)
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
        var res = await couch.insert(doc)

        var out = {}
        Object.keys(doc).forEach(function (k) {
          if (k !== '_id') out[k] = doc[k]
        })
        out.id = res.id
        out.rev = res.rev
        return out
      }

      if (values === null) {
        var del = await api.get(query)
        if (!del) return null
        await couch.destroy(del.id, del.rev)
        return del
      }

      var found = await api.get(query)
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

      var res1 = await couch.insert(body)
      found.rev = res1.rev
      return found
    }

    api.get = async function (query, options) {
      options = options || {}

      if (query.id) {
        try {
          var doc = await couch.get(query.id)
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

      var res = await couch.list({ include_docs: true })
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

    return api
  }

  db.client = client
  return db
}

module.exports = webdb
