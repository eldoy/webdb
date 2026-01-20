async function drop(ctx) {
  try {
    await ctx.client.db.destroy(ctx.name)
  } catch (e) {}
}

module.exports = drop
