import TrackedObject from "../TrackedObject";
import NetworkClient from "../NetworkClient";
import ClientGrabber from "./ClientGrabber";
import Grabber from "./Grabber";

/**
 * The mapping from client ID to grabber ID.
 */
type GrabberAssignment = any;

/**
 * Creates and tracks grabbers.
 */
class GrabberManager extends TrackedObject<GrabberAssignment> {
  constructor(clientIDs: string[]) {
    const grabbers: any = {};

    clientIDs.forEach((id) => {
      // Create a new grabber for each client
      const grabber =
        id === NetworkClient.clientID ? new ClientGrabber(id) : new Grabber(id);
      grabbers[id] = grabber.identifier;
    });

    super(grabbers);
  }
}

export default GrabberManager;
