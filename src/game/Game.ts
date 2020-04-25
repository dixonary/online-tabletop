import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  AmbientLight,
  SpotLight,
  HemisphereLight,
  MeshBasicMaterial,
  Mesh,
  LinearFilter,
  BoxGeometry,
  BackSide,
  MeshStandardMaterial,
  Material,
  Vector2,
  Color,
  Clock,
} from "three";
import { AutoUV, ApplyFaceMaterials } from "./GeometryTools";
import { TextureList, Texture } from "./resource";
import Log from "./Log";
import NetworkClient, { StateMode } from "./managers/NetworkClient";
import StateManager from "./managers/StateManager";
import GrabberManager from "./controllers/GrabberController";
import Input from "./managers/Input";
import IDManager from "./managers/IDManager";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";

import PlayerManager from "./managers/PlayerManager";
import Authority from "./managers/Authority";
import CameraControls from "./CameraControls";
import BasicObject from "./BasicObject";
import Physics from "./managers/Physics";
import * as CANNON from "cannon";

// Exports for the client
import * as resource from "./resource";
import * as controller from "./controller";
import * as component from "./component";
import * as struct from "./StateStructures";
import Tooltip from "./managers/Tooltip";

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
  cameraControls: CameraControls;

  composer: EffectComposer;
  outlinePass: OutlinePass;
  renderPass: RenderPass;

  root: HTMLElement;
  room: Room;
  mode: GameMode;

  clock: Clock;

  // We define this so that it can be disposed of
  private resizeHandler = this.handleResize.bind(this);

  constructor(root: HTMLElement, mode: GameMode) {
    Game.instance = this;
    this.root = root;
    this.mode = mode;

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
    // this.composer.addPass(this.outlinePass);

    // Initialize global managers
    Log.Initialize(root);
    Input.Initialize(root);
    Tooltip.Initialize(root);
    NetworkClient.Initialize();
    PlayerManager.Initialize();
    Authority.Initialize();
    Physics.Initialize();

    this.cameraControls = new CameraControls(this.camera);

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
    // renderer.shadowMap.enabled = true;
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

  hostRoom(sceneCode: string) {
    Log.Info("Connecting...");
    NetworkClient.Host(sceneCode);
  }

  joinRoom(roomCode: string) {
    Log.Info("Connecting...");
    NetworkClient.Join(roomCode);
  }

  begin() {
    requestAnimationFrame(this.update.bind(this));
  }

  preGameSetup() {
    // Re-export the toolbox to the window!
    (window as any).game = this;
    (window as any).resource = resource;
    (window as any).component = component;
    (window as any).controller = controller;
    (window as any).struct = struct;

    // We set this local so that state changes made before setup is complete
    // are not propagated to the network.
    NetworkClient.stateMode = StateMode.LOCAL;
  }

  postGameSetup() {
    new GrabberManager();

    // Re-enable state propagation.
    NetworkClient.stateMode = StateMode.GLOBAL;
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
    IDManager.reset();
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

    Physics.world.step(1 / 120, delta);

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

class Room extends Mesh {
  constructor() {
    super();

    const texture = Texture.get(
      process.env.PUBLIC_URL + "/resources/fireplace.jpg"
    ).value;
    texture.magFilter = LinearFilter;
    texture.minFilter = LinearFilter;

    // Generate the room geometry
    const w = 6;
    const h = 3;
    const d = 6;
    const geometry = new BoxGeometry(w, h, d);

    AutoUV(geometry);
    geometry.computeFaceNormals();
    geometry.computeVertexNormals();

    // Set the correct materials to the correct walls
    ApplyFaceMaterials(geometry, { flat: 2, deep: 1, wide: 1, other: 1 });

    // Load the materials
    const whiteMat = new MeshBasicMaterial({
      color: "#eeeeee",
      side: BackSide,
    });

    const brickTexture = new TextureList(
      (s) => process.env.PUBLIC_URL + `/resources/brick-wall/${s}.jpg`,
      ["color", "ao", "bump", "disp", "norm", "gloss"]
    );

    const brickMat = new MeshStandardMaterial({ side: BackSide });
    brickMat.map = brickTexture.get("color");
    brickMat.metalnessMap = brickTexture.get("gloss");
    brickMat.bumpMap = brickTexture.get("bump");
    brickMat.aoMapIntensity = 0.5;

    const floorTexture = new TextureList(
      (s) => process.env.PUBLIC_URL + `/resources/wood-floor/${s}.jpg`,
      ["color", "refl", "disp", "norm", "gloss"]
    );
    const floorMat = new MeshStandardMaterial({ side: BackSide });
    floorMat.map = floorTexture.get("color");
    floorMat.normalMap = floorTexture.get("norm");
    floorMat.metalnessMap = floorTexture.get("gloss");

    this.geometry = geometry;
    this.material = [whiteMat, brickMat, floorMat];
    this.castShadow = false;
    this.receiveShadow = true;

    // Add floor and wall bodies to the physics
    const floorBody = new CANNON.Body({ mass: 0 });
    const plane = new CANNON.Plane();

    const bottom = new CANNON.Vec3(0, 0, 0);
    const top = new CANNON.Vec3(0, 0, h);
    const left = new CANNON.Vec3(-w / 2, 0, 0);
    const right = new CANNON.Vec3(w / 2, 0, 0);
    const front = new CANNON.Vec3(0, -d / 2, 0);
    const back = new CANNON.Vec3(0, d / 2, 0);
    const up = new CANNON.Vec3(0, 0, 1);
    const quat = new CANNON.Quaternion();

    floorBody.addShape(plane, bottom);
    floorBody.addShape(plane, top, quat.setFromEuler(0, 0, Math.PI));

    for (let x of [left, right, front, back]) {
      quat.setFromVectors(up, x);
      floorBody.addShape(plane, x, quat);
    }

    // Add to the scene
    this.position.setY(h / 2);
    Game.instance.scene.add(this);
  }

  dispose() {
    (this.material as Material[]).forEach((m) => m.dispose());
    this.geometry.dispose();
  }
}

export default Game;
