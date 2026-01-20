var ensure = require('../ensure.js')
var match = require('../match.js')

async function list(ctx, query, options) {
  await ensure(ctx.client, ctx.name)

  options = options || {}
  var limit = options.limit != null ? options.limit : Infinity
  var skip = options.skip || 0

  var res = await ctx.couch.list({ include_docs: true })
  var rows = res.rows || []
  var out = []

  for (var i = 0; i < rows.length; i++) {
    var raw = rows[i].doc
    if (!match(raw, query)) continue

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

module.exports = list
