import TrackedObject from "../TrackedObject";
import { EventHandler, Callback } from "../EventHandler";
import Network, { StateUpdate, Creation, Destruction } from "./Network";
import Manager from "./Manager";
import Trash from "./Trash";
import Log from "./Log";
import MapSet from "../MapSet";

/**
 * A hooked value is one to which update callbacks can be attached.
 */
class Hooked<Value extends {}> {
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
    if (StateManager.updatingState !== null) {
      Log.Warn(
        `${this.object.identifier} ran a state update on ${this.propertyName}` +
          ` while ${StateManager.updatingState.object.identifier}` +
          ` was updating ${StateManager.updatingState.propertyName}.` +
          `\nConsider using TrackedObject.computeProperty().`
      );
    }

    StateManager.updatingState = this;

    this.eventHandler.event("value", val);

    // console.log(this.object.identifier, this.propertyName, val);

    if (propagate)
      Network.SendStateUpdate({
        identifier: this.object.identifier,
        property: this.propertyName,
        val: val,
      });

    this.value = val;

    this.object.state.compute(this.propertyName);

    if (StateManager.updatingState === this) StateManager.updatingState = null;
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

export type Hookable<K extends {}> = {
  [k in keyof K]: Hooked<K[k]>;
};

export type CP<K> = (val: K) => void;

export type Stateful<K> = ObjectState<K> & Hookable<K>;

/**
 * This is the stateful component attached to any TrackedObject.
 */
class ObjectState<K> {
  identifier: string;

  obj: TrackedObject<K>;

  propertyNames: (keyof K)[] = [];
  // computedProperties: ((val:K) => void)[] = [];
  computedProperties: MapSet<keyof K, CP<K>> = new MapSet();

  constructor(id: string, initialState: K, obj: TrackedObject<K>) {
    Object.entries(initialState).forEach(([k, v]: [string, any]) => {
      (this as any)[k] = new Hooked(obj, k, v);
      this.propertyNames.push(k as keyof K);
    });

    this.obj = obj;
    this.obj.identifier = id;
    this.identifier = id;
  }

  /**
   * Add a function which should be computed from a list of stateful properties.
   * The function will be run if any of the values changes.
   */
  addComputedProperty<S extends keyof K>(
    inputs: S[],
    output: (val: Pick<K, S>) => void
  ) {
    // Ensure uniqueness of inputs to avoid recomputing values
    const inputSet = new Set<S>();
    inputs.forEach((i) => inputSet.add(i));
    inputSet.forEach((i) => this.computedProperties.add(i, output));
  }

  computeSingleProperty(cp: CP<K>) {
    const currentState = this.fullState();
    cp(currentState);
  }

  compute(prop: keyof K) {
    const currentState = this.fullState();
    this.computedProperties.get0(prop).forEach((f) => f(currentState));
  }

  fullState(): K {
    const obj: any = {};
    for (let prop of this.propertyNames) {
      obj[prop] = ((this as unknown) as Hookable<K>)[prop].get();
    }
    return obj as K;
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
    Trash.Kill(this.obj);
  }
}

class StateManager extends Manager {
  static updatingState: Hooked<any> | null = null;

  static states: Map<string, ObjectState<any>> = new Map();

  /**
   * Update the internal state of the game's objects.
   * @param id The uuid of the object to update.
   * @param newState The new state.
   * @param propagate Propagate the changes to the controlling object.
   */
  static UpdateState({ identifier, property, val }: StateUpdate) {
    // console.log(`Update: ${id}.${property} = ${newState}`);
    StateManager.states.get(identifier)?.updateState(property, val);
  }

  /**
   * Dynamically construct a new TrackedObject by name, with some
   * initial state.
   * @param className The type of the object to initialise.
   * @param initialState The initial state it should be given.
   */
  static Create({ identifier, className, params }: Creation) {
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
  static Destroy({ identifier }: Destruction) {
    StateManager.states.get(identifier)?.destroy();
    StateManager.states.delete(identifier);
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
