import Manager from "./Manager";

class Overlay extends Manager {
  static _root: HTMLElement;
  static _elem: HTMLDivElement;

  static Initialize(root: HTMLElement) {
    super.Initialize();
    Overlay._elem = document.createElement("div") as HTMLDivElement;
    Overlay._elem.classList.add("overlay");
    root.appendChild(Overlay._elem);
  }

  static Dispose() {
    super.Dispose();
    Overlay._root.removeChild(Overlay._elem);
  }

  /**
   * Add an image to the overlay.
   * @param url
   */
  static Image(url: string) {
    // TODO
  }

  /**
   * Remove the overlayed element.
   */
  static Clear() {
    // TODO
  }
}

export default Overlay;
