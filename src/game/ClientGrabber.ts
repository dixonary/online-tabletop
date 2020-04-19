import { Raycaster, Vector2, Mesh, Plane, Vector3, PlaneHelper } from "three";
import { GlobalAccess } from "../GameRenderer";
import { GameObject } from "./Game";
import Grabber from "./Grabber";
import Log from "./Log";

class ClientGrabber extends Grabber {
  raycaster: Raycaster = new Raycaster();
  mouse: Vector2;
  mousePressed: boolean = false;
  highlighted: GameObject | null = null;
  planeHelper: PlaneHelper | null = null;

  constructor(mouse: Vector2) {
    super();
    this.mouse = mouse;

    const { scene } = (window as any) as GlobalAccess;
    scene.add(this);

    window.addEventListener("mousedown", this.grab.bind(this));
    window.addEventListener("mouseup", this.release.bind(this));
  }

  grab() {
    this.mousePressed = true;

    if (this.highlighted) {
      this.attachObject(this.highlighted);
    }
  }
  release() {
    this.mousePressed = false;
    if (this.attached) {
      this.detachObject();
    }
  }

  update(delta: number) {
    const { scene, camera } = (window as any) as GlobalAccess;

    this.raycaster.setFromCamera(this.mouse, camera);

    // Update position while attached
    if (this.attached) {
      const newPos = new Vector3(0, 0, 0);
      const plane = new Plane(new Vector3(0, -1, 0), this.position.y);
      if (this.planeHelper) {
        scene.remove(this.planeHelper);
      }
      scene.add((this.planeHelper = new PlaneHelper(plane, 1)));
      this.raycaster.ray.intersectPlane(plane, newPos);
      this.position.copy(newPos);
      this.attached.position.copy(this.position);
    }

    // List all objects which are viable targets
    const collidables: Mesh[] = [];
    scene.traverseVisible((o) => {
      if (o instanceof GameObject) {
        const main = (o as GameObject).main;
        if (main) collidables.push(main);
      }
    });

    // Find which of those intersect our picking ray
    var intersects = this.raycaster.intersectObjects(collidables);

    // Only consider the closest such object
    if (intersects[0]) {
      //The parent is a GameObject by definition
      this.changeSelection(intersects[0].object.parent as GameObject);
    } else {
      this.deselect();
    }

    // Update the highlight (position, rotation, etc)
    if (this.highlighted) {
      this.highlighted.runCallback("highlight_update");
    }
  }

  changeSelection(newHighlight: GameObject) {
    // This is meaningless if the highlight is unchanged
    if (newHighlight === this.highlighted) return;

    // Deselect the current thing, if there is one
    if (this.highlighted) {
      this.highlighted.runCallback("highlight_off");

      if (this.mousePressed) {
        this.highlighted.runCallback("drag_out", this);
      }
    }

    // Only continue if permitted
    if (newHighlight.runCallback("highlight_on")) {
      Log.Info("Highlighted " + newHighlight.constructor.name);
      this.highlighted = newHighlight;
    } else {
      this.highlighted = null;
    }
  }

  deselect() {
    if (!this.highlighted) return;

    if (this.mousePressed) {
      this.highlighted.runCallback("drag_out", this);
    }

    // Only deselect if permitted
    if (this.highlighted.runCallback("highlight_off")) {
      Log.Info("De-highlighted " + this.highlighted.constructor.name);
      this.highlighted = null;
    }
  }
}

export default ClientGrabber;
