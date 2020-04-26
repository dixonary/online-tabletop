import { Vector2 } from "three";
import BasicObject from "../BasicObject";

export type MouseData = {
  position: Vector2;
  positionRaw: Vector2;

  pressed: boolean;
  justPressed: boolean;
  justReleased: boolean;

  secondaryPressed: boolean;
  secondaryJustPressed: boolean;
  secondaryJustReleased: boolean;

  justScrolled: boolean;
  scrollDelta: number;
};

class Input extends BasicObject {
  static mouse: MouseData = {
    position: new Vector2(),
    positionRaw: new Vector2(),
    pressed: false,
    justPressed: false,
    justReleased: false,
    secondaryPressed: false,
    secondaryJustPressed: false,
    secondaryJustReleased: false,
    justScrolled: false,
    scrollDelta: 0,
  };

  private pressedLast: boolean = false;
  private secondaryPressedLast: boolean = false;
  private scrollStarted: number | null = null;
  private scrollStartedLast: number | null = null;
  private scrollUnit: number = Number.MAX_SAFE_INTEGER;
  // private scrollDeltaLast: number = 0;

  private scrollIntraFrame: number = 0;

  private root: HTMLElement;

  constructor(root: HTMLElement) {
    super();

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
    window.addEventListener("wheel", this.handleScroll.bind(this), false);
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
    mouse.positionRaw.set(x, y);
  }

  handleMouseDown(event: MouseEvent) {
    if (event.button === 0) Input.mouse.pressed = true;
    if (event.button === 1) Input.mouse.secondaryPressed = true;
  }
  handleMouseUp(event: MouseEvent) {
    if (event.button === 0) Input.mouse.pressed = false;
    if (event.button === 1) Input.mouse.secondaryPressed = false;
  }

  handleScroll(event: WheelEvent) {
    Input.mouse.justScrolled = true;
    this.scrollUnit = Math.min(Math.abs(event.deltaY), this.scrollUnit);
    // console.log(this.scrollUnit);
    this.scrollStarted = Date.now();
    this.scrollIntraFrame += Math.round(event.deltaY / this.scrollUnit);
  }

  update(delta: number) {
    super.update(delta);

    const mouse = Input.mouse;

    mouse.justPressed = Input.mouse.pressed && !this.pressedLast;
    mouse.justReleased = !Input.mouse.pressed && this.pressedLast;

    mouse.secondaryJustPressed =
      Input.mouse.secondaryPressed && !this.secondaryPressedLast;
    mouse.secondaryJustReleased =
      !Input.mouse.secondaryPressed && this.secondaryPressedLast;

    this.pressedLast = Input.mouse.pressed;
    this.secondaryPressedLast = Input.mouse.secondaryPressed;

    Input.mouse.justScrolled =
      this.scrollStarted !== null &&
      (this.scrollStartedLast === null ||
        (Date.now() - this.scrollStarted > 100 &&
          Date.now() - this.scrollStartedLast <= 100));

    // We count two scroll moves in the same 200ms as the same move.
    if (this.scrollStarted && Date.now() - this.scrollStarted > 200) {
      this.scrollStarted = null;
    }
    this.scrollStartedLast = this.scrollStarted;
    Input.mouse.scrollDelta = this.scrollIntraFrame;
    this.scrollIntraFrame = 0;
  }
}

export default Input;
