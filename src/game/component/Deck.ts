import { TextureList, Texture, STL } from "../resource";
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
import { GameComponentState } from "./GameComponent";
import { StateManager, Authority } from "../manager/";
import Card, { AbstractCardData } from "./Card";
import { GameComponent, Region, Grabber } from "./";
import { Pos3 } from "../StateStructures";

type DeckState = GameComponentState & {
  cards: AbstractCardData[];
  faceDown: boolean;
};

/**
 * A deck is a physical pile of cards.
 */
class Deck extends GameComponent<DeckState> {
  pile: Mesh;
  region: Region;

  constructor({
    cards,
    faceDown,
    pos,
  }: {
    cards: AbstractCardData[];
    faceDown: boolean;
    pos: Pos3;
  }) {
    super({
      owner: null,
      selectable: true,
      grabbable: false,
      grabber: null,
      pos: pos ?? { x: 0, y: 0, z: 0 },
      cards,
      faceDown,
      quat: { x: 0, y: 0, z: 0, w: 0 },
    });

    this.pile = this.makePile();
    this.add(this.pile);

    this.region = new Region({
      pos: this.state.pos.get(),
      dim: { width: Card.width + 0.01, height: 0, depth: Card.height + 0.01 },
    });

    this.state.pos.addHook(({ x, y, z }) => {
      this.region.state.pos.set({ x, y, z }, false);
    });

    this.region.events.on("object enter", (objId) => {
      console.log("enter");
    });

    this.region.events.on("object drop", (objId) => {
      console.log("drop");
      Authority.Do(this, this.tryInsert, objId);
    });

    // Update the tooltip to match the current deck size
    this.tooltipText = `Deck(${cards.length})`;
    this.state.cards.addHook((newCards) => {
      this.tooltipText = `Deck (${newCards.length})`;
    });

    // Update the rendering to match the data
    this.updatePileVisual(this.state.cards.get());
    this.state.cards.addHook(this.updatePileVisual.bind(this));

    this.events.on("drag_out", (grabber: Grabber) => {
      Authority.Do(this, this.draw, grabber.identifier);
    });
  }

  update(delta: number) {
    super.update(delta);
  }

  /**
   * Helper function for insertion which gets a reference to the card.
   */
  private tryInsert(cardId: string) {
    if (!Authority.RequireAuthority()) return;
    const card = StateManager.GetObject(cardId);
    if (!card || !(card instanceof Card)) return;
    this.insert(card.getAbstract());

    card.destroy();
  }

  /**
   * Insert a card into a deck. Replace this function to modify the
   * functionality. By default, the card will be inserted in a random place, and
   * change its facing direction to match the deck.
   * @param cardData The abstract card to insert.
   */
  insert(cardData: AbstractCardData) {
    const cards = this.state.cards.get();
    const randomPos = Math.floor(Math.random() * cards.length);
    cards.splice(randomPos, 0, cardData);
    this.state.cards.set(cards);
  }

  /**
   * Draw a card.
   * @param grabberId The grabber which is drawing the card. This grabber
   * will be grab the newly summoned card.
   */
  draw(grabberId: string) {
    if (!Authority.RequireAuthority()) return;

    const grabber = StateManager.GetObject<Grabber>(grabberId);

    if (!grabber) return;
    if (grabber.state.grabbedObject.get() !== null) return;

    const cards = this.state.cards.get();
    if (cards.length === 0) return;

    const topCard = cards.shift()!;

    console.log(this.state.cards);
    this.state.cards.set(cards);

    const card = Card.Create({
      frontTexture: topCard.frontTexture,
      backTexture: topCard.backTexture,
      name: topCard.name,
      faceDown: this.state.faceDown.get(),
      initialPos: {
        x: this.position.x,
        y: this.position.y,
        z: this.position.z,
      },
      secret: this.state.faceDown.get(),
    });

    grabber.grab(card.identifier);
  }

  /**
   * Set up the geometry for the deck.
   */
  makePile() {
    let stl = STL.get(process.env.PUBLIC_URL + "/resources/card.stl");

    const pile = new Mesh();

    const setupGeometry = (geom: BufferGeometry) => {
      ResizeToFit(geom, new Vector3(Card.width, Card.thickness, Card.height));
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

      const center = new Vector3();
      bb.getCenter(center);
      pile.position.set(-center.x, size.y, -center.z);

      pile.geometry = geometry;
      this.mainMesh = pile;
    };

    // Compute the geometry when the STL is loaded
    if (stl.value) setupGeometry(stl.value);
    else stl.once("load", setupGeometry.bind(this));

    // Initially all sides are just white
    const whiteMat = new MeshBasicMaterial({ color: "#ffffff" });
    const topMat = new MeshBasicMaterial({ color: "#ffffff" });
    const bottomMat = new MeshBasicMaterial({ color: "#ffffff" });
    pile.material = [whiteMat, topMat, bottomMat];

    return pile;
  }

  /**
   * Match the rendering to the internal state.
   * @param cards The new abstract state of the pile.
   */
  updatePileVisual(cards: AbstractCardData[]) {
    if (cards.length > 0) {
      this.pile.visible = true;

      const topCard = cards[0];
      const bottomCard = cards[cards.length - 1];

      const mats = this.pile.material as MeshBasicMaterial[];

      mats[1].map = Texture.get(topCard.backTexture).value;
      mats[2].map = Texture.get(bottomCard.frontTexture).value;
    } else {
      this.pile.visible = false;
    }

    this.scale.y = cards.length;
  }

  dispose() {
    super.dispose();
    (this.pile.material as Material[]).forEach((m) => m.dispose());
    this.pile.geometry?.dispose();
  }
}

class PopulatedDeck extends Deck {
  constructor({
    cardFronts,
    cardBack,
    distribution,
    faceDown,
    pos,
  }: {
    cardFronts: TextureList;
    cardBack: Texture;
    faceDown: boolean;
    distribution?: any;
    pos: Pos3;
  }) {
    const cards: AbstractCardData[] = [];
    Object.entries(distribution).forEach(([name, amt]: [string, any]) => {
      for (let i = 0; i < amt; i++) {
        cards.push({
          frontTexture: cardFronts.map.get(name)!.url,
          backTexture: cardBack.url,
          name,
        });
      }
    });
    Shuffle(cards);
    super({ cards, faceDown, pos });
  }
}

export default Deck;
export { PopulatedDeck };
