import THREE, {
  Renderer,
  Vector2,
  Clock,
  Scene,
  PerspectiveCamera,
} from "three";
import HighlightManager from "./HighlightManager";
import { GlobalAccess } from "../GameRenderer";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GameObject } from "./Game";
import Log from "./Log";

class GameRunner {
  mouse: THREE.Vector2 = new Vector2();
  root: HTMLDivElement;
  highlightManager: HighlightManager;
  clock: THREE.Clock = new Clock();
  renderer: Renderer;
  scene: Scene;
  camera: PerspectiveCamera;
  controls: OrbitControls;

  // We define these so that they can be disposed of
  private mouseHandler = this.handleMouseMove.bind(this);
  private resizeHandler = this.handleResize.bind(this);

  constructor({ root }: { root: HTMLDivElement }) {
    this.root = root;

    const global = (window as any) as GlobalAccess;

    this.renderer = global.renderer;
    this.scene = global.scene;
    this.camera = global.camera;

    this.controls = new OrbitControls(this.camera, this.root);
    window.addEventListener("resize", this.resizeHandler);
    window.addEventListener("mousemove", this.mouseHandler, false);
    this.highlightManager = new HighlightManager(this.mouse);

    Log.Initialize(this.root);

    this.handleResize();
    this.begin();
  }

  begin() {
    requestAnimationFrame(this.update.bind(this));
  }

  handleResize() {
    if (!this.root.parentElement) return;
    const w = this.root.parentElement.clientWidth;
    const h = this.root.parentElement.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  loadScene(sceneCode: string) {
    try {
      // eslint-disable-next-line
      eval.call(window, sceneCode);

      // calculate objects intersecting the picking ray
      const { world } = (window as any) as InterpreterResults;

      if (world) {
        Object.entries(world).forEach(([name, gameObject]: [string, any]) => {
          this.scene.add(gameObject);
        });
      }
    } catch (e) {
      console.error(e);
    }
  }

  unloadScene() {
    // Remove all GameObjects from the scene.
    // Currently it is assumed that the interpreter will
    // only add GameObjects to the scene, so this should be complete.
    this.scene.children
      .filter((x) => x instanceof GameObject)
      .forEach((go) => {
        console.log("Unloading " + go.constructor.name);
        this.scene.remove(go);
      });
  }

  handleMouseMove(event: MouseEvent) {
    if (!this.root || !this.mouse) return;
    const bound = this.root.getBoundingClientRect();
    const x = event.clientX - bound.left;
    const y = event.clientY - bound.top;
    this.mouse.x = (x / this.root.clientWidth) * 2 - 1;
    this.mouse.y = -(y / this.root.clientHeight) * 2 + 1;
  }

  update() {
    // Run the update step on any scene objects which implement the update interface
    const delta = this.clock.getDelta();
    this.scene.traverse((o: any) => {
      if (o.update) o.update(delta);
    });

    // Enable the orbit controls iff motion is supported
    this.controls.enabled = this.highlightManager.highlighted === null;

    requestAnimationFrame(this.update.bind(this));
    this.render();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    console.log("Disposing of the scene");
    window.removeEventListener("resize", this.resizeHandler);
    window.removeEventListener("mousemove", this.mouseHandler);
  }
}

// These variables will be set on the window during interpreting.
export type InterpreterResults = {
  world: any;
  data: any;
};

export default GameRunner;
