var ensure = require('../ensure.js')

async function remove(ctx, query) {
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

    await ctx.couch.destroy(doc._id, doc._rev)
    n++
  }

  return { n: n }
}

module.exports = remove
