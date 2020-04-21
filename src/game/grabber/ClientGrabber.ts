import { Raycaster, Mesh, PlaneHelper, Intersection } from "three";
import { GlobalAccess } from "../../GameRenderer";
import { GameObject } from "../Game";
import Grabber from "./Grabber";
import Input from "../Input";

/**
 * The client's personal grabber, which they can change the state of
 * with the mouse.
 */
class ClientGrabber extends Grabber {
  raycaster: Raycaster = new Raycaster();
  mousePressed: boolean = false;
  planeHelper: PlaneHelper | null = null;
  intersect: Intersection | null = null;

  constructor(clientId: string) {
    super(clientId, false);

    this.smoothMovement = false;

    const { scene } = (window as any) as GlobalAccess;
    scene.add(this);

    window.addEventListener("mousedown", this.grab.bind(this));
    window.addEventListener("mouseup", this.release.bind(this));
  }

  grab() {
    this.mousePressed = true;
  }
  release() {
    this.mousePressed = false;
  }

  update(delta: number) {
    super.update(delta);

    const { scene, camera } = (window as any) as GlobalAccess;

    this.raycaster.setFromCamera(Input.mouse, camera);

    // List all objects which are viable targets
    const collidables: Mesh[] = [];
    scene.traverseVisible((o) => {
      if (o instanceof GameObject) {
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

      if (this.intersect !== intersect) {
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
    const ident = obj ? obj.identifier : null;

    let newSelection: string | null = ident;
    if (obj) {
      if (!obj.mainMesh) newSelection = null;
      if (!obj.selectable) newSelection = null;
    }

    if (newSelection !== this.state.highlightId.get()) {
      this.setState({
        highlightId: newSelection,
        visible: newSelection !== null,
      });
    }
  }
}

export default ClientGrabber;
