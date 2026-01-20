var nano = require('nano')

var clean = require('./lib/clean.js')
var uuid = require('./lib/uuid.js')
var match = require('./lib/match.js')
var ensure = require('./lib/ensure.js')

var drop = require('./lib/api/drop.js')
var index = require('./lib/api/index.js')
var list = require('./lib/api/list.js')
var batch = require('./lib/api/batch.js')
var insert = require('./lib/api/insert.js')
var update = require('./lib/api/update.js')
var remove = require('./lib/api/remove.js')
var count = require('./lib/api/count.js')

var get = require('./lib/api/get.js')
var set = require('./lib/api/set.js')

async function webdb(url) {
  var client = nano(url)

  function db(name) {
    var ctx = {
      client: client,
      name: name,
      couch: client.db.use(name)
    }

    return {
      drop: drop.bind(null, ctx),
      index: index.bind(null, ctx),
      list: list.bind(null, ctx),
      batch: batch.bind(null, ctx),
      insert: insert.bind(null, ctx),
      update: update.bind(null, ctx),
      remove: remove.bind(null, ctx),
      count: count.bind(null, ctx),
      set: set.bind(null, ctx),
      get: get.bind(null, ctx)
    }
  }

  db.client = client
  return db
}

module.exports = webdb
