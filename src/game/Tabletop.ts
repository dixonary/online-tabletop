import * as resource from "./resource";
import GameObject from "./GameObject";
import * as THREE from "three";
import { Mesh, Vector3, BufferGeometry } from "three";
import { AutoUV, ResizeToFit } from "../GeometryTools";

class Tabletop extends GameObject {
  table: Mesh;

  constructor({
    width,
    height,
    depth,
  }: {
    width: number;
    height: number;
    depth: number;
  }) {
    super();

    // disable highlighting the table
    this.addPre("highlight_on", () => false);

    const table = new Mesh();
    this.table = table;

    let stl = resource.STL.get(
      process.env.PUBLIC_URL + "/resources/tabletop.stl"
    );

    const woodTextures = new resource.TextureList(
      (name) => `/resources/wood/${name}.jpg`,
      ["color", "nrm", "disp", "gloss", "refl"]
    );

    const setupGeometry = (geometry: BufferGeometry) => {
      const wood = new THREE.MeshStandardMaterial();

      wood.map = woodTextures.get("color");
      wood.normalMap = woodTextures.get("nrm");
      wood.bumpMap = woodTextures.get("disp");
      wood.roughnessMap = woodTextures.get("gloss");
      wood.lightMap = woodTextures.get("refl");

      table.material = wood;

      let geom = new THREE.Geometry().fromBufferGeometry(geometry);
      table.geometry = geom;

      geom.computeBoundingBox();
      console.log(table.geometry.boundingBox);
      ResizeToFit(geom, new Vector3(width, height, depth));

      geom.computeFaceNormals();
      geom.computeVertexNormals();
      AutoUV(geom);

      table.geometry.computeBoundingBox();
      const bb = table.geometry.boundingBox as THREE.Box3;
      const bc = bb.getCenter(new Vector3(0, 0, 0));

      table.position.set(-bc.x, -bc.y + height / 2, -bc.z);

      table.updateMatrix();

      this.castShadow = true;
      this.receiveShadow = true;

      table.castShadow = true;
      table.receiveShadow = true;

      this.add(table);
      this.setMain(table);
    };

    // We need both as it may already be loaded!
    if (stl.value) setupGeometry(stl.value);
    else stl.on("load", setupGeometry);
  }
}

export default Tabletop;
