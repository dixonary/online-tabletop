import { Mesh, Vector3, Quaternion } from "three";
import Log from "../Log";
import { Pos3, Quat } from "../StateStructures";
import TrackedObject from "../TrackedObject";
import * as CANNON from "cannon";

export type GameComponentState = {
  position: Pos3; // The position of the object.
  quaternion: Quat;
  owner: string | null; // The ID of the person who has ownership over the component.
  selectable: boolean;
  grabbable: boolean;
  grabber: string | null;
};

/**
 * A GameComponent is a physical object which appears in the scene.
 * There is a lot of functionality packed in here.
 * If you don't need physical presence then just use TrackedObject directly!
 */
class GameComponent<State extends GameComponentState> extends TrackedObject<
  State
> {
  // If highlighting is enabled, the main mesh is what will be highlighted.
  mainMesh: Mesh | undefined;

  // Whether smooth movement is enabled.
  smoothMovement: boolean = true;
  smoothCoefficient: number = 1 / 5;
  smoothPosition: Vector3 | null = null;

  smoothRotation: boolean = true;
  smoothQuaternion: Quaternion | null = null;

  bodyFollowsObject: boolean = false;

  tooltipText: string | null = null;

  body: CANNON.Body | null = null;

  constructor(initialState: State) {
    super({ ...initialState, grabber: null });

    this.position.set(
      initialState.position.x,
      initialState.position.y,
      initialState.position.z
    );

    this.state.position.addHook((newPos) => {
      if (this.smoothMovement) {
        if (!this.smoothPosition) this.smoothPosition = new Vector3();
        this.smoothPosition.set(newPos.x, newPos.y, newPos.z);
      } else {
        this.position.set(newPos.x, newPos.y, newPos.z);
      }
    });

    this.state.quaternion.addHook((newQuat) => {
      if (this.smoothMovement) {
        if (!this.smoothQuaternion) this.smoothQuaternion = new Quaternion();
        this.smoothQuaternion.set(newQuat.x, newQuat.y, newQuat.z, newQuat.w);
      } else {
        this.quaternion.set(newQuat.x, newQuat.y, newQuat.z, newQuat.w);
      }
    });

    // Force the body to be where the object is if its position is updated
    this.state.position.addHook(({ x, y, z }) => {
      this.body?.position.set(x, y, z);
      this.body?.velocity.set(0, 0, 0);
    });
    this.state.quaternion.addHook(({ x, y, z, w }) => {
      this.body?.quaternion.set(x, y, z, w);
      this.body?.velocity.set(0, 0, 0);
    });

    this.state.grabber.addHook((newGrabber) => {
      this.bodyFollowsObject = newGrabber !== null;
    });
  }

  add(...os: any[]) {
    os.forEach((o) => {
      if (o instanceof GameComponent) {
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
    super.update(delta);
    if (this.constructor.name === "Card") console.log(this.state.owner.get());

    if (this.body && !this.bodyFollowsObject) {
      const bodyPos = this.body.position;
      const bodyQuat = this.body.quaternion;
      this.position.set(bodyPos.x, bodyPos.y, bodyPos.z);
      this.quaternion.set(bodyQuat.x, bodyQuat.y, bodyQuat.z, bodyQuat.w);
    }

    // Do smooth positional update
    if (this.smoothPosition) {
      const dist = this.smoothPosition.distanceTo(this.position);

      // Arbitrarily set the snapping distance to 1cm
      if (dist < 0.001) {
        // Good enough for government work
        this.position.copy(this.smoothPosition);
        this.smoothPosition = null;
      } else {
        this.position.lerp(this.smoothPosition, this.smoothCoefficient);
      }

      // this.body?.velocity.setZero();
    }

    if (this.smoothQuaternion) {
      // Arbitrarily set the snapping dot product to 0.95
      if (this.quaternion.dot(this.smoothQuaternion) > 0.99) {
        this.quaternion.copy(this.smoothQuaternion);
        this.smoothQuaternion = null;
      } else {
        this.quaternion.slerp(this.smoothQuaternion, this.smoothCoefficient);
      }
    }
  }
}

export default GameComponent;
