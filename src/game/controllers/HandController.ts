import PlayerManager from "../managers/PlayerManager";
import { Pos3, Quat } from "../StateStructures";
import BasicObject from "../BasicObject";
import Hand from "../components/Hand";

/**
 * A device for setting up players' seats.
 */
class HandController extends BasicObject {
  hands: { [clientId: string]: Hand };

  constructor(hands: { pos: Pos3; quat: Quat }[]) {
    super();
    const clients = PlayerManager.GetPlayers();

    this.hands = {};
    clients.forEach((p, i) => {
      const handData = hands[i];
      if (!handData) {
        throw new Error("There are more players than seats!");
      }
      this.hands[p.uid] = new Hand({ ...handData, uid: p.uid });
    });
  }
}

export default HandController;
