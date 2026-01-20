var ensure = require('../ensure.js')
var uuid = require('../uuid.js')

async function insert(ctx, values) {
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

module.exports = insert
