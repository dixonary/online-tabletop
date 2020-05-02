import Manager from "./Manager";
import Stats from "stats.js";

class FPS extends Manager {
  static stats: Stats;
  static _root: HTMLElement;

  static Initialize(root: HTMLElement) {
    super.Initialize();
    FPS.stats = new Stats();
    FPS.stats.showPanel(0);
    FPS._root = root;
    root.appendChild(FPS.stats.dom);
  }

  static Update(delta: number) {
    super.Update(delta);
  }

  static Begin() {
    FPS.stats.begin();
  }

  static End() {
    FPS.stats.end();
  }

  static Dispose() {
    super.Dispose();
  }
}

export default FPS;
