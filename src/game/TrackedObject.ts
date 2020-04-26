import StateManager, { Stateful, ObjectState } from "./managers/StateManager";
import IDManager from "./managers/IDManager";
import NetworkClient from "./managers/NetworkClient";
import BasicObject from "./BasicObject";
import Authority from "./managers/Authority";

/**
 * A TrackedObject is some object with coherent state, shared between all clients.
 * All clients have the same TrackedObjects with the same names and the same state
 * (up to requests).
 */
class TrackedObject<State extends {}> extends BasicObject {
  // The internal state machine for this object.
  state: Stateful<State>;

  // A string which uniquely identifies this tracked object.
  identifier: string;

  constructor(initialState: State) {
    super();

    const id = IDManager.getNext(this);
    this.identifier = id;

    // We have to cast this. The StateMachine sets the hooked values
    // to itself but this cannot be adequately typechecked in TS (yet!)
    this.state = new ObjectState(id, initialState, this) as Stateful<State>;

    StateManager.Register(id, this.state);

    console.log(this.constructor.name, this.identifier);
  }

  /**
   * Create an object. Only call this inside of an Authoritatively called function!
   */
  static Create(...params: any[]) {
    NetworkClient.SendCreation(this.prototype.constructor.name, ...params);
    return new (this.prototype.constructor as any)(...params);
  }

  /**
   * Authoritatively destroy an object.
   */
  destroy() {
    if (!Authority.RequireAuthority()) return;
    NetworkClient.SendDestruction(this.identifier);
    StateManager.Destroy(this.identifier);
  }
}

export default TrackedObject;
