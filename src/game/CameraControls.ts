import { Raycaster, Vector3, Plane, Box3, PerspectiveCamera } from "three";
import BasicObject from "./BasicObject";
import { Input, Log } from "./manager/";
import { ClientSeat } from "./component/Seat";
import { ClientGrabber } from "./component/Grabber";

class CameraControls extends BasicObject {
  private camera: PerspectiveCamera;

  private raycaster: Raycaster = new Raycaster();

  // Todo: Make this dynamic? Maybe set based on tabletop height?
  private panPlaneHeight: number = 1;
  private panPlane: Plane;

  private dragLast: Vector3 = new Vector3();
  private dragCurrent: Vector3 = new Vector3();

  private resetPositionCallback = this.resetPosition.bind(this);

  private cameraBounds: Box3;
  private panning: boolean = false;

  private zoomTarget: number | null = 0;
  private smoothZoomCoefficient: number = 0.4;

  constructor(camera: PerspectiveCamera) {
    super();
    this.camera = camera;
    this.panPlane = new Plane(new Vector3(0, -1, 0), this.panPlaneHeight);

    this.cameraBounds = new Box3(new Vector3(-2, 0, -2), new Vector3(2, 3, 2));

    window.addEventListener("keydown", this.resetPositionCallback);
  }

  dispose() {
    window.removeEventListener("keydown", this.resetPositionCallback);
    super.dispose();
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

    this.updateZoom();
    this.updatePan();
  }

  updateZoom() {
    if (
      Input.mouse.scrollDelta !== 0 &&
      ClientGrabber.instance &&
      ClientGrabber.instance.state.grabbedObject.get() === null
    ) {
      if (!this.zoomTarget) this.zoomTarget = this.camera.zoom;
      this.zoomTarget *= Math.pow(1.1, -Input.mouse.scrollDelta);
      this.zoomTarget = Math.max(this.zoomTarget, 1);
      this.zoomTarget = Math.min(this.zoomTarget, 4);
    }

    if (this.zoomTarget) {
      const diff = this.zoomTarget - this.camera.zoom;

      if (Math.abs(diff) < 0.01) {
        this.camera.zoom = this.zoomTarget;
        this.zoomTarget = null;
      } else {
        this.camera.zoom +=
          (this.zoomTarget - this.camera.zoom) * this.smoothZoomCoefficient;
      }

      this.camera.updateProjectionMatrix();
    }
  }

  updatePan() {
    const coll = this.computeRay();

    if (
      Input.mouse.justPressed &&
      ClientGrabber.instance &&
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
      } else Log.Warn("Couldn't find the panning plane!");
    }
  }
}

export default CameraControls;
