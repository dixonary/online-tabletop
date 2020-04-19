import { Object3D, Raycaster, Vector2, Mesh } from "three";
import { GlobalAccess } from "../GameRenderer";
import { GameObject } from "./Game";

class HighlightManager extends Object3D {
  raycaster: Raycaster = new Raycaster();
  mouse: Vector2;
  highlighted: GameObject | null = null;

  constructor(mouse: Vector2) {
    super();
    this.mouse = mouse;

    const { scene } = (window as any) as GlobalAccess;
    scene.add(this);
  }

  update(delta: number) {
    const { scene, camera } = (window as any) as GlobalAccess;

    this.raycaster.setFromCamera(this.mouse, camera);

    // calculate objects intersecting the picking ray
    const collidables: Mesh[] = [];
    scene.traverseVisible((o) => {
      if (o instanceof GameObject) {
        const main = (o as GameObject).main;
        if (main) collidables.push(main);
      }
    });

    var intersects = this.raycaster.intersectObjects(collidables);

    // Only consider the closest such object
    if (intersects[0]) {
      //The parent MUST be a GameObject by definition
      let gameObj = intersects[0].object.parent as GameObject;

      if (this.highlighted !== gameObj) {
        if (this.highlighted) {
          this.highlighted.runCallback("highlight_off");
        }
        if (gameObj.runCallback("highlight_on")) {
          this.highlighted = gameObj;
        } else {
          this.highlighted = null;
        }
      }
    } else {
      if (this.highlighted) {
        this.highlighted.runCallback("highlight_off");
      }
      this.highlighted = null;
    }

    if (this.highlighted) {
      this.highlighted.runCallback("highlight_update");
    }
  }
}

export default HighlightManager;
