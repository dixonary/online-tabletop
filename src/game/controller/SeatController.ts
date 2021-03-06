import { PlayerManager } from "../manager";
import { Pos3 } from "../StateStructures";
import { Seat } from "../component";
import { ClientSeat } from "../component/Seat";
import BasicObject from "../BasicObject";

/**
 * A device for setting up players' seats.
 */
class SeatController extends BasicObject {
  seats: { [uid: string]: Seat };

  constructor(seats: { position: Pos3 }[], center: Pos3) {
    super();
    const clients = PlayerManager.GetPlayers();

    console.log(clients);
    console.log(PlayerManager.GetUID());

    this.seats = {};
    clients.forEach((p, i) => {
      const seatData = seats[i];
      if (!seatData) {
        throw new Error("There are more players than seats!");
      }
      this.seats[p.uid] =
        p.uid === PlayerManager.GetUID()
          ? new ClientSeat(seatData.position, center, p.uid)
          : new Seat(seatData.position, p.uid);
    });
  }
}

export default SeatController;
