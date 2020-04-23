import GameObject, { GameObjectState } from "./GameObject";
import {
  SphereBufferGeometry,
  MeshBasicMaterial,
  Mesh,
  Raycaster,
  PlaneHelper,
  Intersection,
} from "three";
import StateManager from "../managers/StateManager";
import Game from "../Game";
import Authority from "../managers/Authority";
import Input from "../managers/Input";

type GrabberState = {
  visible: boolean;
  highlightedObject: string | null;
  grabbedObject: string | null;
};

/**
 * A grabber is the thing that a player picks things up with.
 */
class Grabber extends GameObject<GrabberState & GameObjectState> {
  clientID: string;

  constructor(clientID: string, hasGeometry: boolean = true) {
    super({
      position: { x: 0, y: 0, z: 0 },
      owner: clientID,
      selectable: false,
      visible: false,
      highlightedObject: null,
      grabbedObject: null,
      grabbable: false,
    });

    this.visible = false;
    this.clientID = clientID;

    if (hasGeometry) this.createGeometry();

    this.state.visible.addHook((vis) => {
      this.visible = vis;
    });

    this.state.highlightedObject.addHook((id) => this.updateHighlight(id));
  }

  grab(objId: string) {
    // We must be highlighting something
    const obj = StateManager.GetObject<GameObject<GameObjectState>>(objId)!;
    if (obj.state.owner.get() !== null) return;
    if (!obj.state.grabbable.get()) return;

    this.setState({ grabbedObject: objId });
    obj.setState({ owner: this.identifier });
  }

  release() {
    const grabbed = this.state.grabbedObject.get();
    if (!grabbed) return;
    const obj = StateManager.GetObject<GameObject<GameObjectState>>(grabbed)!;
    if (obj.state.owner.get() !== this.identifier) return;
    this.setState({ grabbedObject: null });
    obj.setState({ owner: null });
  }

  update(delta: number) {
    super.update(delta);
    const grabbed = this.state.grabbedObject.get();
    if (grabbed) {
      const obj = StateManager.GetObject<GameObject<GameObjectState>>(grabbed)!;

      const pos = this.state.position.get();
      // We don't tell the network, since they'll do it themselves.
      obj.state.position.set({ x: pos.x, y: pos.y + 0.02, z: pos.z }, true);
    }
  }

  updateHighlight(id: string | null) {
    const selection = Game.instance.outlinePass.selectedObjects;

    // Remove old highlighted object
    const highlight = this.state.highlightedObject.get();
    if (highlight) {
      const old = StateManager.GetObject(highlight);
      if (old instanceof GameObject) {
        const oldMain = old.mainMesh;
        if (oldMain) {
          selection.splice(selection.indexOf(oldMain), 1);
        }
      }
    }

    // Set new highlighted object
    if (id) {
      const newObj = StateManager.GetObject(id);
      if (newObj instanceof GameObject) {
        const newMain = newObj.mainMesh;
        if (newMain) {
          selection.push(newMain);
        }
      }
    }
  }

  createGeometry() {
    const geometry = new SphereBufferGeometry(0.01);
    const material = new MeshBasicMaterial({
      color: Math.floor(Math.random() * 0xffffff),
    });
    const entity = new Mesh(geometry, material);
    this.add(entity);
  }
}

/**
 * The client's personal grabber, which they can change the state of
 * with the mouse.
 */
class ClientGrabber extends Grabber {
  raycaster: Raycaster = new Raycaster();
  planeHelper: PlaneHelper | null = null;
  intersect: Intersection | null = null;

  lastHighlighted: GameObject<GameObjectState> | null = null;

  static instance: ClientGrabber;

  constructor(clientId: string) {
    super(clientId, false);

    this.smoothMovement = false;

    Game.instance.scene.add(this);

    window.addEventListener("mousedown", () => {
      const currentHighlight = this.state.highlightedObject.get();
      if (!currentHighlight) return;

      Authority.Do(this, this.grab, currentHighlight);
    });

    window.addEventListener("mouseup", () => Authority.Do(this, this.release));

    ClientGrabber.instance = this;
  }

  update(delta: number) {
    super.update(delta);

    this.raycaster.setFromCamera(Input.mouse.position, Game.instance.camera);

    // List all objects which are viable targets
    const collidables: Mesh[] = [];
    Game.instance.scene.traverseVisible((o) => {
      if (o instanceof GameObject) {
        const go = o as GameObject<GameObjectState>;
        if (go.identifier === this.state.grabbedObject.get()) return;

        const mainMesh = (o as GameObject<any>).mainMesh;
        if (mainMesh) collidables.push(mainMesh);
      }
    });

    // Find which of those intersect our picking ray
    var intersects = this.raycaster.intersectObjects(collidables);

    // Only consider the closest such object
    if (intersects[0]) {
      if (!this.state.visible.get()) {
        this.setState({ visible: true });
      }

      const intersect = intersects[0];
      const newLoc = intersect.point;
      const oldLoc = this.intersect?.point;

      // If the pointer has moved at least 1mm in space
      if (oldLoc === undefined || newLoc.distanceTo(oldLoc) > 0.001) {
        // Move the pointer
        let loc = intersects[0].point;
        this.setState({ position: { x: loc.x, y: loc.y, z: loc.z } });
        this.intersect = intersect;
      }

      //The parent is a GameObject by definition
      const obj = intersect.object.parent as GameObject<any>;
      this.setSelection(obj);
    } else {
      this.setSelection(null);
    }
  }

  /**
   * Replace the currently highlighted object with a different one, or none.
   * @param obj The new object to highlight, or null.
   */
  setSelection(obj: GameObject<any> | null) {
    const prevSelection = this.state.highlightedObject.get();
    let newSelection: string | null = obj ? obj.identifier : null;

    if (obj) {
      if (!obj.mainMesh) newSelection = null;
      if (!obj.state.selectable.get()) newSelection = null;
    }

    if (newSelection !== prevSelection) {
      this.setState({
        highlightedObject: newSelection,
        visible: newSelection !== null,
      });

      if (Input.mouse.pressed) {
        const over = newSelection !== null && prevSelection === null;
        const out = newSelection === null && prevSelection !== null;
        if (over) obj!.event("drag_over", this);
        if (out) this.lastHighlighted!.event("drag_out", this);
      }

      this.lastHighlighted = newSelection !== null ? obj : null;
    }
  }
}

export default Grabber;
export { ClientGrabber };
