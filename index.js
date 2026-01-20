var nano = require('nano')

var apiDrop = require('./lib/api/drop.js')
var apiIndex = require('./lib/api/index.js')
var apiList = require('./lib/api/list.js')
var apiBatch = require('./lib/api/batch.js')
var apiInsert = require('./lib/api/insert.js')
var apiUpdate = require('./lib/api/update.js')
var apiRemove = require('./lib/api/remove.js')
var apiCount = require('./lib/api/count.js')
var apiGet = require('./lib/api/get.js')
var apiSet = require('./lib/api/set.js')

async function webdb(url) {
  var client = nano(url)

  function db(name) {
    var ctx = {
      client: client,
      name: name,
      couch: client.db.use(name)
    }

    return {
      drop: function () {
        return apiDrop(ctx)
      },
      index: function (spec) {
        return apiIndex(ctx, spec)
      },
      list: function (query, options) {
        return apiList(ctx, query, options)
      },
      batch: function (query, options, handler) {
        return apiBatch(ctx, query, options, handler)
      },
      insert: function (values) {
        return apiInsert(ctx, values)
      },
      update: function (query, values) {
        return apiUpdate(ctx, query, values)
      },
      remove: function (query) {
        return apiRemove(ctx, query)
      },
      count: function (query) {
        return apiCount(ctx, query)
      },
      set: function (query, values) {
        return apiSet(ctx, query, values)
      },
      get: function (query, options) {
        return apiGet(ctx, query, options)
      }
    }
  }

  db.client = client
  return db
}

module.exports = webdb
