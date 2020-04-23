import GameObject, { GameObjectState } from "./GameObject";
import {
  Mesh,
  BufferGeometry,
  Vector3,
  Geometry,
  Box3,
  Face3,
  Vector2,
  MeshBasicMaterial,
  Material,
} from "three";
import { Texture } from "../resource";
import * as resource from "../resource";
import { ResizeToFit } from "../GeometryTools";
import { Pos3 } from "../StateStructures";

export type CardState = AbstractCardState & GameObjectState;

export type AbstractCardState = {
  backTexture: string;
  frontTexture: string;
  name: string;
};

/**
 * The physical rendering of a card.
 */
class Card extends GameObject<CardState> {
  entity: Mesh;
  static thickness: number = 0.001;

  constructor(
    frontTexture: string,
    backTexture: string,
    name: string,
    initialPos?: Pos3
  ) {
    super({
      position: initialPos ?? { x: 0, y: 0, z: 0 },
      owner: null,
      frontTexture: frontTexture,
      backTexture: backTexture,
      name,
      selectable: true,
      grabbable: true,
    });

    this.entity = this.makeVisual();
  }

  /**
   * Get the abstract version of this card.
   */
  getAbstract(): AbstractCardState {
    return {
      backTexture: this.state.backTexture.get(),
      frontTexture: this.state.frontTexture.get(),
      name: this.state.name.get(),
    };
  }

  makeVisual() {
    const entity = new Mesh();

    let stl = resource.STL.get(process.env.PUBLIC_URL + "/resources/card.stl");

    const setupGeometry = (geom: BufferGeometry) => {
      ResizeToFit(geom, new Vector3(0.065, Card.thickness, 0.089));
      const geometry = new Geometry().fromBufferGeometry(geom);

      geometry.computeBoundingBox();
      const bb = geometry.boundingBox as Box3;
      const size = bb.getSize(new Vector3());

      let face: Face3;
      let a, b, c: Vector3;
      for (let i = 0; i < geometry.faces.length; i++) {
        face = geometry.faces[i];
        a = geometry.vertices[face.a];
        b = geometry.vertices[face.b];
        c = geometry.vertices[face.c];
        const isFlat = a.y === b.y && b.y === c.y;
        if (!isFlat) {
          face.materialIndex = 0;
          geometry.faceVertexUvs[0][i] = [0, 0, 0].map(() => new Vector2(0, 0));
          continue;
        }
        const isFront = a.y === bb.max.y;
        if (isFront) {
          // Front of the card
          const vertexToUV = (v: Vector3) => {
            let vxPct = (bb.max.x - v.x) / size.x;
            let vzPct = (bb.max.z - v.z) / size.z;
            return new Vector2(1 - vxPct, vzPct);
          };
          face.materialIndex = 1;
          geometry.faceVertexUvs[0][i] = [a, b, c].map(vertexToUV);
        } else {
          // Back of the card
          const vertexToUV = (v: Vector3) => {
            let vxPct = (bb.max.x - v.x) / size.x;
            let vzPct = (bb.max.z - v.z) / size.z;
            return new Vector2(vxPct, vzPct);
          };
          face.materialIndex = 2;
          geometry.faceVertexUvs[0][i] = [a, b, c].map(vertexToUV);
        }
      }

      entity.geometry = geometry;

      // Move the card to the center of the group's transform
      const boundingBoxCenter = new Vector3();
      bb.getCenter(boundingBoxCenter);
      entity.position.sub(boundingBoxCenter);

      entity.castShadow = true;

      this.entity = entity;
      this.add(entity);
      this.mainMesh = entity;

      this.updateTextures(this.getAbstract());
    };

    // Set up materials
    const whiteMat = new MeshBasicMaterial({ color: "#ffffff" });
    const frontMat = new MeshBasicMaterial({ color: "#ffffff" });
    const backMat = new MeshBasicMaterial({ color: "#ffffff" });
    entity.material = [whiteMat, frontMat, backMat];

    if (stl.value) setupGeometry(stl.value);
    else stl.once("load", setupGeometry.bind(this));

    return entity;
  }

  kill() {
    (this.entity.material as Material[]).forEach((m) => m.dispose());
    this.entity.geometry?.dispose();
  }

  updateTextures(cardData: AbstractCardState) {
    const mats = this.entity.material as MeshBasicMaterial[];
    mats[1].map = Texture.get(cardData.backTexture).value;
    mats[2].map = Texture.get(cardData.frontTexture).value;
  }
}

export default Card;
