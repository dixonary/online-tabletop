import { Camera, Raycaster, Vector3, Plane, Box3 } from "three";
import BasicObject from "./BasicObject";
import Input from "./managers/Input";
import { ClientSeat } from "./components/Seat";
import { ClientGrabber } from "./components/Grabber";

class CameraControls extends BasicObject {
  private camera: Camera;

  private raycaster: Raycaster = new Raycaster();

  // Todo: Make this dynamic? Maybe set based on tabletop height?
  private panPlaneHeight: number = 1;
  private panPlane: Plane;

  private dragLast: Vector3 = new Vector3();
  private dragCurrent: Vector3 = new Vector3();

  private resetPositionCallback = this.resetPosition.bind(this);

  private cameraBounds: Box3;
  private panning: boolean = false;

  constructor(camera: Camera) {
    super();
    this.camera = camera;
    this.panPlane = new Plane(new Vector3(0, -1, 0), this.panPlaneHeight);

    this.cameraBounds = new Box3(new Vector3(-2, 0, -2), new Vector3(2, 3, 2));

    window.addEventListener("keydown", this.resetPositionCallback);
  }

  kill() {
    window.removeEventListener("keydown", this.resetPositionCallback);
    super.kill();
  }

  resetPosition(e: Event) {
    let ke = e as KeyboardEvent;
    if (ke.key !== "r") return;

    if (!ClientSeat.instance) return;
    this.camera.position.copy(ClientSeat.instance.position);
    const center = ClientSeat.instance.center;
    this.camera.lookAt(center.x, center.y, center.z);
  }

  setPanHeight(h: number) {
    this.panPlaneHeight = h;
    this.panPlane.set(this.panPlane.normal, this.panPlaneHeight);
  }

  computeRay(): boolean {
    this.raycaster.setFromCamera(Input.mouse.position, this.camera);

    const coll = this.raycaster.ray.intersectPlane(
      this.panPlane,
      this.dragCurrent
    );
    return coll !== null;
  }

  update(delta: number) {
    super.update(delta);

    const coll = this.computeRay();

    if (
      Input.mouse.justPressed &&
      ClientGrabber.instance.state.highlightedObject.get() === null &&
      ClientGrabber.instance.state.grabbedObject.get() === null
    ) {
      this.panning = true;
    }

    if (Input.mouse.justReleased) {
      this.panning = false;
    }

    if (this.panning) {
      if (coll) {
        if (Input.mouse.justPressed) {
          this.dragLast.copy(this.dragCurrent);
        }
        this.camera.position.sub(this.dragCurrent);
        this.camera.position.add(this.dragLast);

        this.cameraBounds.clampPoint(
          this.camera.position,
          this.camera.position
        );

        // Update the computed position
        this.camera.updateMatrixWorld();
        this.computeRay();
        this.dragLast.copy(this.dragCurrent);
      }
    }
  }
}

export default CameraControls;