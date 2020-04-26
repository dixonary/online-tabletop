import Resource from "./Resource";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";

/**
 * Load an STL file as a 3D object.
 * @param url URL of obj file to load.
 */
class STL extends Resource {
  static Cache: Map<string, STL> = new Map();

  constructor(url: string, confirm: boolean = true) {
    super(url, true, confirm);
    new STLLoader().load(
      url,
      this.onLoad.bind(this),
      undefined,
      this.loadingError.bind(this)
    );
    STL.Cache.set(url, this);
  }

  decache() {
    STL.Cache.delete(this.url);
  }

  static get(url: string) {
    const current = STL.Cache.get(url);
    if (current) return current;
    else return new STL(url, false);
  }
}

export default STL;
