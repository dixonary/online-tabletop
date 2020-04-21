import TrackedObject from "./TrackedObject";
import { EventHandler, Callback } from "./EventHandler";
import { GlobalAccess } from "../GameRenderer";
import Log from "./Log";

export type Hookable<K> = {
  [k in keyof K]: Hooked<K[k]>;
};
export type Stateful<K> = StateManager<K> & Hookable<K>;

/**
 * A hooked value is one to which update callbacks can be attached.
 */
class Hooked<Value> {
  private value: Value;
  private eventHandler: EventHandler = new EventHandler();
  constructor(initialValue: Value) {
    this.value = initialValue;
  }

  /**
   * Update a stateful value.
   * @param val The new value.
   * @param propagate Whether to send an update event.
   */
  set(val: Value, propagate: boolean) {
    if (propagate) this.eventHandler.event("value", val);
    this.value = val;
  }

  /**
   * Get the current value.
   */
  get = () => this.value;

  /**
   * Add an update callback to the callback set.
   * @param callback The callback to add.
   */
  addHook(callback: Callback<[Value]>) {
    this.eventHandler.on("value", callback);
  }

  /**
   * Remove an update callback from the callback set.
   * @param callback The callback to remove.
   */
  remHook(callback: Callback<[Value]>) {
    this.eventHandler.off("value", callback);
  }
}

class StateManager<K> {
  obj: TrackedObject<K>;
  typeName: string;

  constructor(
    typeName: string,
    id: string,
    initialState: any,
    obj: TrackedObject<K>
  ) {
    Object.entries(initialState).forEach(([k, v]: [string, any]) => {
      (this as any)[k] = new Hooked(v);
    });
    this.typeName = typeName;
    this.obj = obj;
    this.obj.identifier = id;
  }

  /**
   * Update the internal state of the game's objects.
   * @param newState The new state.
   * @param propagate Propagate the changes to the controlling object.
   */
  updateState(newState: Partial<K>, propagate: boolean) {
    Object.entries(newState).forEach(([k, v]: [string, any]) => {
      ((this as any)[k] as Hooked<any>).set(v, propagate);
    });
  }

  destroy() {
    this.obj.kill();
  }
}

class StateController {
  static states: Map<string, StateManager<any>> = new Map();

  /**
   * Update the internal state of the game's objects.
   * @param id The uuid of the object to update.
   * @param newState The new state.
   * @param propagate Propagate the changes to the controlling object.
   */
  static UpdateState(id: string, newState: any, propagate: boolean = true) {
    StateController.states.get(id)?.updateState(newState, propagate);
  }

  /**
   * Dynamically construct a new TrackedObject by name, with some
   * initial state.
   * @param className The type of the object to initialise.
   * @param initialState The initial state it should be given.
   */
  static Create(className: string, nonce: string, ...params: any[]) {
    Log.Info(JSON.stringify(params));
    const obj = new ((window as any) as GlobalAccess).game[className](
      ...params
    );
    EventHandler.universe.event(`_CREATE_${nonce}`, obj.identifier, obj);
  }

  /**
   * Add a manually created element to the state machinery.
   * @param id The identifier to add.
   * @param state The state of the machine.
   */
  static Register(id: string, state: StateManager<any>) {
    StateController.states.set(id, state);
  }

  /**
   * Destroy some element of the state.
   * @param id the identifier of the stateful item to destroy.
   */
  static Destroy(id: string) {
    StateController.states.get(id)?.destroy();
    StateController.states.delete(id);
  }

  static GetObject(id: string) {
    return StateController.states.get(id)?.obj;
  }

  /**
   * Remove ALL elements from the state.
   */
  static Clear() {
    StateController.states.clear();
  }
}

export type Data<K> = {
  id: string;
  className: string;
  state: StateManager<K>;
};

export type InitialData = {
  id: string;
  className: string;
  initialState: any;
};

export { StateManager, StateController };
