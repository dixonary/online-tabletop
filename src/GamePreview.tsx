import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
// import fireplace from "./fireplace.jpg";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { Scene, Mesh } from "three";
import * as game from "./game/Game";
import * as resource from "./game/resource";
import { AutoUV } from "./GeometryTools";

const GamePreview = ({ sceneCode }: { sceneCode: string }) => {
  const [scene, setScene] = useState<Scene | null>(null);
  const [camera, setCamera] = useState<THREE.PerspectiveCamera | null>(null);
  const [renderer, setRenderer] = useState<THREE.WebGLRenderer | null>(null);

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

    setScene(scene);
    setCamera(camera);
    setRenderer(renderer);
  }, [setScene, setCamera, setRenderer]);

  if (!scene || !camera || !renderer) return <></>;

  return (
    <PreviewManager
      scene={scene}
      camera={camera}
      renderer={renderer}
      sceneCode={sceneCode}
    ></PreviewManager>
  );
};

const PreviewManager = ({
  scene,
  camera,
  renderer,
  sceneCode,
}: {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  sceneCode: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const mouse = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const highlighted: { last: game.GameObject | null } = { last: null };
  raycaster.setFromCamera(mouse, camera);

  const handleResize = () => {
    if (!ref.current) return;
    const w = ref.current?.parentElement?.clientWidth ?? 100;
    const h = ref.current?.parentElement?.clientHeight ?? 100;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    renderer.setSize(w, h);
  };

  const animate = () => {
    requestAnimationFrame(animate);

    raycaster.setFromCamera(mouse, camera);

    // calculate objects intersecting the picking ray
    const global = (window as any) as GlobalAccess;

    if (global.world) {
      const allMainedObjects = scene.children.filter(
        (i) => i instanceof game.GameObject && i.main
      ) as game.GameObject[];
      var intersects = raycaster.intersectObjects(
        allMainedObjects.map((m) => m.main as Mesh)
      );
      if (intersects[0]) {
        // This MUST be a gameobject by definition
        let gameObj = intersects[0].object.parent as game.GameObject;

        if (highlighted.last !== gameObj) {
          if (highlighted.last) {
            highlighted.last.runCallback("highlight_off");
          }
          highlighted.last = gameObj;
          gameObj.runCallback("highlight_on");
        }
      } else {
        if (highlighted.last) highlighted.last.runCallback("highlight_off");
        highlighted.last = null;
      }
    }

    if (highlighted.last) {
      highlighted.last.runCallback("highlight_update");
    }

    renderer.render(scene, camera);
  };

  const handleMouseMove = (event: MouseEvent) => {
    if (!ref.current) return;
    const bound = ref.current.getBoundingClientRect();
    const x = event.clientX - bound.left;
    const y = event.clientY - bound.top;
    mouse.x = (x / ref.current.clientWidth) * 2 - 1;
    mouse.y = -(y / ref.current.clientHeight) * 2 + 1;
  };

  useEffect(() => {
    if (!ref.current) return;
    ref.current?.appendChild(renderer.domElement);
    animate();
    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove, false);
    handleResize();

    const controls = new OrbitControls(camera, ref.current);
    controls.target.set(0, 1, 0);
    controls.update();
    controls.maxPolarAngle = Math.PI / 2;
    controls.enablePan = true;

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove, false);
    };
  });

  useEffect(() => {
    const loadScenePreview = (sceneCode: string) => {
      try {
        const global = (window as any) as GlobalAccess;
        global.world = null;
        global.game = game;
        global.resource = resource;
        global.THREE = THREE;
        global.scene = scene;
        // eslint-disable-next-line
        eval(sceneCode);
        if (global.world) {
          Object.entries(global.world).forEach(
            ([name, gameObject]: [string, any]) => {
              scene.add(gameObject);
            }
          );
        }
      } catch (e) {
        console.error(e);
      }
    };
    const unloadScene = () => {
      const global = (window as any) as GlobalAccess;
      if (global.world) {
        scene.children
          .filter((x) => x instanceof game.GameObject)
          .forEach((go) => {
            console.log("Unloading " + go.constructor.name);
            scene.remove(go);
          });
        // Object.entries(global.world).forEach(
        //   ([name, gameObject]: [string, any]) => {
        //     console.log("Unloading " + name);
        //     scene.remove(gameObject);
        //   }
        // );
      }
    };
    // Do the load, and prepare the unload for unmount
    loadScenePreview(sceneCode);
    return unloadScene;
  }, [sceneCode, scene]);

  return <div ref={ref}></div>;
};

export type GlobalAccess = {
  world: any;
  game: any;
  resource: any;
  scene: any;
  THREE: any;
};

export default GamePreview;
