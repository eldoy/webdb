var nano = require('nano')

module.exports = function (url) {
  var server = nano(url)

  var db = function (name) {
    return api(name, server)
  }

  //
  // SERVER-LEVEL OPS (drop all, compact specific)
  //

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
    return await server.info()
  }

  return db
}

//
// COLLECTION-LEVEL API (ordered to match test suite)
//

function api(name, server) {
  return {
    //
    // CRUD
    //

    create: async function (doc) {
      var db = await ensure(name, server)
      return db.insert(doc)
    },

    bulk: async function (docs) {
      var db = await ensure(name, server)
      await db.bulk({ docs: docs })
      return docs.length
    },

    put: async function (query, update) {
      var dbi = await ensure(name, server)

      // find one match
      var r = await dbi.find({
        selector: query,
        limit: 1
      })

      // create if not found
      if (!r.docs.length) {
        var created = await dbi.insert(update)
        return {
          _id: created.id,
          _rev: created.rev,
          ...update
        }
      }

      // update existing
      var cur = r.docs[0]
      var next = {}

      for (var k in cur) next[k] = cur[k]
      for (var k in update) next[k] = update[k]

      var res = await dbi.insert(next)

      next._id = res.id
      next._rev = res.rev
      return next
    },

    update: async function (query, update) {
      var db = await ensure(name, server)
      var r = await db.find({ selector: query })
      if (!r.docs.length) return 0

      var out = []
      for (var i = 0; i < r.docs.length; i++) {
        var cur = r.docs[i]
        var next = {}
        for (var k in cur) next[k] = cur[k]
        for (var k in update) next[k] = update[k]
        out.push(next)
      }

      await db.bulk({ docs: out })
      return out.length
    },

    get: async function (query) {
      var dbi = await ensure(name, server)
      var r = await dbi.find({ selector: query, limit: 1 })
      return r.docs[0] || null
    },

    set: async function (query, update) {
      var dbi = await ensure(name, server)

      // find one
      var r = await dbi.find({
        selector: query,
        limit: 1
      })

      if (!r.docs.length) return null

      var cur = r.docs[0]
      var next = {}

      // merge current doc + update
      for (var k in cur) next[k] = cur[k]
      for (var k in update) next[k] = update[k]

      // write updated doc
      var res = await dbi.insert(next)

      // return updated document shape
      next._id = res.id
      next._rev = res.rev
      return next
    },

    remove: async function (query) {
      var dbi = await ensure(name, server)

      // find one
      var r = await dbi.find({
        selector: query,
        limit: 1
      })

      if (!r.docs.length) return null

      var doc = r.docs[0]

      // mark as deleted
      var res = await dbi.insert({
        _id: doc._id,
        _rev: doc._rev,
        _deleted: true
      })

      return {
        _id: res.id,
        _rev: res.rev
      }
    },

    delete: async function (query) {
      var dbi = await ensure(name, server)

      var r = await dbi.find({ selector: query })
      if (!r.docs.length) return 0

      var out = []
      for (var i = 0; i < r.docs.length; i++) {
        var d = r.docs[i]
        out.push({
          _id: d._id,
          _rev: d._rev,
          _deleted: true
        })
      }

      await dbi.bulk({ docs: out })
      return out.length
    },

    //
    // FIND
    //

    find: async function (query, opts) {
      var dbi = await ensure(name, server)

      var q = { selector: query }
      if (opts) {
        if (opts.sort) q.sort = opts.sort
        if (opts.limit) q.limit = opts.limit
        if (opts.fields) q.fields = opts.fields
      }

      var r = await dbi.find(q)
      return r.docs
    },

    //
    // INDEX
    //

    index: async function (list) {
      var dbi = await ensure(name, server)
      for (var i = 0; i < list.length; i++) {
        await dbi.createIndex({ index: { fields: list[i] } })
      }
    },

    //
    // COUNT
    //

    count: async function (query) {
      var dbi = await ensure(name, server)
      var r = await dbi.find({ selector: query })
      return r.docs.length
    },

    //
    // DROP (collection-level)
    //

    drop: async function () {
      try {
        await server.db.destroy(name)
      } catch (e) {}
    },

    //
    // BATCH
    //

    batch: async function (query, opt, fn) {
      var dbi = await ensure(name, server)

      var size = opt && opt.size ? opt.size : 100
      var limit = opt && opt.limit
      var sort = opt && opt.sort
      var fields = opt && opt.fields

      var bookmark = null
      var remaining = limit

      for (;;) {
        var effectiveSize = size
        if (remaining && remaining < effectiveSize) {
          effectiveSize = remaining
        }

        var q = {
          selector: query,
          limit: effectiveSize
        }

        if (sort) q.sort = sort
        if (fields) q.fields = fields
        if (bookmark) q.bookmark = bookmark

        var r = await dbi.find(q)
        var docs = r.docs
        if (!docs.length) break

        await fn(docs)

        if (remaining) {
          remaining -= docs.length
          if (remaining <= 0) break
        }

        if (!r.bookmark || docs.length < effectiveSize) break
        bookmark = r.bookmark
      }
    }
  }
}

//
// ENSURE DB EXISTS
//

async function ensure(name, server) {
  try {
    await server.db.get(name)
  } catch (e) {
    await server.db.create(name)
  }
  return server.db.use(name)
}
