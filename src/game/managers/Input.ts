import { Vector2 } from "three";
import BasicObject from "../BasicObject";

export type MouseData = {
  position: Vector2;
  pressed: boolean;
  justPressed: boolean;
  justReleased: boolean;
};

class Input extends BasicObject {
  static mouse: MouseData = {
    position: new Vector2(),
    pressed: false,
    justPressed: false,
    justReleased: false,
  };

  private root: HTMLElement;
  private static mousePressedIntraFrame: boolean = false;
  private static instance: Input;

  constructor(root: HTMLElement) {
    super();
    Input.instance = this;

    this.root = root;

    window.addEventListener(
      "mousemove",
      this.handleMouseMove.bind(this),
      false
    );
    window.addEventListener(
      "mousedown",
      this.handleMouseDown.bind(this),
      false
    );
    window.addEventListener("mouseup", this.handleMouseUp.bind(this), false);
  }

  static Initialize(root: HTMLElement) {
    new Input(root);
  }

  handleMouseMove(event: MouseEvent) {
    const root = this.root;
    const mouse = Input.mouse;
    const bound = root.getBoundingClientRect();
    const x = event.clientX - bound.left;
    const y = event.clientY - bound.top;
    mouse.position.set(
      (x / root.clientWidth) * 2 - 1,
      -(y / root.clientHeight) * 2 + 1
    );
  }

  handleMouseDown(event: MouseEvent) {
    Input.mousePressedIntraFrame = true;
  }
  handleMouseUp(event: MouseEvent) {
    Input.mousePressedIntraFrame = false;
  }

  update(delta: number) {
    super.update(delta);

    const mouse = Input.mouse;

    if (Input.mousePressedIntraFrame) {
      mouse.justPressed = !mouse.pressed;
      mouse.pressed = true;
    } else {
      mouse.justReleased = mouse.pressed;
      mouse.pressed = false;
    }
  }
}

export default Input;
