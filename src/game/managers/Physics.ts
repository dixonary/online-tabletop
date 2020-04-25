import { World, SAPBroadphase } from "cannon";
import Log from "../Log";

class Physics {
  static world: World;

  static Initialize() {
    Physics.world = new World();
    Physics.world.broadphase = new SAPBroadphase(Physics.world);
    Physics.world.gravity.set(0, -5, 0);
  }

  static Clear() {
    Log.Warn("TODO: implement scene cleanup");
  }
}

export default Physics;
