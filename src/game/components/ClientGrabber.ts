import Grabber from "./Grabber";
import { Raycaster, PlaneHelper, Intersection, Mesh } from "three";
import GameComponent, { GameComponentState } from "./GameComponent";
import Game from "../Game";
import Input from "../managers/Input";
import Authority from "../managers/Authority";
import StateManager from "../managers/StateManager";
import Region from "./Region";
import Tooltip from "../managers/Tooltip";

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

    Game.instance.scene.add(this);

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
    Tooltip.Set(this.lastHighlighted?.name ?? null);

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

    const pos = this.state.position.get();

    // We don't tell the network, since they'll do this update themselves.
    obj.state.position.set(
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
        this.state.position.set({ x: loc.x, y: loc.y, z: loc.z });
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

export default ClientGrabber;
