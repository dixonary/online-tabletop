/**
 * Manage the assignment of identifiers to created objects.
 */
class IDManager {
  private static _id: number = 0;

  /**
   * Get the next automatically assigned identifier.
   */
  static getNext(o?: any) {
    const id = `AUTO_${IDManager._id}`;
    IDManager._id++;
    return id;
  }

  /**
   * Reset the identifier counter.
   */
  static reset() {
    IDManager._id = 0;
  }
}

export default IDManager;
