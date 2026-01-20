var list = require('./list.js')
var ensure = require('../ensure.js')

async function batch(ctx, query, options, handler) {
  await ensure(ctx.client, ctx.name)

  options = options || {}
  var size = options.size || 1000

  var docs = await list(ctx, query, options)
  if (!docs.length) return

  for (var i = 0; i < docs.length; i += size) {
    var chunk = docs.slice(i, i + size)
    var res = handler(chunk)
    if (res && typeof res.then === 'function') {
      await res
    }
  }
}

module.exports = batch
