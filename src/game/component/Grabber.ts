import {
  SphereBufferGeometry,
  MeshBasicMaterial,
  Mesh,
  Raycaster,
  PlaneHelper,
  Intersection,
} from "three";
import { GameComponent, Region } from "./";
import { GameComponentState } from "./GameComponent";
import { Input, Tooltip, Authority, StateManager } from "../manager";
import Game from "../Game";

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

/**
 * The client's personal grabber, which they can change the state of
 * with the mouse.
 *
 * All stateful changes to the grabbed object are made here (on the
 * client who grabbed the object). The Grabber superclass should not have
 * any logic about controlling and firing events driven by the player.
 */
class ClientGrabber extends Grabber {
  raycaster: Raycaster = new Raycaster();
  planeHelper: PlaneHelper | null = null;
  intersect: Intersection | null = null;

  lastHighlighted: GameComponent<GameComponentState> | null = null;

  static instance: ClientGrabber;

  constructor(clientId: string) {
    super(clientId, false);

    this.smoothMovement = false;

    ClientGrabber.instance = this;
  }

  update(delta: number) {
    super.update(delta);

    this.updateSelection();

    this.raycaster.setFromCamera(Input.mouse.position, Game.instance.camera);

    // Grab and release actions
    const currentHighlight = this.state.highlightedObject.get();
    if (Input.mouse.justPressed && currentHighlight) {
      Authority.Do(this, this.grab, currentHighlight);
    }

    if (Input.mouse.justReleased) {
      Authority.Do(this, this.release, currentHighlight);
    }

    // Update tooltip
    Tooltip.SetPosition(Input.mouse.positionRaw);
    Tooltip.Set(this.lastHighlighted?.tooltipText ?? null);

    this.updateGrabbedObject();
  }

  /**
   * Fire off relevant actions on the object that is currently grabbed.
   */
  updateGrabbedObject() {
    const grabbed = this.state.grabbedObject.get();
    if (!grabbed) return;

    const obj = StateManager.GetObject<GameComponent<GameComponentState>>(
      grabbed
    )!;

    const pos = this.state.pos.get();

    // We don't tell the network, since they'll do this update themselves.
    obj.state.pos.set(
      { x: pos.x, y: pos.y + Grabber.FloatHeight, z: pos.z },
      true
    );

    if (Input.mouse.justScrolled) {
      StateManager.GetObject(grabbed)!.event("held scroll", this.identifier);
    }

    for (let region of Region.AllRegions) {
      if (region.checkContains(pos) && !region.has(grabbed))
        region.objectEntered(grabbed);

      if (!region.checkContains(pos) && region.has(grabbed))
        region.objectLeft(grabbed);
    }
  }

  /**
   * Determine the highlighted object based on which objects are
   * currently under the mouse pointer.
   * We exclude the currently grabbed object, if there is one.
   */
  updateSelection() {
    // List all objects which are viable targets
    const collidables: Mesh[] = [];
    Game.instance.scene.traverseVisible((o) => {
      if (o instanceof GameComponent) {
        const go = o as GameComponent<GameComponentState>;
        if (go.identifier === this.state.grabbedObject.get()) return;

        const mainMesh = (o as GameComponent<any>).mainMesh;
        if (mainMesh) collidables.push(mainMesh);
      }
    });

    // Find which of those intersect our picking ray
    var intersects = this.raycaster.intersectObjects(collidables);

    // Only consider the closest such object
    if (intersects[0]) {
      if (!this.state.visible.get()) {
        this.state.visible.set(true);
      }

      const intersect = intersects[0];
      const newLoc = intersect.point;
      const oldLoc = this.intersect?.point;

      // If the pointer has moved at least 1mm in space
      if (oldLoc === undefined || newLoc.distanceTo(oldLoc) > 0.001) {
        // Move the pointer
        let loc = intersects[0].point;
        this.state.pos.set({ x: loc.x, y: loc.y, z: loc.z });
        this.intersect = intersect;
      }

      //The parent is a GameObject by definition
      const obj = intersect.object.parent as GameComponent<any>;
      this.setSelection(obj);
    } else {
      this.setSelection(null);
    }
  }

  /**
   * Replace the currently highlighted object with a different one, or none.
   * @param obj The new object to highlight, or null.
   */
  setSelection(obj: GameComponent<any> | null) {
    const prevSelection = this.state.highlightedObject.get();
    let newSelection: string | null = obj ? obj.identifier : null;

    if (obj) {
      if (!obj.mainMesh) newSelection = null;
      if (!obj.state.selectable.get()) newSelection = null;
    }

    if (newSelection !== prevSelection) {
      this.state.highlightedObject.set(newSelection);
      this.state.visible.set(newSelection !== null);

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
