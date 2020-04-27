import Manager from "./Manager";

/**
 * Manage the assignment of identifiers to created objects.
 */
class IDManager extends Manager {
  static map: Map<string, number> = new Map();

  /**
   * Get the next automatically assigned identifier.
   */
  static GetNext(name: string, o?: any) {
    let i = IDManager.map.get(name);
    if (!i) {
      i = 0;
    }
    const id = `${name}_${i}`;
    IDManager.map.set(name, i + 1);
    return id;
  }

  /**
   * Reset the identifier counter.
   */
  static Reset() {
    IDManager.map.clear();
  }
}

export default IDManager;
