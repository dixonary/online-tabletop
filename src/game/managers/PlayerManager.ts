import Network from "../managers/Network";
import Manager from "./Manager";
import Log from "./Log";
import TrackedObject from "../TrackedObject";
import { EventHandler } from "../EventHandler";

export type PlayerData = {
  uid: string;
  userName: string;
};
export type AllPlayersData = {
  [uid: string]: PlayerData;
};

class PlayerManager extends Manager {
  static me: PlayerData | null = null;

  static _data: AllPlayersData = {};
  static _trackedObject: TrackedObject<AllPlayersData> | null = null;

  static events: EventHandler = new EventHandler();

  static Initialize() {
    super.Initialize();

    const uid = localStorage.getItem("uid");
    const userName = localStorage.getItem("userName");

    if (uid === null) {
      Log.Error("Couldn't find uid in local storage");
    } else if (userName === null) {
      Log.Error("Couldn't find username in local storage");
    } else {
      PlayerManager.me = { uid, userName };
    }

    // We override the definitions here to avoid a circular dependency.
    // The dependency cycle was
    // PlayerManager -> TrackedObject -> Network -> PlayerManager
    Network.ReceivePlayerList = PlayerManager.SetPlayers;
  }

  /**
   * This will be called by the network client.
   * @param clients
   */
  static SetPlayers(clients: PlayerData[]) {
    const playerData: AllPlayersData = {};

    clients.forEach((c) => {
      playerData[c.uid] = c;
    });

    PlayerManager._data = playerData;
    PlayerManager.events.event("players", playerData);
  }

  /**
   * Get the current list of players.
   */
  static GetPlayers() {
    // Property order is deterministic so this should not vary!
    return Object.values(PlayerManager._data);
  }

  /**
   * Get the UID of this client.
   */
  static GetUID() {
    if (PlayerManager.me === null) {
      throw new Error("Local user data was accessed before being set.");
    }
    return PlayerManager.me.uid;
  }
}

export default PlayerManager;
