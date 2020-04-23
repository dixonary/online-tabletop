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
    this.state = new ObjectState(
      this.constructor.name,
      id,
      initialState,
      this
    ) as Stateful<State>;

    StateManager.Register(id, this.state);

    console.log(this.constructor.name, this.identifier);
  }

  /**
   * Set the state of one or more variables locally.
   * The changes will be propagated through the state machine and state
   * update hooks will be called.
   * The network will be informed!
   * @param newState The state variables to update.
   */
  setState(newState: any) {
    this.state.updateState(newState, true);
    NetworkClient.SendStateUpdate(this.identifier, newState);
  }

  /**
   * Request that the authoritative server destroy this object.
   * If successful, the state machine will call kill() automatically.
   */
  requestKill() {
    Authority.Do(this, this.kill);
  }

  /**
   * Create an object. Only call this inside of an Authoritatively called function!
   */
  static Create(...params: any[]) {
    NetworkClient.SendCreation(this.prototype.constructor.name, ...params);
    return new (this.prototype.constructor as any)(...params);
  }
}

export default TrackedObject;
