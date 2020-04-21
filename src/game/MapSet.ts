class MapSet<k, v> extends Map<k, Set<v>> {
  /**
   * Add an element to the MapSet.
   * @param key The key at which to add the new element.
   * @param val The new element to add.
   */
  add(key: k, val: v) {
    if (!this.has(key)) this.set(key, new Set());
    const cur = this.get(key)!;
    cur.add(val);
  }

  /**
   * Get the value at the key, or the empty set if the index is empty.
   * @param key THe key at which to access the set.
   */
  get0(key: k) {
    return this.get(key) ?? new Set();
  }

  /**
   * Remove an element from the MapSet, if it exists.
   * @param key The key at which to remove the element.
   * @param val  The element to remove.
   */
  remove(key: k, val: v) {
    if (!this.has(key)) return;
    const cur = this.get(key)!;
    cur.delete(val);
    if (cur.size === 0) this.delete(key);
  }
}

export default MapSet;
