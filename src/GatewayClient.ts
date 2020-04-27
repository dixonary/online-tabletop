import { EventHandler } from "./game/EventHandler";
import fetch, { Response } from "node-fetch";
import Network from "./game/managers/Network";

/**
 * This class helps us to navigate the gateway.
 */
class GatewayClient {
  events: EventHandler = new EventHandler();

  /**
   * Request that the server set up a game.
   * @param sceneCode The game's scene code.
   * @param playerData The data of the player.
   */
  setup(sceneCode: string) {
    const handleResponse = async (res: Response) => {
      if (res.ok) {
        const json = await res.json();
        this.events.event("setup.ok", json.gameCode);
      }
      if (res.status === 400) {
        const body = await res.text();
        this.events.event("setup.error", body);
      }
    };

    fetch(`${Network.server}/setup`, {
      method: "post",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sceneCode }),
    }).then(handleResponse);
  }

  /**
   * Request to join an existing game.
   * @param playerData The player's data.
   */
  async join(
    gameCode: string,
    uid: string,
    userName: string,
    isRepeat: boolean = false
  ) {
    const handleResponse = async (res: Response) => {
      if (res.status === 200) {
        this.events.event("join.ok");
      }
      if (res.status === 202) {
        if (!isRepeat) this.events.event("join.pending");
        setTimeout(() => this.join(gameCode, uid, userName, true), 1000);
      }
      if (res.status === 400) {
        this.events.event("join.error", "Data was missing from the request.");
      }
      if (res.status === 403) {
        this.events.event("join.rejected");
      }
      if (res.status === 404) {
        this.events.event("join.error", "Room not found.");
      }
      if (res.status === 409) {
        this.events.event("join.error", "Room is full.");
      }
    };

    fetch(`${Network.server}/join${isRepeat ? "/pending" : ""}`, {
      method: "post",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameCode, uid, userName }),
    }).then(handleResponse);
  }
}

export default GatewayClient;
