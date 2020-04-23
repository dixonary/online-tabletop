import MapSet from "./MapSet";

export type Precondition<Params extends any> = (vars: Params) => boolean;
export type Callback<Params extends any> = (vars: Params) => void;

export interface IEventHandler {
  /** Add a precondition to an event. */
  addPre(eventName: string, pre: Precondition<any>): void;

  /** Remove a precondition from an event. */
  removePre(eventName: string, pre: Precondition<any>): void;

  /** Add a callback to an event. */
  on(eventName: string, callback: Callback<any>): void;

  /** Remove a callback from an event. */
  off(eventName: string, callback?: Callback<any>): void;

  /** Trigger an event. */
  event(eventName: string, data: any): boolean;
}

export class EventType<K> {
  preconditions: Set<Precondition<K>> = new Set();
  callbacks: Set<Callback<K>> = new Set();

  /**
   * Add a precondition to an event. The event will not fire if
   * any precondition is unmet.
   * @param pre The precondition to add.
   */
  addPre(pre: Precondition<K>) {
    this.preconditions.add(pre);
  }

  /**
   * Remove a precondition from an event.
   * @param pre The precondition to remove.
   */
  removePre(pre: Precondition<K>) {
    this.preconditions.delete(pre);
  }

  /**
   * Add a callback to an event.
   */
  on = (callback: Callback<K>) => this.callbacks.add(callback);

  /**
   * Remove a callback from an event.
   */
  off = (callback: Callback<K>) => this.callbacks.delete(callback);

  /**
   * Set a callback which will be activated exactly once.
   */
  once(callback: Callback<K>) {
    const wrapper = (data: K) => {
      this.callbacks.delete(wrapper);
      callback(data);
    };
    this.callbacks.add(wrapper);
  }

  /**
   * Activate the event.
   */
  call(data: K) {
    for (let pre of this.preconditions) {
      if (!pre(data)) return;
    }
  }

  /**
   * Whether the event has nothing tied to it.
   * If this is true we can remove it from the event handler.
   */
  isEmpty() {
    return this.preconditions.size === 0 && this.callbacks.size === 0;
  }
}

/**
 * A class for managing events.
 */
export class EventHandler extends Map<string, EventType<any>> {
  get<K>(name: string) {
    if (super.get(name) === undefined) this.set(name, new EventType<K>());
    return super.get(name);
  }

  preconditions: MapSet<string, Precondition<any>> = new MapSet();
  callbacks: MapSet<string, Callback<any>> = new MapSet();

  /**
   * A global event handler which is not attached to anything in particular.
   */
  static universe: EventHandler = new EventHandler();

  addPre(eventName: string, pre: Precondition<any>) {
    this.preconditions.add(eventName, pre);
  }
  removePre(eventName: string, pre: Precondition<any>) {
    this.preconditions.remove(eventName, pre);
  }

  on(eventName: string, callback: Callback<any>) {
    this.callbacks.add(eventName, callback);
  }

  off(eventName: string, callback?: Callback<any>) {
    if (callback) this.callbacks.remove(eventName, callback);
    else this.callbacks.delete(eventName);
  }

  once(eventName: string, callback: Callback<any>) {
    const wrapperCallback = (vars: any) => {
      this.callbacks.remove(eventName, wrapperCallback);
      callback(vars);
    };
    this.callbacks.add(eventName, wrapperCallback);
  }

  event(eventName: string, vars?: any) {
    for (let pre of this.preconditions.get0(eventName)) {
      if (!pre(vars)) return false;
    }
    this.callbacks.get0(eventName).forEach((cb) => cb(vars));

    return true;
  }
}
