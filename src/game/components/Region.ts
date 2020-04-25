import GameComponent, { GameComponentState } from "./GameComponent";
import { Pos3, Quat, Dim3 } from "../StateStructures";
import Authority from "../managers/Authority";
import {
  BoxBufferGeometry,
  EdgesGeometry,
  LineSegments,
  MeshBasicMaterial,
  Box3,
  Vector3,
  Matrix4,
} from "three";

type RegionConstructorData = {
  pos: Pos3;
  quat?: Quat;
  dim: Dim3;
  clientId?: string;
};

type RegionState = GameComponentState & {
  objectIds: string[];
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

  constructor({ pos, quat, clientId, dim }: RegionConstructorData) {
    super({
      selectable: false,
      grabbable: false,
      owner: clientId ?? null,
      grabber: null,
      position: pos,
      quaternion: quat ?? { x: 0, y: 0, z: 0, w: 0 },
      objectIds: [],
    });

    Region.AllRegions.push(this);

    this.dimensions = { ...dim, height: 0.1 };

    this.helperMesh = this.makeHelperGeometry();
  }

  checkContains(p: Pos3) {
    const point = new Vector3(p.x, p.y, p.z);
    const pos = this.state.position.get();
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
    const geom = new BoxBufferGeometry(dim.width, dim.height, dim.depth);
    const edges = new EdgesGeometry(geom);
    const line = new LineSegments(
      edges,
      new MeshBasicMaterial({ color: "#ffffff" })
    );
    this.add(line);
    line.position.setY(dim.height / 2 + 0.0005);
    return line;
  }

  /**
   * Callback for when an object is picked up in the region.
   * @param objId The object's identifier.
   */
  objectTaken(objId: string) {}

  /**
   * Callback for when an object is dropped in the region.
   * @param objId
   */
  objectDropped(objId: string) {}

  /**
   * Callback for when an object is moved out of the region.
   * @param objId
   */
  objectLeft(objId: string) {
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
    const objects = this.state.objectIds.get();
    const objIdx = objects.indexOf(objId);
    if (objIdx !== -1) return;
    objects.push(objId);
    this.state.objectIds.set(objects);
    this.event("object enter", objId);
  }
}

export default Region;
