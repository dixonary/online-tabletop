import { Vector3, Quaternion } from "three";
import { Quat, Pos3, ToQuaternion, FromQuaternion } from "../StateStructures";
import { StateManager } from "../manager/";
import { GameComponentState } from "./GameComponent";
import { Region, Card, GameComponent } from "./";

type HandConstructorData = {
  pos: Pos3;
  quat: Quat;
  uid: string;
};

// A Hand is a set of cards.
class Hand extends Region {
  constructor({ pos, quat, uid }: HandConstructorData) {
    super({ pos, quat, dim: { width: 0.5, height: 0, depth: 0.15 }, uid });

    // Rotate cards into the hand on enter
    this.events.on("object enter", (objId) => {
      const card = StateManager.GetObject(objId)! as GameComponent<
        GameComponentState
      >;

      if (!(card instanceof Card)) return;

      const noRotation = new Quaternion();
      const cardQ = ToQuaternion(card.state.quat.get());
      const currentAngle = cardQ.angleTo(noRotation);

      // Compute the Y-axis rotation of the hand
      const thisQ = ToQuaternion(this.state.quat.get());
      const targetAngle = thisQ.angleTo(noRotation);

      // Compute the rotational difference
      const diffRotation = new Quaternion().setFromAxisAngle(
        new Vector3(0, 1, 0),
        targetAngle - currentAngle
      );

      cardQ.multiply(diffRotation);
      card.state.quat.set(FromQuaternion(cardQ));
    });

    this.events.on("object enter", (objId) => {
      const card = StateManager.GetObject(objId)! as GameComponent<
        GameComponentState
      >;

      if (!(card instanceof Card)) return;
    });

    this.events.on("object leave", (objId) => {
      const card = StateManager.GetObject(objId)! as GameComponent<
        GameComponentState
      >;

      if (!(card instanceof Card)) return;
    });
  }
}

export default Hand;
