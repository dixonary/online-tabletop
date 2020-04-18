import GameObject from "./GameObject";
import * as resource from "./resource";
import { TextureList, Texture } from "./resource";
import Shuffle from "shuffle-array";
import {
  Mesh,
  Geometry,
  BufferGeometry,
  MeshBasicMaterial,
  Vector3,
  Face3,
  Box3,
  Vector2,
} from "three";
import { ResizeToFit } from "../GeometryTools";
import { GlobalAccess } from "../GamePreview";

class Deck extends GameObject {
  contents: Card[] = [];
}

/**
 * A deck populated with simple cards.
 * The cards are visibly different but have no additional data attached.
 * */
class PopulatedDeck extends Deck {
  cardFronts: Map<string, Texture>;
  cardBack: Texture;
  initialDistribution: Map<string, number>;

  constructor(
    cardFronts: TextureList,
    cardBack: Texture,
    distribution?: Object
  ) {
    super();

    this.cardFronts = cardFronts.map;
    this.cardBack = cardBack;

    this.initialDistribution = new Map();
    if (distribution) {
      Object.entries(distribution).forEach(([k, n]: [string, number]) =>
        this.initialDistribution.set(k, n)
      );
    } else {
      // Default to one of each card
      cardFronts.map.forEach((v: Texture, k: string) =>
        this.initialDistribution.set(k, 1)
      );
    }

    const global = (window as any) as GlobalAccess;

    const allCards: Card[] = [];
    this.initialDistribution.forEach((val, name) => {
      for (let i = 0; i < val; i++) {
        const card = new Card(cardFronts.map.get(name) as Texture, cardBack, {
          name,
        });
        global.scene.add(card);
        allCards.push(card);
      }

      Shuffle(allCards);
    });
    this.contents = allCards;
  }
}

class Card extends GameObject {
  cardBack: Texture;
  cardFront: Texture;
  entity: Mesh | undefined;
  data: any;
  constructor(cardFront: Texture, cardBack: Texture, extraData: any) {
    super();
    this.data = extraData;
    this.cardBack = cardBack;
    this.cardFront = cardFront;

    this.on("appear", this.appear.bind(this));
    this.on("disappear", this.disappear.bind(this));
  }

  appear() {
    if (this.entity) return;

    let stl = resource.STL.get(process.env.PUBLIC_URL + "/resources/card.stl");

    const entity = new Mesh();

    const setupGeometry = (geom: BufferGeometry) => {
      ResizeToFit(geom, new Vector3(0.065, 0.002, 0.089));
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
          const vertexToUV = (v: Vector3) => {
            let vxPct = (bb.max.x - v.x) / size.x;
            let vzPct = (bb.max.z - v.z) / size.z;
            return new Vector2(1 - vxPct, vzPct);
          };
          face.materialIndex = 1;
          geometry.faceVertexUvs[0][i] = [a, b, c].map(vertexToUV);
        } else {
          const vertexToUV = (v: Vector3) => {
            let vxPct = (bb.max.x - v.x) / size.x;
            let vzPct = (bb.max.z - v.z) / size.z;
            return new Vector2(vxPct, vzPct);
          };
          face.materialIndex = 2;
          geometry.faceVertexUvs[0][i] = [a, b, c].map(vertexToUV);
        }
      }

      const whiteMat = new MeshBasicMaterial({ color: "#ffffff" });
      const frontMat = new MeshBasicMaterial({ map: this.cardFront.value });
      const backMat = new MeshBasicMaterial({ map: this.cardBack.value });

      entity.geometry = geometry;
      entity.material = [whiteMat, frontMat, backMat];

      this.entity = entity;
      this.add(entity);
      this.setMain(entity);
    };

    if (stl.value) setupGeometry(stl.value);
    else stl.on("load", setupGeometry.bind(this));
  }

  disappear() {
    if (!this.entity) return;
    this.remove(this.entity);
  }
}

export { Deck, PopulatedDeck, Card };