import { Group } from "three";
import { Stateful, StateManager, StateController } from "./StateMachine";
import IDManager from "./IDManager";
import {
  EventHandler,
  Precondition,
  Callback,
  IEventHandler,
} from "./EventHandler";
import NetworkClient from "./NetworkClient";

class TrackedObject<State extends {}> extends Group implements IEventHandler {
  // The internal state machine for this object.
  state: Stateful<State>;

  // A string which uniquely identifies this tracked object.
  identifier: string;

  // Events are handled here but wrapped in TrackedObject member functions.
  eventHandler: EventHandler = new EventHandler();

  constructor(initialState: State) {
    super();

    const id = IDManager.getNext(this);
    this.identifier = id;

    // We have to cast this. The StateMachine sets the hooked values
    // to itself but this cannot be adequately typechecked in TS (yet!)
    this.state = new StateManager(
      this.constructor.name,
      id,
      initialState,
      this
    ) as Stateful<State>;

    StateController.Register(id, this.state);
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
   * Request an event which requires authority.
   * @param event The kind of event to request.
   * @param data Any additional data.
   */
  sendRequest(event: string, data: any) {
    NetworkClient.SendRequest(this.identifier, event, data);
  }

  /**
   * Receive a request from the network. Eg the event "yeet" will poll
   * the event "request/yeet".
   * @param event The request type.
   * @param data Any additional data.
   */
  receiveRequest(event: string, data: any) {
    this.event(event, data);
  }

  /**
   * Request that the authoritative server destroy this object.
   * If successful, the state machine will call kill() automatically.
   */
  requestKill() {
    this.sendRequest("kill", null);
  }

  /**
   * NOTE: Don't call this directly! Use requestKill() instead, which will
   * propagate the changes across the network.
   * Destroy the object.
   */
  kill() {}

  /* Wrap the EventHandler functions */
  addPre = (eventName: string, pre: Precondition) =>
    this.eventHandler.addPre(eventName, pre);
  removePre = (eventName: string, pre: Precondition) =>
    this.eventHandler.removePre(eventName, pre);
  on = (eventName: string, callback: Callback<any>) =>
    this.eventHandler.on(eventName, callback);
  off = (eventName: string, callback?: Callback<any>) =>
    this.eventHandler.off(eventName, callback);
  event = (eventName: string, ...vars: any[]) =>
    this.eventHandler.event(eventName, ...vars);

  Destroy() {
    NetworkClient.SendDestroy(this.identifier);
  }

  /**
   * Create an object. This will request creation from the authority
   * and fire the callback with the id and object as parameters.
   * @param onCreate The callback to run.
   * @param params
   */
  static Create(onCreate: Callback<any> | null, ...params: any[]) {
    const nonce = Math.floor(
      Math.random() * Number.MAX_SAFE_INTEGER
    ).toString();

    if (onCreate) EventHandler.universe.once(`_CREATE_${nonce}`, onCreate);

    NetworkClient.SendCreation(
      this.prototype.constructor.name,
      nonce,
      ...params
    );
  }
}

export default TrackedObject;
