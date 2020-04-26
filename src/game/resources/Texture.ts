import Resource from "./Resource";
import { TextureLoader } from "three";

class Texture extends Resource {
  static Cache: Map<string, Texture> = new Map();
  /**
   * Load an image file as a texture.
   * @param url URL of image file to load as texture.
   */
  constructor(url: string, confirm: boolean = true) {
    super(url, false, confirm);
    this.onLoad(
      new TextureLoader().load(
        url,
        undefined,
        undefined,
        this.loadingError.bind(this)
      )
    );
    Texture.Cache.set(url, this);
  }
  decache() {
    Texture.Cache.delete(this.url);
  }
  static get(url: string) {
    const current = Texture.Cache.get(url);
    if (current) return current;
    else return new Texture(url, false);
  }
}

/**
 * A mapping to from URLs to textures. This is a helper which lets you
 * specify a transformation from short name to full URL.
 */
class TextureList {
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

  get(name: string): THREE.Texture {
    return this.map.get(name)?.value;
  }
}

export default Texture;
export { TextureList };
