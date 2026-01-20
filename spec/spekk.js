module.exports = async function () {
  async function setup() {
    await new Promise((r) => setTimeout(r, 200))
  }

  async function teardown() {
    await new Promise((r) => setTimeout(r, 200))
  }

  return { setup, teardown }
}
