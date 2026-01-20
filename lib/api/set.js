var ensure = require('../ensure.js')
var uuid = require('../uuid.js')
var clean = require('../clean.js')
var get = require('./get.js')

async function set(ctx, query, values) {
  await ensure(ctx.client, ctx.name)

  // single-argument form: set(values)
  if (values === undefined) {
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

  // delete form: set(query, null)
  if (values === null) {
    var del = await get(ctx, query)
    if (!del) return null
    await ctx.couch.destroy(del.id, del.rev)
    return del
  }

  // update form: set(query, values)
  var found = await get(ctx, query)
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

module.exports = set
