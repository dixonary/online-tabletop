import GameObject, { GameObjectState } from "./GameObject";
import { Pos3 } from "../StateStructures";
import Game from "../Game";

class Seat extends GameObject<GameObjectState> {
  clientId: string;
  constructor(position: Pos3, clientId: string) {
    super({ position, owner: clientId, selectable: false, grabbable: false });
    this.clientId = clientId;
    this.setupGeometry();
  }

  setupGeometry() {}
}

class ClientSeat extends Seat {
  static instance: ClientSeat;

  center: Pos3;

  constructor(position: Pos3, center: Pos3, clientId: string) {
    super(position, clientId);

    // Position the camera
    Game.instance.camera.position.set(position.x, position.y, position.z);
    Game.instance.camera.lookAt(center.x, center.y, center.z);

    this.center = center;

    ClientSeat.instance = this;
  }

  update(delta: number) {
    super.update(delta);

    // Do we need to do anything here?
  }
}

export { Seat, ClientSeat };
