var ensure = require('../ensure.js')

async function index(ctx, spec) {
  await ensure(ctx.client, ctx.name)
  return ctx.couch.createIndex(spec)
}

module.exports = index
