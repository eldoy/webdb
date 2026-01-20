var predicate = require('./predicate.js')

function match(doc, query) {
  var keys = Object.keys(query)
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i]
    if (!predicate(doc[k], query[k])) return false
  }
  return true
}

module.exports = match
