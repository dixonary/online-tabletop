import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
// import fireplace from "./fireplace.jpg";
import * as game from "./game/Game";
import * as resource from "./game/resource";
import { AutoUV } from "./GeometryTools";
import GameRunner from "./game/GameRunner";

const GameRenderer = ({ sceneCode }: { sceneCode: string }) => {
  const [initialized, setInitialized] = useState<boolean>(false);

  useEffect(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor("#D9C2F0");
    renderer.autoClearColor = false;
    renderer.setSize(0, 0);
    renderer.shadowMap.enabled = true;
    renderer.autoClearColor = false;

    camera.position.z = 2;
    camera.position.y = 1;

    var ambient = new THREE.AmbientLight("#444"); // soft white light
    scene.add(ambient);

    var spotty = new THREE.SpotLight("#666");
    spotty.position.set(0, 2.5, 0);
    spotty.angle = Math.PI / 2.5;
    spotty.castShadow = true;
    scene.add(spotty);

    var hemi = new THREE.HemisphereLight("#aaa");
    hemi.position.set(0, 2.5, 0);
    scene.add(hemi);

    {
      let geometry = new THREE.SphereGeometry(0.2);
      let material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
      let sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(0, 2.5, 0);
      scene.add(sphere);
    }

    let skybox: THREE.Mesh;
    {
      const texture = resource.Texture.get(
        process.env.PUBLIC_URL + "/resources/fireplace.jpg"
      ).value;
      texture.magFilter = THREE.LinearFilter;
      texture.minFilter = THREE.LinearFilter;

      const w = 6;
      const h = 3;
      const d = 6;
      const geometry = new THREE.BoxGeometry(w, h, d);

      AutoUV(geometry);
      geometry.computeFaceNormals();
      geometry.computeVertexNormals();

      const whiteMat = new THREE.MeshBasicMaterial({
        color: "#eeeeee",
        side: THREE.BackSide,
      });

      const brickTexture = new resource.TextureList(
        (s) => process.env.PUBLIC_URL + `/resources/brick-wall/${s}.jpg`,
        ["color", "ao", "bump", "disp", "norm", "gloss"]
      );

      const brickMat = new THREE.MeshStandardMaterial({ side: THREE.BackSide });
      brickMat.map = brickTexture.get("color");
      brickMat.metalnessMap = brickTexture.get("gloss");
      brickMat.bumpMap = brickTexture.get("bump");
      brickMat.aoMapIntensity = 0.5;

      const floorTexture = new resource.TextureList(
        (s) => process.env.PUBLIC_URL + `/resources/wood-floor/${s}.jpg`,
        ["color", "refl", "disp", "norm", "gloss"]
      );
      const floorMat = new THREE.MeshStandardMaterial({ side: THREE.BackSide });
      floorMat.map = floorTexture.get("color");
      floorMat.normalMap = floorTexture.get("norm");
      floorMat.metalnessMap = floorTexture.get("gloss");

      geometry.faces.forEach((face) => {
        const a = geometry.vertices[face.a];
        const b = geometry.vertices[face.b];
        const c = geometry.vertices[face.c];
        const flat = a.y === b.y && a.y === c.y;
        const deep = a.x === b.x && b.x === c.x;
        const wide = a.z === b.z && a.z === c.z;
        if (flat) face.materialIndex = 2;
        if (deep) face.materialIndex = 1;
        if (wide) face.materialIndex = 1;
      });
      skybox = new THREE.Mesh(geometry, [whiteMat, brickMat, floorMat]);
      skybox.castShadow = false;
      skybox.receiveShadow = true;

      skybox.position.setY(h / 2);
      scene.add(skybox);
    }

    const _global: GlobalAccess = {
      THREE,
      game,
      resource,
      scene,
      camera,
      renderer,
    };
    Object.assign(window as any, { ..._global, world: {}, data: {} });
    setInitialized(true);
  }, [setInitialized]);

  if (!initialized) return <></>;

  return <PreviewManager sceneCode={sceneCode}></PreviewManager>;
};

const PreviewManager = ({ sceneCode }: { sceneCode: string }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const runnerRef = useRef<GameRunner | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const { renderer } = (window as any) as GlobalAccess;
    root.appendChild(renderer.domElement);

    if (!runnerRef.current) {
      const runner = new GameRunner({ root });
      runnerRef.current = runner;
    }

    return () => {
      const runner = runnerRef.current;
      if (!runner) return;
      runner.dispose();
    };
  }, []);

  useEffect(() => {
    const runner = runnerRef.current;
    if (runner) {
      runner.loadScene(sceneCode);
    }
    return () => {
      const runner = runnerRef.current;
      if (runner) runner.unloadScene();
    };
  }, [sceneCode, runnerRef]);

  return <div ref={rootRef}></div>;
};

// These variables will be attached to the window, and so can be accessed
// via the interpreter.
export type GlobalAccess = {
  THREE: any;
  game: any;
  camera: THREE.PerspectiveCamera;
  resource: any;
  renderer: THREE.Renderer;
  scene: THREE.Scene;
};

export default GameRenderer;
