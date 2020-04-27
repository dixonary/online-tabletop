import { Mesh, Vector3, Quaternion } from "three";
import Log from "../managers/Log";
import { Pos3, Quat } from "../StateStructures";
import TrackedObject from "../TrackedObject";
import * as CANNON from "cannon";
import Physics from "../managers/Physics";
import Game from "../Game";

export type GameComponentState = {
  pos: Pos3; // The position of the object.
  quat: Quat;
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
      initialState.pos.x,
      initialState.pos.y,
      initialState.pos.z
    );

    this.tooltipText = this.constructor.name;
    this.name = this.constructor.name;

    this.state.pos.addHook(this.updatePosition.bind(this));
    this.state.quat.addHook(this.updateQuaternion.bind(this));

    this.state.grabber.addHook((newGrabber) => {
      this.bodyFollowsObject = newGrabber !== null;
    });
  }

  updatePosition({ x, y, z }: Pos3) {
    if (this.smoothMovement) {
      if (!this.smoothPosition) this.smoothPosition = new Vector3();
      this.smoothPosition.set(x, y, z);
    } else {
      this.position.set(x, y, z);
    }

    this.body?.position.set(x, y, z);
    this.body?.velocity.set(0, 0, 0);
  }

  updateQuaternion({ x, y, z, w }: Quat) {
    if (this.smoothMovement) {
      if (!this.smoothQuaternion) this.smoothQuaternion = new Quaternion();
      this.smoothQuaternion.set(x, y, z, w);
    } else {
      this.quaternion.set(x, y, z, w);
    }
    this.body?.quaternion.set(x, y, z, w);
    this.body?.velocity.set(0, 0, 0);
  }

  /**
   * Add an Object3D as a child of this object.
   * You should NOT add GameComponents as children!
   */
  add(...os: any[]) {
    os.forEach((o) => {
      if (o instanceof GameComponent) {
        Log.Warn(
          "Do NOT add GameComponents as children of other GameComponents." +
            " It will be harder to track their state," +
            " and positions will be wrong when dragging.\n" +
            `${this.constructor.name} -> ${o.constructor.name}`
        );
      }
    });
    super.add(...os);
    return this;
  }

  dispose() {
    super.dispose();
    if (this.mainMesh) {
      this.remove(this.mainMesh);
    }
    if (this.body) {
      Physics.world.remove(this.body);
    }
  }

  /**
   * Add a physics body to this object. Assigning a body more than once
   * during the lifetime of the object is an error.
   * @param body The body to assign.
   */
  setBody(body: CANNON.Body) {
    if (this.body !== null) {
      Log.Error(`${this.constructor.name} had its body set more than once.`);
      return;
    }

    this.body = body;

    Physics.world.addBody(body);

    this.state.grabber.addHook((grabberId) => {
      if (grabberId === null) Physics.world.addBody(body);
      else Physics.world.remove(body);
    });
  }

  update(delta: number) {
    super.update(delta);

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
