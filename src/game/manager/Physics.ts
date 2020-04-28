import { World, SAPBroadphase } from "cannon";
import Log from "./Log";
import Manager from "./Manager";

class Physics extends Manager {
  static world: World;

  static TPS: number = 120;

  static Initialize() {
    super.Initialize();
    Physics.world = new World();
    Physics.world.broadphase = new SAPBroadphase(Physics.world);
    Physics.world.gravity.set(0, -5, 0);
  }

  static Update(delta: number) {
    super.Update(delta);
    Physics.world.step(1 / Physics.TPS, delta);
  }

  static Dispose() {
    super.Dispose();
  }
}

export default Physics;
