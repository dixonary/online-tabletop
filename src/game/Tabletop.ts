import * as resource from "./resource";
import GameObject from "./GameObject";
import * as THREE from "three";
import { Mesh, Vector3, BufferGeometry, Material } from "three";
import { AutoUV, ResizeToFit } from "../GeometryTools";
import { Dim3, Pos3 } from "./StateStructures";
import { Stateful } from "./StateMachine";

type TabletopState = {
  owner: string | null;
  dimensions: Dim3;
  position: Pos3;
  selectable: boolean;
};

class Tabletop extends GameObject<TabletopState> {
  table: Mesh;

  constructor(dimensions: Dim3, position: Pos3 = { x: 0, y: 0, z: 0 }) {
    super({ dimensions, position, owner: null, selectable: false });

    console.log(dimensions, position);

    this.table = this.initialiseMesh();

    this.state.dimensions.addHook(([{ width, height, depth }]) => {
      this.scale.set(width, height, depth);
    });

    this.selectable = false;
  }

  initialiseMesh() {
    const table = new Mesh();

    let stl = resource.STL.get(
      process.env.PUBLIC_URL + "/resources/tabletop.stl"
    );

    const setupGeometry = ([geometry]: [BufferGeometry]) => {
      let geom = new THREE.Geometry().fromBufferGeometry(geometry);
      table.geometry = geom;

      geom.computeBoundingBox();
      console.log(table.geometry.boundingBox);
      ResizeToFit(geom, new Vector3(1, 1, 1));

      geom.computeFaceNormals();
      geom.computeVertexNormals();
      AutoUV(geom);

      table.geometry.computeBoundingBox();
      const bb = table.geometry.boundingBox as THREE.Box3;
      const bc = bb.getCenter(new Vector3(0, 0, 0));

      const state = this.state as Stateful<TabletopState>;
      const position = state.position.get();
      const dimensions = state.dimensions.get();

      table.position.set(-bc.x, -bc.y + dimensions.height / 2, -bc.z);
      this.scale.set(dimensions.width, dimensions.height, dimensions.depth);
      this.position.set(position.x, position.y, position.z);

      this.add(table);
      this.mainMesh = table;
    };

    table.castShadow = true;
    table.receiveShadow = true;

    // Set up materials

    const woodTextures = new resource.TextureList(
      (name) => `/resources/wood/${name}.jpg`,
      ["color", "nrm", "disp", "gloss", "refl"]
    );

    const wood = new THREE.MeshStandardMaterial();
    wood.map = woodTextures.get("color");
    wood.normalMap = woodTextures.get("nrm");
    wood.bumpMap = woodTextures.get("disp");
    wood.roughnessMap = woodTextures.get("gloss");
    wood.lightMap = woodTextures.get("refl");
    table.material = [wood];

    // Set up the geometry once it is ready
    if (stl.value) setupGeometry([stl.value]);
    else stl.once("load", setupGeometry);

    return table;
  }

  kill() {
    (this.table.material as Material[]).forEach((m) => m.dispose());
    this.table.geometry?.dispose();
  }
}

export default Tabletop;
