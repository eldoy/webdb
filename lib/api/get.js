async function get(ctx, query, options) {
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

module.exports = get
