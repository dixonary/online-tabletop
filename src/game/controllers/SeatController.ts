import PlayerManager from "../managers/PlayerManager";
import { Pos3 } from "../StateStructures";
import BasicObject from "../BasicObject";
import { Seat, ClientSeat } from "../components/Seat";

/**
 * A device for setting up players' seats.
 */
class SeatController extends BasicObject {
  seats: { [clientId: string]: Seat };

  constructor(seats: { position: Pos3 }[], center: Pos3) {
    super();
    const clients = PlayerManager.GetPlayers();

    this.seats = {};
    clients.forEach((p, i) => {
      const seatData = seats[i];
      if (!seatData) {
        throw new Error("There are more players than seats!");
      }
      this.seats[p.clientId] =
        p.clientId === PlayerManager.GetClientId()
          ? new ClientSeat(seatData.position, center, p.clientId)
          : new Seat(seatData.position, p.clientId);
    });
  }
}

export default SeatController;
