import GameObject, { GameObjectState } from "../GameObject";
import { SphereBufferGeometry, MeshBasicMaterial, Mesh } from "three";
import { StateController } from "../StateMachine";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass";

type GrabberState = {
  visible: boolean;
  highlightId: string | null;
};

/**
 * A grabber is the thing that a player picks things up with.
 */
class Grabber extends GameObject<GrabberState & GameObjectState> {
  clientID: string;

  static outlinePass: OutlinePass;

  constructor(clientID: string, hasGeometry: boolean = true) {
    super({
      position: { x: 0, y: 0, z: 0 },
      owner: clientID,
      selectable: false,
      visible: false,
      highlightId: null,
    });

    this.visible = false;
    this.clientID = clientID;

    if (hasGeometry) this.createGeometry();

    this.state.visible.addHook(([vis]) => {
      this.visible = vis;
    });

    this.state.highlightId.addHook(([id]) => this.updateHighlight(id));
  }

  updateHighlight(id: string | null) {
    const selection = Grabber.outlinePass.selectedObjects;

    // Remove old highlighted object
    const highlightId = this.state.highlightId.get();
    if (highlightId) {
      const old = StateController.GetObject(highlightId);
      if (old instanceof GameObject) {
        const oldMain = old.mainMesh;
        if (oldMain) {
          selection.splice(selection.indexOf(oldMain), 1);
        }
      }
    }

    // Set new highlighted object
    if (id) {
      const newObj = StateController.GetObject(id);
      if (newObj instanceof GameObject) {
        const newMain = newObj.mainMesh;
        if (newMain) {
          selection.push(newMain);
        }
      }
    }
  }

  createGeometry() {
    const geometry = new SphereBufferGeometry(0.01);
    const material = new MeshBasicMaterial({
      color: Math.floor(Math.random() * 0xffffff),
    });
    const entity = new Mesh(geometry, material);
    this.add(entity);
  }
}

export default Grabber;
