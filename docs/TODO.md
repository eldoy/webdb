Missing or incomplete relative to the RFC:

1. **Query semantics** √

   * Only `{ field: value }` equality supported.
   * No predicate operators: `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`, `$regex`, `$exists`.

2. **QueryOptions defaults**

   * `get` / `count` ignore `QueryOptions` except partially.

3. **`count(query, queryOptions)`**

   * `queryOptions` parameter is ignored.

4. **`update(query, values)` semantics**

   * Spec: updates *all matching documents* — correct.
   * But matching logic lacks predicate support (same as #1).

5. **`remove(query)` semantics**

   * Same predicate limitations as update/list/count.

6. **Date comparison semantics**

   * Dates are converted on write, but comparisons are strict equality only.
   * No timestamp-based ordering for `$gt/$lt`.

7. **`$regex` behavior**

   * Not implemented.
   * Spec requires invalid patterns never throw.

8. **`$exists`**

   * Not implemented.

9. **`$nin` missing-field behavior**

   * Not implemented (spec allows adapter-defined behavior).

10. **No implicit dot-notation**

* Currently compliant, but untested.

11. **`insert` return shape**

* Correct for id/rev, but spec allows `{ id, rev? }`; fine.
* Does not surface partial failures (acceptable but undocumented).

Everything else in the RFC is now covered by tests and implementation.
