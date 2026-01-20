function clean(obj) {
  var out = {}
  Object.keys(obj).forEach(function (k) {
    var v = obj[k]
    if (v === null) return
    if (v instanceof Date) out[k] = v.getTime()
    else out[k] = v
  })
  return out
}

module.exports = clean
