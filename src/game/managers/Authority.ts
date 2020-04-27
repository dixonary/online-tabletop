import TrackedObject from "../TrackedObject";
import Network, { AuthoritativeAction } from "./Network";
import StateManager from "./StateManager";
import Log from "./Log";
import Manager from "./Manager";

/**
 * A class which handles the authoritative firing of functions.
 */
class Authority extends Manager {
  static IsAuthoritative: boolean = false;

  static Initialize() {
    super.Initialize();
    Network.ReceiveAuthoritativeCall = Authority.Receive;
  }

  /**
   * We are the authority, and the network has just handed us an authoritative
   * call to make.
   */
  static Receive<K>({
    identifier,
    functionName,
    param,
  }: AuthoritativeAction<K>) {
    // Log.Info(`${objectId} :: ! ${functionName}(${params ?? ""})`);
    const obj = StateManager.GetObject(identifier);
    if (!obj) {
      Log.Warn(
        `An authoritative function was called on object with with` +
          ` identifier ${identifier}, but no such object was found.`
      );
      return;
    }
    Authority.IsAuthoritative = true;
    (obj as any)[functionName](param);
    Authority.IsAuthoritative = false;
  }

  /**
   * Send a request to the host that they make an authoritative call.
   *
   * The following functions should be called with authority:
   *
   * - Functions which make stateful changes with stateful preconditions.
   * - Functions which may lead to stateful changes with preconditions,
   * -   after some event is fired.
   */
  static Do<K>(object: TrackedObject<any>, func: (data: K) => any, data?: K) {
    Network.SendAuthoritativeCall({
      identifier: object.identifier,
      functionName: func.name,
      param: data,
    });
  }

  static RequireAuthority() {
    if (!Authority.IsAuthoritative) {
      Log.Warn(
        `A function which requires authority was called without it.<br>` +
          `This action will be cancelled.`
      );
    }
    return Authority.IsAuthoritative;
  }
}

export default Authority;
