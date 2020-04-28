import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  AmbientLight,
  SpotLight,
  HemisphereLight,
  Vector2,
  Color,
  Clock,
} from "three";

import Manager from "./manager/Manager";

import {
  Log,
  Network,
  StateManager,
  Input,
  IDManager,
  Overlay,
  LoadingManager,
  PlayerManager,
  Tooltip,
  Authority,
  Physics,
  Trash,
  JoinRequests,
} from "./manager/";

import { StateMode } from "./manager/Network";
import GrabberController from "./controller/GrabberController";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";

import CameraControls from "./CameraControls";
import BasicObject from "./BasicObject";

// Exports for the client
import * as manager from "./manager/";
import * as resource from "./resource/";
import * as controller from "./controller/";
import * as component from "./component/";
import * as struct from "./StateStructures";
import * as THREE from "three";

import Room from "./Room";

export enum GameMode {
  HOST,
  JOIN,
}

/**
 * Globally instanced variables are attached here.
 */
class Game {
  static instance: Game;

  sceneCode: string = "";
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  composer: EffectComposer;
  outlinePass: OutlinePass;
  renderPass: RenderPass;

  managers: typeof Manager[];

  root: HTMLElement;
  room: Room;

  clock: Clock;

  // We define this so that it can be disposed of
  private resizeHandler = this.handleResize.bind(this);

  constructor(root: HTMLElement) {
    Game.instance = this;
    this.root = root;

    this.scene = new Scene();
    this.renderer = this.initializeRenderer();
    this.camera = this.initializeCamera();

    this.addLighting();

    this.clock = new Clock();

    // Set up the effect composer
    this.composer = new EffectComposer(this.renderer);

    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

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

    // Initialize global managers

    const rootedManagers = [Log, Input, Tooltip, Overlay, JoinRequests];
    rootedManagers.forEach((m) => m.Initialize(root));

    const plainManagers = [
      Network,
      PlayerManager,
      LoadingManager,
      Authority,
      Physics,
      Trash,
    ];
    plainManagers.forEach((m) => m.Initialize());

    this.managers = ([] as typeof Manager[]).concat(
      rootedManagers,
      plainManagers,
      []
    );

    for (let manager of this.managers) {
      if (!(manager as typeof Manager).Initialized) {
        Log.Warn(
          `${(manager as Function).name} was not initialized` +
            ` before being added to the manager list.`
        );
      }
    }

    window.addEventListener("resize", this.resizeHandler);

    // Generate the default room
    this.room = new Room();

    // Start rendering
    this.handleResize();
    this.begin();
  }

  initializeRenderer() {
    const renderer = new WebGLRenderer({
      antialias: false,
      powerPreference: "high-performance",
    });
    renderer.setClearColor("#D9C2F0");
    renderer.autoClearColor = false;
    renderer.setSize(0, 0);
    renderer.shadowMap.enabled = true;
    renderer.autoClearColor = false;
    this.root.appendChild(renderer.domElement);
    return renderer;
  }

  initializeCamera() {
    const camera = new PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.z = 2;
    camera.position.y = 1;
    return camera;
  }

  // hostRoom(sceneCode: string) {
  //   Log.Info("Connecting...");
  //   Network.Host(sceneCode);
  // }

  // joinRoom(roomCode: string) {
  //   Log.Info("Connecting...");
  //   Network.Join(roomCode);
  // }

  begin() {
    requestAnimationFrame(this.update.bind(this));
  }

  preGameSetup() {
    // Re-export the toolbox to the window!
    (window as any).game = this;
    (window as any).scene = this.scene;
    (window as any).resource = resource;
    (window as any).component = component;
    (window as any).controller = controller;
    (window as any).manager = manager;
    (window as any).struct = struct;
    (window as any).THREE = THREE;

    // We set this local so that state changes made before setup is complete
    // are not propagated to the network.
    Network.stateMode = StateMode.LOCAL;
  }

  postGameSetup() {
    new GrabberController();
    new CameraControls(this.camera);

    // Re-enable state propagation.
    Network.stateMode = StateMode.GLOBAL;
  }

  unloadScene() {
    // Remove all GameObjects from the scene.
    // Currently it is assumed that the interpreter will
    // only add GameObjects to the scene, so this should be complete.
    this.scene.children
      .filter((x) => x instanceof BasicObject)
      .forEach((go) => {
        console.log("Unloading " + go.constructor.name);
        (go as BasicObject).dispose();
      });

    // Set the global state controls back to their initial values
    StateManager.Clear();
    IDManager.Reset();
  }

  loadScene() {
    // Unload first just in case
    this.unloadScene();

    try {
      this.preGameSetup();
      // eslint-disable-next-line
      eval.call(window, this.sceneCode);
      this.postGameSetup();
    } catch (e) {
      Log.Error(e);
      console.error(e);
    }
  }

  addLighting() {
    var ambient = new AmbientLight("#444"); // soft white light
    this.scene.add(ambient);

    var spotty = new SpotLight("#666");
    spotty.position.set(0, 2.5, 0);
    spotty.angle = Math.PI / 2.5;
    spotty.castShadow = true;
    this.scene.add(spotty);

    spotty.shadow.mapSize = new Vector2(4096, 4096);

    var hemi = new HemisphereLight("#666");
    hemi.position.set(0, 2.5, 0);
    this.scene.add(hemi);
  }

  dispose() {
    this.room.dispose();
  }

  update() {
    // Run the update step on any scene objects which implement the update interface
    const delta = this.clock.getDelta();

    this.scene.traverse((o: any) => {
      if (o.update) o.update(delta);
    });

    this.managers.forEach((m) => m.Update(delta));

    // Pause while loading slow resources so that physics doesn't go funny
    // when the geometries pop in!
    if (LoadingManager.ready) Physics.world.step(1 / 120, delta);

    requestAnimationFrame(this.update.bind(this));
    this.render();
  }

  render() {
    this.composer.render();
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
}

export default Game;
