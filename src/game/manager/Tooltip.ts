import { Vector2 } from "three";
import Manager from "./Manager";

class Tooltip extends Manager {
  static _root: HTMLElement;
  static _elem: HTMLDivElement;

  static Initialize(root: HTMLElement) {
    super.Initialize();
    Tooltip._root = root;
    Tooltip._elem = document.createElement("div");
    root.appendChild(Tooltip._elem);
    Tooltip._elem.classList.add("hover-tooltip", "hidden");
    Tooltip._elem.style.position = "absolute";
  }

  static Set(text: string | null) {
    Tooltip._elem.innerText = text ?? "";
    if (text === null) {
      Tooltip._elem.classList.add("hidden");
    } else {
      Tooltip._elem.classList.remove("hidden");
    }
  }

  static SetPosition({ x, y }: Vector2) {
    Tooltip._elem.style.left = `${x}px`;
    Tooltip._elem.style.top = `${y}px`;
  }

  static Dispose() {
    super.Dispose();
    Tooltip._root.removeChild(Tooltip._elem);
  }
}

export default Tooltip;
