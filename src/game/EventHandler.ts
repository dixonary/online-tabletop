import MapSet from "./MapSet";

export type Precondition = (...vars: any[]) => boolean;
export type Callback<Params extends any[]> = (vars: Params) => void;

export interface IEventHandler {
  /** Add a precondition to an event. */
  addPre(eventName: string, pre: Precondition): void;

  /** Remove a precondition from an event. */
  removePre(eventName: string, pre: Precondition): void;

  /** Add a callback to an event. */
  on(eventName: string, callback: Callback<any>): void;

  /** Remove a callback from an event. */
  off(eventName: string, callback?: Callback<any>): void;

  /** Trigger an event. */
  event(eventName: string, ...vars: any[]): boolean;
}

/** A class for managing events.
 *
 */
export class EventHandler implements IEventHandler {
  preconditions: MapSet<string, Precondition> = new MapSet();
  callbacks: MapSet<string, Callback<any>> = new MapSet();

  /**
   * A global event handler which is not attached to anything in particular.
   */
  static universe: EventHandler = new EventHandler();

  addPre(eventName: string, pre: Precondition) {
    this.preconditions.add(eventName, pre);
  }
  removePre(eventName: string, pre: Precondition) {
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

  event(eventName: string, ...vars: any[]) {
    for (let pre of this.preconditions.get0(eventName)) {
      if (!pre()) return false;
    }
    this.callbacks.get0(eventName).forEach((cb) => cb(vars));

    return true;
  }
}
