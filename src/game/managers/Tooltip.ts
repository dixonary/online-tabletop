import { TooltipProps } from "react-bootstrap";
import { Vector2 } from "three";

class Tooltip {
  root: HTMLElement;
  elem: HTMLDivElement;

  static instance: Tooltip;

  constructor(root: HTMLElement) {
    this.root = root;

    this.elem = document.createElement("div");
    root.appendChild(this.elem);
    this.elem.classList.add("hover-tooltip", "hidden");
    this.elem.style.position = "absolute";
  }

  static Initialize(root: HTMLElement) {
    Tooltip.instance = new Tooltip(root);
  }

  static Set(text: string | null) {
    Tooltip.instance.elem.innerText = text ?? "";
    if (text === null) {
      Tooltip.instance.elem.classList.add("hidden");
    } else {
      Tooltip.instance.elem.classList.remove("hidden");
    }
  }

  static SetPosition({ x, y }: Vector2) {
    Tooltip.instance.elem.style.left = `${x}px`;
    Tooltip.instance.elem.style.top = `${y}px`;
  }
}

export default Tooltip;
