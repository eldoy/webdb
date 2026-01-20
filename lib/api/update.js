var ensure = require('../ensure.js')

async function update(ctx, query, values) {
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

module.exports = update
