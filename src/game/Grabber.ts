import { Object3D } from "three";
import { GameObject } from "./Game";

/**
 * A grabber is the thing that a player picks things up with.
 */
class Grabber extends Object3D {
  attached: GameObject | null = null;
}

export default Grabber;
