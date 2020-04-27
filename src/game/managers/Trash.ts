import Manager from "./Manager";
import BasicObject from "../BasicObject";

/**
 * Handle the creation and deletion of objects.
 * We do this so that objects are not removed from the sceene graph
 * WHILE the scene graph is being traversed.
 */
class Trash extends Manager {
  static _killQueue: BasicObject[];

  static Initialize() {
    super.Initialize();

    Trash._killQueue = [];
  }

  static Update(delta: number) {
    super.Update(delta);

    while (Trash._killQueue.length > 0) {
      const obj = Trash._killQueue.shift()!;
      obj.dispose();
    }
  }

  static Kill(obj: BasicObject) {
    Trash._killQueue.push(obj);
  }

  static Dispose() {
    super.Dispose();
  }
}

export default Trash;
