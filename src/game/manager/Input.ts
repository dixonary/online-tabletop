import { Vector2 } from "three";
import Manager from "./Manager";

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

class Input extends Manager {
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

  static _pressedLast: boolean = false;
  static _secondaryPressedLast: boolean = false;
  static _scrollStarted: number | null = null;
  static _scrollStartedLast: number | null = null;
  static _scrollIntraFrame: number = 0;
  static _scrollUnit: number = Number.MAX_SAFE_INTEGER;
  static _root: HTMLElement;
  // private scrollDeltaLast: number = 0;

  static Initialize(root: HTMLElement) {
    super.Initialize();
    Input._root = root;
    window.addEventListener("mousemove", Input._HandleMouseMove, false);
    window.addEventListener("mousedown", Input._HandleMouseDown, false);
    window.addEventListener("mouseup", Input._HandleMouseUp, false);
    window.addEventListener("wheel", Input._HandleScroll, false);
  }

  static Dispose() {
    super.Dispose();
    window.removeEventListener("mousemove", Input._HandleMouseMove);
    window.removeEventListener("mousedown", Input._HandleMouseDown);
    window.removeEventListener("mouseup", Input._HandleMouseUp);
    window.addEventListener("wheel", Input._HandleScroll);
  }

  static _HandleMouseMove(event: MouseEvent) {
    const mouse = Input.mouse;
    const bound = Input._root.getBoundingClientRect();
    const x = event.clientX - bound.left;
    const y = event.clientY - bound.top;
    mouse.position.set(
      (x / Input._root.clientWidth) * 2 - 1,
      -(y / Input._root.clientHeight) * 2 + 1
    );
    mouse.positionRaw.set(x, y);
  }

  static _HandleMouseDown(event: MouseEvent) {
    if (
      Input.mouse.positionRaw.x < 0 ||
      Input.mouse.positionRaw.x > Input._root.clientWidth ||
      Input.mouse.positionRaw.y < 0 ||
      Input.mouse.positionRaw.y > Input._root.clientHeight
    )
      return;
    if (event.button === 0) Input.mouse.pressed = true;
    if (event.button === 1) Input.mouse.secondaryPressed = true;
  }
  static _HandleMouseUp(event: MouseEvent) {
    if (
      Input.mouse.positionRaw.x < 0 ||
      Input.mouse.positionRaw.x > Input._root.clientWidth ||
      Input.mouse.positionRaw.y < 0 ||
      Input.mouse.positionRaw.y > Input._root.clientHeight
    )
      return;
    if (event.button === 0) Input.mouse.pressed = false;
    if (event.button === 1) Input.mouse.secondaryPressed = false;
  }

  static _HandleScroll(event: WheelEvent) {
    if (
      Input.mouse.positionRaw.x < 0 ||
      Input.mouse.positionRaw.x > Input._root.clientWidth ||
      Input.mouse.positionRaw.y < 0 ||
      Input.mouse.positionRaw.y > Input._root.clientHeight
    )
      return;

    Input._scrollUnit = Math.min(Math.abs(event.deltaY), Input._scrollUnit);
    // console.log(Input._scrollUnit);
    Input._scrollStarted = Date.now();
    Input._scrollIntraFrame += Math.round(event.deltaY / Input._scrollUnit);
  }

  static Update(delta: number) {
    super.Update(delta);

    const mouse = Input.mouse;

    mouse.justPressed = Input.mouse.pressed && !Input._pressedLast;
    mouse.justReleased = !Input.mouse.pressed && Input._pressedLast;

    mouse.secondaryJustPressed =
      Input.mouse.secondaryPressed && !Input._secondaryPressedLast;
    mouse.secondaryJustReleased =
      !Input.mouse.secondaryPressed && Input._secondaryPressedLast;

    Input._pressedLast = Input.mouse.pressed;
    Input._secondaryPressedLast = Input.mouse.secondaryPressed;

    Input.mouse.justScrolled =
      Input._scrollStarted !== null &&
      (Input._scrollStartedLast === null ||
        (Date.now() - Input._scrollStarted > 100 &&
          Date.now() - Input._scrollStartedLast <= 100));

    // We count two scroll moves in the same 200ms as the same move.
    if (Input._scrollStarted && Date.now() - Input._scrollStarted > 200) {
      Input._scrollStarted = null;
    }
    Input._scrollStartedLast = Input._scrollStarted;
    Input.mouse.scrollDelta = Input._scrollIntraFrame;
    Input._scrollIntraFrame = 0;
  }
}

export default Input;
