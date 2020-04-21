import { Mesh, Vector3 } from "three";
import Log from "./Log";
import { GlobalAccess } from "../GameRenderer";
import { Pos3 } from "./StateStructures";
import TrackedObject from "./TrackedObject";

export type GameObjectState = {
  position: Pos3; // The position of the object.
  owner: string | null; // The ID of the person who is currently manipulating the object.
  selectable: boolean;
};

/**
 * A GameObject is a physical object which appears in the scene.
 * If you don't need physical presence then just use TrackedObject directly!
 */
class GameObject<State extends GameObjectState> extends TrackedObject<State> {
  // If highlighting is enabled, the main mesh is what will be highlighted.
  mainMesh: Mesh | undefined;

  selectable: boolean = true;

  // The client (grabber) which currently controls this object.
  owner: string | null = null;

  // Whether smooth movement is enabled.
  smoothMovement: Boolean = true;
  smoothCoefficient: number = 1 / 6;
  smoothPosition: Vector3 | null = null;

  constructor(initialState: State) {
    super(initialState);

    this.state.position.addHook(([{ x, y, z }]) => {
      if (this.smoothMovement) {
        if (this.smoothPosition) this.smoothPosition.set(x, y, z);
        else this.smoothPosition = new Vector3(x, y, z);
      } else {
        this.position.set(x, y, z);
      }
    });
    this.state.owner.addHook(([newOwner]) => {
      this.owner = newOwner;
    });
    this.state.selectable.addHook(([newSelectable]) => {
      this.selectable = newSelectable;
    });

    const global = (window as any) as GlobalAccess;
    global.scene.add(this);
  }

  kill() {
    const global = (window as any) as GlobalAccess;
    global.scene.remove(this);
  }

  add(...os: any[]) {
    os.forEach((o) => {
      if (o instanceof GameObject) {
        Log.Warn(
          "Do NOT add GameObjects as children of other GameObjects." +
            " It will be harder to track their state," +
            " and positions will be wrong when dragging.\n" +
            `${this.constructor.name} -> ${o.constructor.name}`
        );
      }
    });
    super.add(...os);
    return this;
  }

  update(delta: number) {
    // Do smooth positional update
    if (this.smoothPosition) {
      const diff = this.smoothPosition.clone().sub(this.position);
      const dist = diff.length();

      this.position.addScaledVector(diff, this.smoothCoefficient);

      // Arbitrarily set the snapping distance to 1cm
      if (dist < 0.001) {
        // Good enough for government work
        this.position.copy(this.smoothPosition);
        this.smoothPosition = null;
      }
    }

    // Allow for custom update hooks!
    this.event("update");
  }
}

export default GameObject;
