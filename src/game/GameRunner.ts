import {
  Vector2,
  Clock,
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Color,
} from "three";
import { GlobalAccess } from "../GameRenderer";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { GameObject } from "./Game";
import Log from "./Log";
import GrabberManager from "./grabber/GrabberManager";
import NetworkClient from "./NetworkClient";
import { StateController } from "./StateMachine";
import IDManager from "./IDManager";
import Input from "./Input";
import Grabber from "./grabber/Grabber";
import TrackedObject from "./TrackedObject";

class GameRunner {
  mouse: THREE.Vector2 = new Vector2();
  root: HTMLDivElement;
  clock: THREE.Clock = new Clock();
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  controls: OrbitControls;
  stateController: StateController = new StateController();
  network: NetworkClient = new NetworkClient();
  sceneCode: string = "";

  outlinePass: OutlinePass;
  composer: EffectComposer;

  // We define this so that it can be disposed of
  private resizeHandler = this.handleResize.bind(this);

  constructor(root: HTMLDivElement) {
    this.root = root;

    const global = (window as any) as GlobalAccess;

    this.renderer = global.renderer;
    this.scene = global.scene;
    this.camera = global.camera;

    this.controls = new OrbitControls(this.camera, this.root);
    window.addEventListener("resize", this.resizeHandler);

    // Set up the effect composer
    this.composer = new EffectComposer(this.renderer);

    var renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    this.outlinePass = new OutlinePass(
      new Vector2(window.innerWidth, window.innerHeight),
      this.scene,
      this.camera
    );
    this.outlinePass.visibleEdgeColor = new Color(0xffffff);
    this.outlinePass.edgeStrength = 3;
    this.outlinePass.edgeGlow = 0;
    this.outlinePass.edgeThickness = 1;

    this.composer.addPass(this.outlinePass);
    Grabber.outlinePass = this.outlinePass;

    // Initialise global singletons
    Log.Initialize(this.root);
    NetworkClient.Initialize();
    Input.Initialize(this.root);

    this.handleResize();
    this.begin();
  }

  begin() {
    requestAnimationFrame(this.update.bind(this));
  }

  hostRoom(sceneCode: string) {
    Log.Info("Connecting...");
    NetworkClient.Host(sceneCode, this);
  }

  joinRoom(roomCode: string) {
    Log.Info("Connecting...");
    NetworkClient.Join(roomCode, this);
  }

  loadScene() {
    // Unload first just in case
    this.unloadScene();

    const sceneCode = this.sceneCode;
    try {
      // eslint-disable-next-line
      eval.call(window, sceneCode);
      this.additionalGameSetup();
    } catch (e) {
      Log.Error(e);
      console.error(e);
    }
  }

  additionalGameSetup() {
    new GrabberManager(NetworkClient.players.map((p) => p.id));
  }

  unloadScene() {
    // Remove all GameObjects from the scene.
    // Currently it is assumed that the interpreter will
    // only add GameObjects to the scene, so this should be complete.
    this.scene.children
      .filter((x) => x instanceof TrackedObject)
      .forEach((go) => {
        console.log("Unloading " + go.constructor.name);
        this.scene.remove(go);
      });

    // Set the global state controls back to their initial values
    StateController.Clear();
    IDManager.reset();
  }
  handleResize() {
    if (!this.root.parentElement) return;
    const w = this.root.parentElement.clientWidth;
    const h = this.root.parentElement.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
  }

  update() {
    // Run the update step on any scene objects which implement the update interface
    const delta = this.clock.getDelta();
    this.scene.traverse((o: any) => {
      if (o.update) o.update(delta);
    });

    requestAnimationFrame(this.update.bind(this));
    this.render();
  }

  render() {
    this.composer.render();
  }

  dispose() {
    console.log("Disposing of the scene");
  }
}

// These variables will be set on the window during interpreting.
export type InterpreterResults = {
  world: any;
  data: any;
};

export default GameRunner;
