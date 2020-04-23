import { STL, TextureList } from "../resource";
import GameObject from "./GameObject";
import {
  Mesh,
  Vector3,
  BufferGeometry,
  Material,
  Geometry,
  Box3,
  MeshStandardMaterial,
} from "three";
import { AutoUV, ResizeToFit } from "../GeometryTools";
import { Dim3, Pos3 } from "../StateStructures";

type TabletopState = {
  owner: string | null;
  dimensions: Dim3;
  position: Pos3;
  selectable: boolean;
  grabbable: boolean;
};

class Tabletop extends GameObject<TabletopState> {
  table: Mesh;

  constructor(dimensions: Dim3, position: Pos3 = { x: 0, y: 0, z: 0 }) {
    super({
      dimensions,
      position,
      owner: null,
      selectable: false,
      grabbable: false,
    });

    this.table = this.initialiseMesh();

    this.state.dimensions.addHook(({ width, height, depth }) => {
      this.scale.set(width, height, depth);
    });

    this.state.selectable.set(false);
  }

  initialiseMesh() {
    const table = new Mesh();

    let stl = STL.get(process.env.PUBLIC_URL + "/resources/tabletop.stl");

    const setupGeometry = (geometry: BufferGeometry) => {
      let geom = new Geometry().fromBufferGeometry(geometry);
      table.geometry = geom;

      geom.computeBoundingBox();
      ResizeToFit(geom, new Vector3(1, 1, 1));

      geom.computeFaceNormals();
      geom.computeVertexNormals();
      AutoUV(geom);

      table.geometry.computeBoundingBox();
      const bb = table.geometry.boundingBox as Box3;
      const bc = bb.getCenter(new Vector3(0, 0, 0));

      const position = this.state.position.get();
      const dimensions = this.state.dimensions.get();

      table.position.set(-bc.x, -bc.y + dimensions.height / 2, -bc.z);
      this.scale.set(dimensions.width, dimensions.height, dimensions.depth);
      this.position.set(position.x, position.y, position.z);

      this.add(table);
      this.mainMesh = table;
    };

    table.castShadow = true;
    table.receiveShadow = true;

    // Set up materials

    const woodTextures = new TextureList(
      (name: string) => `/resources/wood/${name}.jpg`,
      ["color", "nrm", "disp", "gloss", "refl"]
    );

    const wood = new MeshStandardMaterial();
    wood.map = woodTextures.get("color");
    wood.normalMap = woodTextures.get("nrm");
    wood.bumpMap = woodTextures.get("disp");
    wood.roughnessMap = woodTextures.get("gloss");
    wood.lightMap = woodTextures.get("refl");
    table.material = [wood];

    // Set up the geometry once it is ready
    if (stl.value) setupGeometry(stl.value);
    else stl.once("load", setupGeometry);

    return table;
  }

  kill() {
    (this.table.material as Material[]).forEach((m) => m.dispose());
    this.table.geometry?.dispose();
  }
}

export default Tabletop;
