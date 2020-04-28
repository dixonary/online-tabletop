import { IDManager, StateManager, Network, Authority } from "./manager/";
import { Stateful, ObjectState } from "./manager/StateManager";
import BasicObject from "./BasicObject";

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

    // Initialize this with the initial state so we can construct more
    // complex identifiers than just member vars.
    const id = IDManager.GetNext(this.getIdentifierToken(initialState));
    this.identifier = id;

    // We have to cast this. The StateMachine sets the hooked values
    // to itself but this cannot be adequately typechecked in TS (yet!)
    this.state = new ObjectState(id, initialState, this) as Stateful<State>;

    StateManager.Register(id, this.state);

    console.log(this.constructor.name, this.identifier);
  }

  getIdentifierToken(initialState: State) {
    return this.constructor.name;
  }

  /**
   * Create an object. Only call this inside of an Authoritatively called function!
   */
  static Create(...params: any[]) {
    const obj = new (this.prototype.constructor as any)(...params);
    Network.SendCreation({
      identifier: obj.identifier,
      className: this.prototype.constructor.name,
      params: params,
    });
    return obj;
  }

  /**
   * Authoritatively destroy an object.
   */
  destroy() {
    if (!Authority.RequireAuthority()) return;
    Network.SendDestruction({ identifier: this.identifier });
    StateManager.Destroy({ identifier: this.identifier });
  }
}

export default TrackedObject;
