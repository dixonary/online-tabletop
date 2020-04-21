import { Vector2 } from "three";

class Input {
  static mouse: Vector2 = new Vector2(0, 0);
  static instance: Input;

  constructor() {
    Input.instance = this;
  }
  static Initialize(root: HTMLDivElement) {
    const handleMouseMove = (event: MouseEvent) => {
      if (!root) return;
      const mouse = Input.mouse;
      const bound = root.getBoundingClientRect();
      const x = event.clientX - bound.left;
      const y = event.clientY - bound.top;
      mouse.x = (x / root.clientWidth) * 2 - 1;
      mouse.y = -(y / root.clientHeight) * 2 + 1;
    };

    window.addEventListener("mousemove", handleMouseMove, false);
  }
}

export default Input;
