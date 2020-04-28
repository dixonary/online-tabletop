/**
 * A Manager is a static object which has life cycle operations attached to it.
 * The standard way to interact with a Manager is by referring to its static
 * name explicitly (eg. Input.mouse).
 */
class Manager {
  static Initialized: boolean = false;
  /**
   * Remove any data attached to this manager.
   */
  static Dispose() {}
  /**
   * Update any static state.
   */
  static Update(delta: number) {}

  /**
   * Set up any initial values for static state.
   * Initializers may take any data they like.
   */
  static Initialize(data?: any) {
    this.Initialized = true;
  }
}

export default Manager;
