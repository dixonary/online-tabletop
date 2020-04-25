import GameComponent, { GameComponentState } from "./GameComponent";
import { SphereBufferGeometry, MeshBasicMaterial, Mesh } from "three";
import StateManager from "../managers/StateManager";
import Game from "../Game";
import Region from "./Region";

type GrabberState = {
  visible: boolean;
  highlightedObject: string | null;
  grabbedObject: string | null;
};

/**
 * A grabber is the thing that a player picks things up with.
 */
class Grabber extends GameComponent<GrabberState & GameComponentState> {
  // The distance that held objects should float.
  static FloatHeight: number = 0.05;

  constructor(clientId: string, hasGeometry: boolean = true) {
    super({
      position: { x: 0, y: 0, z: 0 },
      quaternion: { x: 0, y: 0, z: 0, w: 0 },
      owner: clientId,
      grabber: null,
      selectable: false,
      visible: false,
      highlightedObject: null,
      grabbedObject: null,
      grabbable: false,
    });

    this.visible = false;

    if (hasGeometry) this.createGeometry();

    this.state.visible.addHook((vis) => {
      this.visible = vis;
    });

    this.state.highlightedObject.addHook((id) => this.updateOutline(id));
  }

  grab(objId: string) {
    // We must be highlighting something
    const obj = StateManager.GetObject<GameComponent<GameComponentState>>(
      objId
    )!;
    if (!obj.state.grabbable.get()) return;
    if (obj.state.grabber.get()) return;

    this.state.grabbedObject.set(objId);
    obj.state.grabber.set(this.identifier);
    obj.state.owner.set(this.state.owner.get());

    for (let region of Region.AllRegions) {
      if (region.has(objId)) region.objectDropped(objId);
    }

    obj.event("grab", this.identifier);
  }

  release() {
    const grabbed = this.state.grabbedObject.get();
    if (!grabbed) return;
    const obj = StateManager.GetObject<GameComponent<GameComponentState>>(
      grabbed
    )!;
    if (obj.state.grabber.get() !== this.identifier) return;
    this.state.grabbedObject.set(null);

    // Check if the object was dropped into a region
    let newOwner = null;
    for (let region of Region.AllRegions) {
      if (region.has(grabbed)) {
        newOwner = region.state.owner.get();
        break;
      }
    }
    obj.state.owner.set(newOwner);
    obj.state.grabber.set(null);

    for (let region of Region.AllRegions) {
      if (region.has(grabbed)) {
        region.objectTaken(grabbed);
        break;
      }
    }

    obj.event("release", this.identifier);
  }

  /**
   * Update the outline pass to inform it of the new selection.
   * @param id The new id to outline.
   */
  updateOutline(id: string | null) {
    const selection = Game.instance.outlinePass.selectedObjects;

    // Remove old highlighted object
    const highlight = this.state.highlightedObject.get();
    if (highlight) {
      const old = StateManager.GetObject(highlight);
      if (old instanceof GameComponent) {
        const oldMain = old.mainMesh;
        if (oldMain) {
          selection.splice(selection.indexOf(oldMain), 1);
        }
      }
    }

    // Set new highlighted object
    if (id) {
      const newObj = StateManager.GetObject(id);
      if (newObj instanceof GameComponent) {
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

export default Grabber;
