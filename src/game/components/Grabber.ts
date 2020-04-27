import GameComponent, { GameComponentState } from "./GameComponent";
import { SphereBufferGeometry, MeshBasicMaterial, Mesh } from "three";
import StateManager from "../managers/StateManager";
import Game from "../Game";
import Region from "./Region";
import Authority from "../managers/Authority";

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
      pos: { x: 0, y: 0, z: 0 },
      quat: { x: 0, y: 0, z: 0, w: 0 },
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

  getIdentifierToken(initialState: GrabberState & GameComponentState) {
    return `Grabber_${initialState.owner}`;
  }

  grab(objId: string) {
    if (!Authority.RequireAuthority()) return;
    // We must be highlighting something
    const obj = StateManager.GetObject<GameComponent<GameComponentState>>(
      objId
    )!;
    if (!obj.state.grabbable.get()) return;
    if (obj.state.grabber.get()) return;

    this.state.grabbedObject.set(objId);
    obj.state.grabber.set(this.identifier);

    for (let region of Region.AllRegions) {
      if (region.has(objId)) region.objectTaken(objId);
    }

    obj.event("grab", this.identifier);

    for (let region of Region.AllRegions) {
      region.state.visible.set(true);
    }
  }

  release() {
    if (!Authority.RequireAuthority()) return;
    const grabbed = this.state.grabbedObject.get();
    if (!grabbed) return;
    const obj = StateManager.GetObject<GameComponent<GameComponentState>>(
      grabbed
    )!;
    if (obj.state.grabber.get() !== this.identifier) return;
    this.state.grabbedObject.set(null);

    obj.state.grabber.set(null);

    for (let region of Region.AllRegions) {
      if (region.has(grabbed)) {
        region.objectDropped(grabbed);
        break;
      }
    }

    for (let region of Region.AllRegions) {
      region.state.visible.set(false);
    }

    obj.event("release", this.identifier);
  }

  /**
   * Update the outline pass to inform it of the new selection.
   * @param id The new id to outline.
   */
  updateOutline(id: string | null) {
    // There was a weird bug that arose when the selectedObjects array
    // was altered directly. This is much safer!
    const selection = new Set(Game.instance.outlinePass.selectedObjects);

    // Remove old highlighted object
    const highlight = this.state.highlightedObject.get();
    if (highlight) {
      const old = StateManager.GetObject(highlight);
      if (old instanceof GameComponent) {
        const oldMain = old.mainMesh;
        if (oldMain) selection.delete(oldMain);
      }
    }

    // Set new highlighted object
    if (id) {
      const newObj = StateManager.GetObject(id);
      if (newObj instanceof GameComponent) {
        const newMain = newObj.mainMesh;
        if (newMain) selection.add(newMain);
      }
    }

    Game.instance.outlinePass.selectedObjects = Array.from(selection);
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
