import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { TextureLoader } from "three/src/loaders/TextureLoader";
import Log from "./Log";

const cache = {
  STL: new Map<string, STL>(),
  Texture: new Map<string, Texture>(),
  OBJ: new Map<string, OBJ>(),
};

class Resource {
  loaded: boolean = false;
  value: any = undefined;
  callbacks: any = {};
  url: string;

  constructor(url: string, confirm?: boolean) {
    this.url = url;
    if (confirm) {
      console.warn(
        "This resource was constructed directly." +
          "Consider using the.get function to cache between runs.",
        this
      );
    }
  }

  onLoad(value: any) {
    this.loaded = true;
    this.value = value;
    this.runCallback("load", value);
  }

  /* Callback management */
  on(cbName: string, cb: any) {
    if (!this.callbacks[cbName]) this.callbacks[cbName] = [];
    this.callbacks[cbName].push(cb);
  }
  off(cbName: string, cb: any) {
    if (!this.callbacks[cbName]) return;

    this.callbacks[cbName].remove(cb);
    if (this.callbacks[cbName] === []) this.callbacks[cbName] = [];
  }
  runCallback(cbName: string, ...params: any[]) {
    if (!this.callbacks[cbName]) return;
    this.callbacks[cbName].forEach((func: (...params: any[]) => any) =>
      func(...params)
    );
  }

  loadingError(err: any) {
    Log.Error(
      "Couldn't load the following resource:\n" + this.url + "\n"
    );
    this.decache();
  }

  decache() {}
}

class OBJ extends Resource {
  constructor(url: string, confirm: boolean = true) {
    super(url, confirm);
    new OBJLoader().load(
      url,
      this.onLoad.bind(this),
      undefined,
      this.loadingError.bind(this)
    );
    cache.OBJ.set(url, this);
  }
  decache() {
    cache.OBJ.delete(this.url);
  }
  static get(url: string) {
    const current = cache.OBJ.get(url);
    if (current) return current;
    else return new OBJ(url, false);
  }
}

/**
 * Load an STL file as a 3D object.
 * @param url URL of obj file to load.
 */
class STL extends Resource {
  constructor(url: string, confirm: boolean = true) {
    super(url, confirm);
    new STLLoader().load(
      url,
      this.onLoad.bind(this),
      undefined,
      this.loadingError.bind(this)
    );
    cache.STL.set(url, this);
  }
  decache() {
    cache.STL.delete(this.url);
  }
  static get(url: string) {
    const current = cache.STL.get(url);
    if (current) return current;
    else return new STL(url, false);
  }
}

class Texture extends Resource {
  /**
   * Load an image file as a texture.
   * @param url URL of image file to load as texture.
   */
  constructor(url: string, confirm: boolean = true) {
    super(url, confirm);
    this.onLoad(
      new TextureLoader().load(
        url,
        undefined,
        undefined,
        this.loadingError.bind(this)
      )
    );
    cache.Texture.set(url, this);
  }
  decache() {
    cache.Texture.delete(this.url);
  }
  static get(url: string) {
    const current = cache.Texture.get(url);
    if (current) return current;
    else return new Texture(url, false);
  }
}

class TextureList {
  get(name: string): THREE.Texture {
    return this.map.get(name)?.value;
  }
  /**
   * Load a series of images.
   * @param map Mapping from string to texture URL, as an object.
   */
  map: Map<string, Texture>;
  constructor(urlFunction: (s: string) => string, names: string[]) {
    this.map = new Map();
    names.forEach((name) => {
      this.map.set(name, Texture.get(urlFunction(name)));
    });
  }
}

export { Resource, Texture, TextureList, STL, OBJ };
