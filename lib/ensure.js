async function ensure(client, name) {
  try {
    await client.db.get(name)
  } catch (e) {
    try {
      await client.db.create(name)
    } catch {}
  }
}

module.exports = ensure
