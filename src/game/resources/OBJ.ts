import Resource from "./Resource";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";

class OBJ extends Resource {
  static Cache: Map<string, OBJ> = new Map();

  constructor(url: string, confirm: boolean = true) {
    super(url, confirm);
    new OBJLoader().load(
      url,
      this.onLoad.bind(this),
      undefined,
      this.loadingError.bind(this)
    );
    OBJ.Cache.set(url, this);
  }
  decache() {
    OBJ.Cache.delete(this.url);
  }
  static get(url: string) {
    const current = OBJ.Cache.get(url);
    if (current) return current;
    else return new OBJ(url, false);
  }
}

export default OBJ;
