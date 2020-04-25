import TrackedObject from "../TrackedObject";
import NetworkClient from "./NetworkClient";
import StateManager from "./StateManager";
import Log from "../Log";

/**
 * A class which handles the authoritative firing of functions.
 */
class Authority {
  static IsAuthoritative: boolean = false;

  static Initialize() {
    NetworkClient.ReceiveAuthoritativeCall = Authority.Receive;
  }

  /**
   * We are the authority, and the network has just handed us an authoritative
   * call to make.
   */
  static Receive<K>(objectId: string, functionName: string, params: K) {
    // Log.Info(`${objectId} :: ! ${functionName}(${params ?? ""})`);
    const obj = StateManager.GetObject(objectId);
    if (!obj) {
      Log.Warn(
        `An authoritative function was called on object with with` +
          ` identifier ${objectId}, but no such object was found.`
      );
      return;
    }
    Authority.IsAuthoritative = true;
    (obj as any)[functionName](params);
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
    NetworkClient.SendAuthoritativeCall(object.identifier, func.name, data);
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
