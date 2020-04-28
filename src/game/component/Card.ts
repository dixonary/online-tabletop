import GameComponent, { GameComponentState } from "./GameComponent";
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
  Quaternion,
} from "three";
import * as resource from "../resource";
import { Texture } from "../resource";
import { ResizeToFit } from "../GeometryTools";
import { Pos3, Quat } from "../StateStructures";
import * as CANNON from "cannon";
import PlayerManager from "../manager/PlayerManager";

export type CardState = AbstractCardData & PhysicalCardState;

export type PhysicalCardState = GameComponentState & {
  faceDown: boolean;
};

export type AbstractCardData = {
  backTexture: string;
  frontTexture: string;
  name: string;
};

/**
 * The physical rendering of a card.
 */
class Card extends GameComponent<CardState> {
  entity: Mesh;
  static thickness: number = 0.002;
  static width: number = 0.065;
  static height: number = 0.089;

  static bodyShape: CANNON.Shape;

  frontFaces: Face3[];
  backFaces: Face3[];

  secret: boolean;

  constructor({
    frontTexture,
    backTexture,
    name,
    faceDown,
    initialPos,
    initialQuat,
  }: AbstractCardData & {
    faceDown: boolean;
    initialPos?: Pos3;
    initialQuat?: Quat;
  }) {
    const faceQuat = new Quaternion().setFromAxisAngle(
      new Vector3(0, 0, 1),
      faceDown ? 0 : Math.PI
    );
    const startingQuat = initialQuat ?? {
      x: faceQuat.x,
      y: faceQuat.y,
      z: faceQuat.z,
      w: faceQuat.w,
    };

    super({
      pos: initialPos ?? { x: 0, y: 0, z: 0 },
      quat: startingQuat,
      owner: null,
      frontTexture,
      backTexture,
      name,
      selectable: true,
      grabber: null,
      grabbable: true,
      faceDown,
    });

    this.frontFaces = [];
    this.backFaces = [];
    this.secret = true;

    this.setBody(this.createBody());

    this.entity = this.makeVisual();

    this.events.on("held scroll", (grabberId) => {
      this.state.faceDown.set(!this.state.faceDown.get());
    });

    this.state.addComputedProperty(
      ["faceDown", "owner"],
      ({ faceDown, owner }) => {
        const isOwner = owner === PlayerManager.GetUID();
        const noOwner = owner === null;

        const secret = faceDown || (!noOwner && !isOwner);

        const newMat = secret && !isOwner ? 0 : 1;

        this.frontFaces.forEach((f) => {
          f.materialIndex = newMat;
        });

        (this.entity.geometry as Geometry).groupsNeedUpdate = true;

        if (secret) {
          this.tooltipText = `Card`;
        } else {
          this.tooltipText = `Card (${this.state.name.get()})`;
        }

        this.secret = secret;
      }
    );

    this.state.addComputedProperty(
      ["faceDown", "quat"],
      ({ faceDown, quat }) => {
        const shortAxisFlip = new Quaternion().setFromAxisAngle(
          new Vector3(0, 0, 1),
          faceDown ? 0 : Math.PI
        );
        const { x, y, z, w } = quat;

        const q = this.smoothMovement ? "smoothQuaternion" : "quaternion";

        if (!this[q] && q === "smoothQuaternion") {
          this[q] = new Quaternion();
        }

        const quaternion = this[q]!;
        quaternion.set(x, y, z, w);
        quaternion.multiply(shortAxisFlip);

        this.body?.quaternion.set(
          quaternion.x,
          quaternion.y,
          quaternion.z,
          quaternion.w
        );
        this.body?.velocity.set(0, 0, 0);
      }
    );

    this.state.frontTexture.addHook((newFront: string) => {
      const mats = this.entity.material as MeshBasicMaterial[];
      mats[1].map = resource.Texture.get(newFront).value();
    });
    this.state.backTexture.addHook((newBack: string) => {
      const mats = this.entity.material as MeshBasicMaterial[];
      mats[2].map = resource.Texture.get(newBack).value();
    });
  }

  // Override the default behaviour of quat -> quaternion.
  updateQuaternion() {}

  /**
   * Get the abstract version of this card.
   */
  getAbstract(): AbstractCardData {
    return {
      backTexture: this.state.backTexture.get(),
      frontTexture: this.state.frontTexture.get(),
      name: this.state.name.get(),
    };
  }

  createBody() {
    const body = new CANNON.Body({ mass: 1 });

    if (!Card.bodyShape)
      Card.bodyShape = new CANNON.Box(
        new CANNON.Vec3(Card.width / 2, Card.thickness / 2, Card.height / 2)
      );
    body.addShape(Card.bodyShape);

    const pos = this.smoothPosition ?? this.position;
    body.position.set(pos.x, pos.y, pos.z);
    const { x, y, z, w } = this.smoothQuaternion ?? this.quaternion;
    body.quaternion.set(x, y, z, w);

    return body;
  }

  makeVisual() {
    const entity = new Mesh();

    let stl = resource.STL.get(process.env.PUBLIC_URL + "/resources/card.stl");

    const setupGeometry = (geom: BufferGeometry) => {
      ResizeToFit(geom, new Vector3(Card.width, Card.thickness, Card.height));
      const geometry = new Geometry().fromBufferGeometry(geom);

      geometry.computeBoundingBox();
      const bb = geometry.boundingBox as Box3;
      const size = bb.getSize(new Vector3());

      this.frontFaces = [];
      this.backFaces = [];

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
        const isFront = a.y === bb.min.y;
        if (isFront) {
          // Front of the card
          this.frontFaces.push(face);
          const vertexToUV = (v: Vector3) => {
            let vxPct = (v.x - bb.min.x) / size.x;
            let vzPct = (bb.max.z - v.z) / size.z;
            return new Vector2(1 - vxPct, vzPct);
          };
          face.materialIndex = 1;
          geometry.faceVertexUvs[0][i] = [a, b, c].map(vertexToUV);
        } else {
          // Back of the card
          this.backFaces.push(face);
          const vertexToUV = (v: Vector3) => {
            let vxPct = (v.x - bb.min.x) / size.x;
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
      boundingBoxCenter.setY(-size.y / 2);
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

  dispose() {
    super.dispose();
    (this.entity.material as Material[]).forEach((m) => m.dispose());
    this.entity.geometry?.dispose();
  }

  updateTextures(cardData: AbstractCardData) {
    const mats = this.entity.material as MeshBasicMaterial[];
    mats[1].map = Texture.get(cardData.frontTexture).value;
    mats[2].map = Texture.get(cardData.backTexture).value;
  }
}

export default Card;
