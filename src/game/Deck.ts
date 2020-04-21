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
  Material,
} from "three";
import { ResizeToFit } from "../GeometryTools";
import GameObject, { GameObjectState } from "./GameObject";

type DeckState = GameObjectState & {
  cards: AbstractCardState[];
};

type AbstractCardState = {
  backTexture: string;
  frontTexture: string;
  name: string;
};

class Deck extends GameObject<DeckState> {
  pile: Mesh;

  constructor(cards: AbstractCardState[]) {
    super({
      owner: null,
      selectable: true,
      position: { x: 0, y: 0, z: 0 },
      cards,
    });

    this.pile = this.makePile();

    // Update the rendering to match the data
    this.updatePileVisual([this.state.cards.get()]);
    this.state.cards.addHook(this.updatePileVisual.bind(this));
  }

  makePile() {
    let stl = resource.STL.get(process.env.PUBLIC_URL + "/resources/card.stl");

    const pile = new Mesh();

    const setupGeometry = ([geom]: [BufferGeometry]) => {
      ResizeToFit(geom, new Vector3(0.065, 0.001, 0.089));
      const geometry = new Geometry().fromBufferGeometry(geom);
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      const bb = geometry.boundingBox as Box3;
      const size = bb.getSize(new Vector3());

      // Compute the correct materials and UVs based on the faces
      let face: Face3;
      let a, b, c: Vector3;
      for (let i = 0; i < geometry.faces.length; i++) {
        face = geometry.faces[i];
        a = geometry.vertices[face.a];
        b = geometry.vertices[face.b];
        c = geometry.vertices[face.c];
        const isFlat = a.y === b.y && b.y === c.y;
        if (!isFlat) {
          // Side of the deck
          face.materialIndex = 0;
          geometry.faceVertexUvs[0][i] = [0, 0, 0].map(() => new Vector2(0, 0));
          continue;
        }
        const isTop = a.y === bb.max.y;
        if (isTop) {
          // Top of the deck
          const vertexToUV = (v: Vector3) => {
            let vxPct = (bb.max.x - v.x) / size.x;
            let vzPct = (bb.max.z - v.z) / size.z;
            return new Vector2(1 - vxPct, vzPct);
          };
          face.materialIndex = 1;
          geometry.faceVertexUvs[0][i] = [a, b, c].map(vertexToUV);
        } else {
          // Bottom of the deck
          const vertexToUV = (v: Vector3) => {
            let vxPct = (bb.max.x - v.x) / size.x;
            let vzPct = (bb.max.z - v.z) / size.z;
            return new Vector2(vxPct, vzPct);
          };
          face.materialIndex = 2;
          geometry.faceVertexUvs[0][i] = [a, b, c].map(vertexToUV);
        }
      }

      pile.geometry = geometry;
      this.mainMesh = pile;
    };

    // Compute the geometry when the STL is loaded
    if (stl.value) setupGeometry([stl.value]);
    else stl.once("load", setupGeometry.bind(this));

    // Initially all sides are just white
    const whiteMat = new MeshBasicMaterial({ color: "#ffffff" });
    const topMat = new MeshBasicMaterial({ color: "#ffffff" });
    const bottomMat = new MeshBasicMaterial({ color: "#ffffff" });
    pile.material = [whiteMat, topMat, bottomMat];

    this.add(pile);
    return pile;
  }

  /**
   * Match the rendering to the internal state.
   * @param cards The new abstract state of the pile.
   */
  updatePileVisual([cards]: [AbstractCardState[]]) {
    if (cards.length > 0) {
      this.pile.visible = true;
      this.pile.scale.y = cards.length;

      const topCard = cards[0];
      const bottomCard = cards[cards.length - 1];

      const mats = this.pile.material as MeshBasicMaterial[];
      mats[1].map = Texture.get(topCard.backTexture).value;
      mats[2].map = Texture.get(bottomCard.frontTexture).value;
    } else {
      this.pile.visible = false;
    }

    this.pile.position.y = this.pile.scale.y * Card.thickness;
  }

  kill() {
    (this.pile.material as Material[]).forEach((m) => m.dispose());
    this.pile.geometry?.dispose();
  }

  /** Create a deck with the given cards and distribution. */
  static Populated(
    cardFronts: TextureList,
    cardBack: Texture,
    distribution?: any
  ) {
    const cards: AbstractCardState[] = [];
    Object.entries(distribution).forEach(([name, amt]: [string, any]) => {
      cards.push({
        frontTexture: cardFronts.map.get(name)!.url,
        backTexture: cardBack.url,
        name,
      });
    });
    Shuffle(cards);
    const deck = new Deck(cards);
    return deck;
  }
}

type CardState = AbstractCardState & GameObjectState;

/**
 * The physical rendering of a card.
 */
class Card extends GameObject<CardState> {
  entity: Mesh;
  static thickness: number = 0.001;

  constructor(cardFront: Texture, cardBack: Texture, name: string) {
    super({
      position: { x: 0, y: 0, z: 0 },
      owner: null,
      frontTexture: cardFront.url,
      backTexture: cardBack.url,
      name,
      selectable: true,
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

    const setupGeometry = ([geom]: [BufferGeometry]) => {
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

      entity.castShadow = true;

      this.entity = entity;
      this.add(entity);
      this.mainMesh = entity;

      this.updateTextures([this.getAbstract()]);
    };

    // Set up materials
    const whiteMat = new MeshBasicMaterial({ color: "#ffffff" });
    const frontMat = new MeshBasicMaterial({ color: "#ffffff" });
    const backMat = new MeshBasicMaterial({ color: "#ffffff" });
    entity.material = [whiteMat, frontMat, backMat];

    if (stl.value) setupGeometry([stl.value]);
    else stl.once("load", setupGeometry.bind(this));

    return entity;
  }

  kill() {
    (this.entity.material as Material[]).forEach((m) => m.dispose());
    this.entity.geometry?.dispose();
  }

  updateTextures([cardData]: [AbstractCardState]) {
    const mats = this.entity.material as MeshBasicMaterial[];
    mats[1].map = Texture.get(cardData.backTexture).value;
    mats[2].map = Texture.get(cardData.frontTexture).value;
  }
}

export { Deck, Card };
