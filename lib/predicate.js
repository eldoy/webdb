function predicate(val, pred) {
  if (pred && typeof pred === 'object' && !Array.isArray(pred)) {
    if ('$eq' in pred) return val === pred.$eq
    if ('$ne' in pred) return val !== pred.$ne
    if ('$gt' in pred) return val > pred.$gt
    if ('$gte' in pred) return val >= pred.$gte
    if ('$lt' in pred) return val < pred.$lt
    if ('$lte' in pred) return val <= pred.$lte
    if ('$in' in pred)
      return Array.isArray(pred.$in) && pred.$in.indexOf(val) !== -1
    if ('$nin' in pred)
      return Array.isArray(pred.$nin) && pred.$nin.indexOf(val) === -1
    if ('$exists' in pred)
      return pred.$exists ? val !== undefined : val === undefined
    if ('$regex' in pred) {
      try {
        var re =
          pred.$regex instanceof RegExp ? pred.$regex : new RegExp(pred.$regex)
        return typeof val === 'string' && re.test(val)
      } catch (e) {
        return false
      }
    }
    return false
  }
  return val === pred
}

module.exports = predicate
