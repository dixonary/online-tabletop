class OverlayManager {
  root: HTMLElement;

  static instance: OverlayManager;

  constructor(root: HTMLElement) {
    this.root = document.createElement("div") as HTMLElement;
    this.root.classList.add("log");
    root.appendChild(this.root);
  }

  static Initialize(root: HTMLElement) {
    OverlayManager.instance = new OverlayManager(root);
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

export default OverlayManager;
