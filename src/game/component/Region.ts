import {
  BoxBufferGeometry,
  EdgesGeometry,
  LineSegments,
  MeshBasicMaterial,
  Box3,
  Vector3,
  Matrix4,
} from "three";
import { GameComponent } from "./";
import { GameComponentState } from "./GameComponent";
import { Pos3, Quat, Dim3 } from "../StateStructures";
import { StateManager } from "../manager/";

type RegionConstructorData = {
  pos: Pos3;
  quat?: Quat;
  dim: Dim3;
  uid?: string;
};

type RegionState = GameComponentState & {
  objectIds: string[];
  visible: boolean;
};

/**
 * A region is an area which can take actions when objects are added to it
 * or removed from it. The basic region has almost no behaviours, but it is
 * augmented by classes which extend it.
 *
 * The ClientGrabber informs the Region when objects change with respect to it.
 */
class Region extends GameComponent<RegionState> {
  static AllRegions: Region[] = [];

  dimensions: Dim3;
  helperMesh: LineSegments;

  constructor({ pos, quat, uid, dim }: RegionConstructorData) {
    super({
      selectable: false,
      grabbable: false,
      owner: uid ?? null,
      grabber: null,
      pos: pos,
      quat: quat ?? { x: 0, y: 0, z: 0, w: 0 },
      objectIds: [],
      visible: false,
    });

    Region.AllRegions.push(this);

    this.dimensions = { ...dim, height: 1 };

    this.helperMesh = this.makeHelperGeometry();

    this.visible = this.state.visible.get();
    this.state.visible.addHook((newVis) => {
      this.visible = newVis;
    });
  }

  dispose() {
    super.dispose();
    Region.AllRegions.splice(Region.AllRegions.indexOf(this), 1);
  }

  checkContains(p: Pos3) {
    const point = new Vector3(p.x, p.y, p.z);
    const pos = this.state.pos.get();
    const dim = this.dimensions;
    const box = new Box3(
      new Vector3(pos.x - dim.width / 2, pos.y, pos.z - dim.depth / 2),
      new Vector3(pos.x + dim.width / 2, pos.y + 10, pos.z + dim.depth / 2)
    );
    // Rotate the box to meet the rotation of ourself
    const rot: Matrix4 = new Matrix4();
    rot.extractRotation(this.matrixWorld);
    box.applyMatrix4(rot);

    return box.containsPoint(point);
  }

  has(objectId: string) {
    const objectIds = this.state.objectIds.get();
    return objectIds.indexOf(objectId) !== -1;
  }

  /**
   * Add a simple box which shows the extents of the region.
   */
  makeHelperGeometry() {
    const dim = this.dimensions;
    const helperHeight = 0.001; // 1mm
    const geom = new BoxBufferGeometry(dim.width, helperHeight, dim.depth);
    const edges = new EdgesGeometry(geom);
    const line = new LineSegments(
      edges,
      new MeshBasicMaterial({ color: "#ffffff" })
    );
    this.add(line);
    line.position.setY(helperHeight / 2 + 0.0005);
    return line;
  }

  /**
   * Callback for when an object is picked up in the region.
   * @param objId The object's identifier.
   */
  objectTaken(objId: string) {
    this.event("object take", objId);
  }

  /**
   * Callback for when an object is dropped in the region.
   * @param objId
   */
  objectDropped(objId: string) {
    this.event("object drop", objId);
  }

  /**
   * Callback for when an object is moved out of the region.
   * @param objId
   */
  objectLeft(objId: string) {
    const obj = StateManager.GetObject(objId);
    if (!obj) return;
    obj.state.owner.set(null);

    const objects = this.state.objectIds.get();
    const objIdx = objects.indexOf(objId);
    if (objIdx === -1) return;
    objects.splice(objIdx, 1);
    this.state.objectIds.set(objects);
    this.event("object leave", objId);
  }

  /**
   * Callback for when an object is moved into the region.
   * @param objId The object's identifier.
   */
  objectEntered(objId: string) {
    const obj = StateManager.GetObject(objId);
    if (!obj) return;
    obj.state.owner.set(this.state.owner.get());

    const objects = this.state.objectIds.get();
    const objIdx = objects.indexOf(objId);
    if (objIdx !== -1) return;
    objects.push(objId);
    this.state.objectIds.set(objects);
    this.event("object enter", objId);
  }
}

export default Region;
