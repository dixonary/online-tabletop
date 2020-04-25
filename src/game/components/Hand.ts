import Region from "./Region";
import {
  Quat,
  Pos3,
  ToQuaternion,
  FromQuaternion,
  ToEuler,
  FromEuler,
} from "../StateStructures";
import StateManager from "../managers/StateManager";
import GameComponent, { GameComponentState } from "./GameComponent";
import Log from "../Log";
import { Euler, Vector3, Quaternion } from "three";
import Card from "./Card";

type HandConstructorData = {
  pos: Pos3;
  quat: Quat;
  clientId: string;
};

// A Hand is a set of cards.
class Hand extends Region {
  constructor({ pos, quat, clientId }: HandConstructorData) {
    super({ pos, quat, dim: { width: 0.5, height: 0, depth: 0.15 }, clientId });

    // Rotate cards into the hand on enter
    this.events.on("object enter", (objId) => {
      const card = StateManager.GetObject(objId)! as GameComponent<
        GameComponentState
      >;

      if (!(card instanceof Card)) return;

      // Compute the Y-axis rotation of the card
      const shortAxisFlip = new Quaternion().setFromAxisAngle(
        new Vector3(0, 0, 1),
        Math.PI
      );

      const noRotationCard = new Quaternion();
      if (!card.state.faceDown.get()) noRotationCard.multiply(shortAxisFlip);
      const cardQ = ToQuaternion(card.state.quaternion.get());
      const currentAngle = cardQ.angleTo(noRotationCard);

      // Compute the Y-axis rotation of the hand
      const noRotation = new Quaternion();
      const thisQ = ToQuaternion(this.state.quaternion.get());
      const targetAngle = thisQ.angleTo(noRotation);

      // Compute the rotational difference
      const diffRotation = new Quaternion().setFromAxisAngle(
        new Vector3(0, 1, 0),
        targetAngle - currentAngle
      );

      cardQ.multiply(diffRotation);
      card.state.quaternion.set(FromQuaternion(cardQ));
    });

    this.events.on("object enter", (objId) => {
      const card = StateManager.GetObject(objId)! as GameComponent<
        GameComponentState
      >;

      if (!(card instanceof Card)) return;

      card.state.secret.set(true);
    });

    this.events.on("object leave", (objId) => {
      const card = StateManager.GetObject(objId)! as GameComponent<
        GameComponentState
      >;

      if (!(card instanceof Card)) return;

      card.state.secret.set(false);
    });
  }
}

export default Hand;
