import { Object3D } from "three";
import { GameObject } from "./Game";

/**
 * A grabber is the thing that a player picks things up with.
 */
class Grabber extends Object3D {
  attached: GameObject | null = null;

  attachObject(gameObj: GameObject) {
    if (this.attached) return;
    if (gameObj.runCallback("attach", this)) {
      this.attached = gameObj;
      this.position.copy(this.attached.position);
    }
  }

  detachObject() {
    if (!this.attached) return;
    if (this.attached.runCallback("detach", this)) {
      this.attached = null;
    }
  }
}

export default Grabber;
