import * as THREE from "three";
import { Group, Mesh } from "three";
import Grabber from "./Grabber";

/**
 * The main elements of a scene.
 * They embed a LOT of functionality including the ability to be highlighted,
 * manipulated by Grabbers, and have events registered and called on them.
 */
class GameObject extends Group {
  callbacks: any = {};
  preconditions: any = {};
  main: Mesh | undefined;
  highlight: THREE.LineSegments | undefined;
  highlighted: boolean = false;
  followAttach: any;

  constructor() {
    super();

    this.on("highlight_update", () => {
      if (!this.highlight) return;
      if (!this.main) return;
      this.highlight.scale.copy(this.main.scale);
      this.highlight.position.copy(this.main.position);
      this.highlight.rotation.copy(this.main.rotation);
    });

    this.on("highlight_on", () => {
      if (this.highlight) this.add(this.highlight);
      this.highlighted = true;
    });
    this.on("highlight_off", () => {
      if (this.highlight) this.remove(this.highlight);
      this.highlighted = false;
    });

    this.addPre("attach", () => !this.followAttach);
    this.on("attach", (grabber: Grabber) => {
      this.followAttach = () => this.position.copy(grabber.position);
      this.on("update", this.followAttach);
    });
    this.on("detach", (grabber: Grabber) => {
      this.off("update", this.followAttach);
      this.followAttach = null;
    });
  }

  /**
   * Call this to set the "main" mesh.
   * The main mesh will be highlighted when highlighting is enabled.
   */
  setMain(mesh: Mesh) {
    this.main = mesh;
    if (this.highlight) {
      this.remove(this.highlight);
    }
    this.highlight = new THREE.LineSegments(
      new THREE.EdgesGeometry(mesh.geometry),
      new THREE.LineBasicMaterial({ color: "#000000" })
    );
  }

  /* Callback precondition management */
  addPre(cbName: string, pre: () => boolean) {
    if (!this.preconditions[cbName]) this.preconditions[cbName] = [];
    this.preconditions[cbName].push(pre);
  }
  removePre(cbName: string, pre: () => boolean) {
    if (!this.preconditions[cbName]) return;
    this.preconditions[cbName].remove(pre);
    if (this.preconditions[cbName].length === 0)
      this.preconditions[cbName] = null;
  }

  /* Callback management */
  on(cbName: string, cb: any) {
    if (!this.callbacks[cbName]) this.callbacks[cbName] = [];
    this.callbacks[cbName].push(cb);
  }
  off(cbName: string, cb: any) {
    if (!this.callbacks[cbName]) return;

    this.callbacks[cbName].remove(cb);
    if (this.callbacks[cbName].length === 0) this.callbacks[cbName] = null;
  }
  runCallback(cbName: string, ...params: any[]) {
    if (!this.callbacks[cbName]) return true;
    if (this.preconditions[cbName]) {
      const fail = this.preconditions[cbName].find((x: () => boolean) => !x());
      if (fail) return false;
    }
    this.callbacks[cbName].forEach((func: (...params: any[]) => any) =>
      func(...params)
    );
    return true;
  }

  kill() {
    // this.scene.remove(this);=
  }
  update(delta: number) {
    // Allow for custom update hooks!
    this.runCallback("update");
  }
}

export default GameObject;
