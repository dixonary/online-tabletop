import TrackedObject from "../TrackedObject";
import Grabber from "../components/Grabber";
import PlayerManager from "../managers/PlayerManager";
import ClientGrabber from "../components/ClientGrabber";

/**
 * The mapping from client ID to grabber ID.
 */
type GrabberManagerData = {
  [clientId: string]: string;
};

/**
 * Creates and tracks grabbers.
 */
class GrabberController extends TrackedObject<GrabberManagerData> {
  constructor() {
    const grabbers: any = {};

    const clientIDs = PlayerManager.GetPlayers().map((p) => p.clientId);

    clientIDs.forEach((id) => {
      // Create a new grabber for each client
      const grabber =
        id === PlayerManager.GetClientId()
          ? new ClientGrabber(id)
          : new Grabber(id);
      grabbers[id] = grabber.identifier;
    });

    super(grabbers);
  }
}

export default GrabberController;
