import {
  Mesh,
  BoxGeometry,
  MeshBasicMaterial,
  BackSide,
  MeshPhongMaterial,
  Material,
} from "three";
import { AutoUV, ApplyFaceMaterials } from "./GeometryTools";
import { TextureList } from "./resource";
import * as CANNON from "cannon";
import Game from "./Game";

class Room extends Mesh {
  constructor() {
    super();

    // Generate the room geometry
    const w = 6;
    const h = 3;
    const d = 6;
    const geometry = new BoxGeometry(w, h, d);

    AutoUV(geometry);
    geometry.computeFaceNormals();
    geometry.computeVertexNormals();

    // Set the correct materials to the correct walls
    ApplyFaceMaterials(geometry, { flat: 2, deep: 1, wide: 1, other: 1 });

    // Load the materials
    const whiteMat = new MeshBasicMaterial({
      color: "#eeeeee",
      side: BackSide,
    });

    const brickTexture = new TextureList(
      (s) => process.env.PUBLIC_URL + `/resources/brick-wall/${s}.jpg`,
      ["color", "ao", "bump", "disp", "norm", "gloss"]
    );

    const brickMat = new MeshPhongMaterial({ side: BackSide });
    brickMat.map = brickTexture.get("color");
    // brickMat.lightMap = brickTexture.get("gloss");
    brickMat.bumpMap = brickTexture.get("bump");
    brickMat.bumpScale = 0.5;
    brickMat.aoMap = brickTexture.get("ao");
    brickMat.aoMapIntensity = 0.5;

    const floorTexture = new TextureList(
      (s) => process.env.PUBLIC_URL + `/resources/wood-floor/${s}.jpg`,
      ["color", "refl", "disp", "norm", "gloss"]
    );
    const floorMat = new MeshPhongMaterial({ side: BackSide });
    floorMat.map = floorTexture.get("color");
    floorMat.normalMap = floorTexture.get("norm");
    // floorMat.lightMap = floorTexture.get("gloss");

    this.geometry = geometry;
    this.material = [whiteMat, brickMat, floorMat];
    this.castShadow = false;
    this.receiveShadow = true;

    // Add floor and wall bodies to the physics
    const floorBody = new CANNON.Body({ mass: 0 });
    const plane = new CANNON.Plane();

    const bottom = new CANNON.Vec3(0, 0, 0);
    const top = new CANNON.Vec3(0, 0, h);
    const left = new CANNON.Vec3(-w / 2, 0, 0);
    const right = new CANNON.Vec3(w / 2, 0, 0);
    const front = new CANNON.Vec3(0, -d / 2, 0);
    const back = new CANNON.Vec3(0, d / 2, 0);
    const up = new CANNON.Vec3(0, 0, 1);
    const quat = new CANNON.Quaternion();

    floorBody.addShape(plane, bottom);
    floorBody.addShape(plane, top, quat.setFromEuler(0, 0, Math.PI));

    for (let x of [left, right, front, back]) {
      quat.setFromVectors(up, x);
      floorBody.addShape(plane, x, quat);
    }

    // Add to the scene
    this.position.setY(h / 2);
    Game.instance.scene.add(this);

    this.matrixAutoUpdate = false;
    this.updateMatrix();
  }

  dispose() {
    (this.material as Material[]).forEach((m) => m.dispose());
    this.geometry.dispose();
  }
}

export default Room;
