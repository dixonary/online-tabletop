import TrackedObject from "../TrackedObject";
import { EventHandler, Callback } from "../EventHandler";
import NetworkClient from "./NetworkClient";

export type Hookable<K> = {
  [k in keyof K]: Hooked<K[k]>;
};
export type Stateful<K> = ObjectState<K> & Hookable<K>;

/**
 * A hooked value is one to which update callbacks can be attached.
 */
class Hooked<Value> {
  private value: Value;
  private propertyName: string;
  private eventHandler: EventHandler = new EventHandler();
  private object: TrackedObject<any>;

  constructor(
    object: TrackedObject<any>,
    propertyName: string,
    initialValue: Value
  ) {
    this.propertyName = propertyName;
    this.value = initialValue;
    this.object = object;
  }

  /**
   * Update a stateful value.
   * @param val The new value.
   * @param propagate Whether to tell the network about the update.
   */
  set(val: Value, propagate: boolean = true) {
    this.eventHandler.event("value", val);

    if (propagate)
      NetworkClient.SendStateUpdate(
        this.object.identifier,
        this.propertyName,
        val
      );

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
  addHook(callback: Callback<Value>) {
    this.eventHandler.on("value", callback);
  }

  /**
   * Remove an update callback from the callback set.
   * @param callback The callback to remove.
   */
  remHook(callback: Callback<Value>) {
    this.eventHandler.off("value", callback);
  }
}

class ObjectState<K> {
  obj: TrackedObject<K>;
  identifier: string;

  constructor(id: string, initialState: any, obj: TrackedObject<K>) {
    Object.entries(initialState).forEach(([k, v]: [string, any]) => {
      (this as any)[k] = new Hooked(obj, k, v);
    });
    this.obj = obj;
    this.obj.identifier = id;
    this.identifier = id;
  }

  /**
   * Update the internal state of the game's objects.
   * @param newState The new state.
   * @param propagate Propagate the changes to the controlling object.
   */
  updateState<K>(property: string, newState: K) {
    ((this as any)[property] as Hooked<K>).set(newState, false);
  }

  destroy() {
    this.obj.kill();
  }
}

class StateManager {
  static states: Map<string, ObjectState<any>> = new Map();

  /**
   * Update the internal state of the game's objects.
   * @param id The uuid of the object to update.
   * @param newState The new state.
   * @param propagate Propagate the changes to the controlling object.
   */
  static UpdateState(id: string, property: string, newState: any) {
    StateManager.states.get(id)?.updateState(property, newState);
  }

  /**
   * Dynamically construct a new TrackedObject by name, with some
   * initial state.
   * @param className The type of the object to initialise.
   * @param initialState The initial state it should be given.
   */
  static Create(className: string, ...params: any[]) {
    // TODO upgrade this so it can create anything, not just things that are "components"
    new (window as any).component[className](...params);
  }

  /**
   * Add a manually created element to the state machinery.
   * @param id The identifier to add.
   * @param state The state of the machine.
   */
  static Register(id: string, state: ObjectState<any>) {
    StateManager.states.set(id, state);
  }

  /**
   * Destroy some element of the state.
   * @param id the identifier of the stateful item to destroy.
   */
  static Destroy(id: string) {
    StateManager.states.get(id)?.destroy();
    StateManager.states.delete(id);
  }

  static GetObject<T extends TrackedObject<any>>(id: string) {
    const state = StateManager.states.get(id);
    if (state?.obj) return state.obj as T;
    else return undefined;
  }

  /**
   * Remove ALL elements from the state.
   */
  static Clear() {
    StateManager.states.clear();
  }
}

export type Data<K> = {
  id: string;
  className: string;
  state: ObjectState<K>;
};

export type InitialData = {
  id: string;
  className: string;
  initialState: any;
};

export default StateManager;
export { ObjectState };
