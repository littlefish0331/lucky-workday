// 擲筊的 3D 場景。這個檔案會 import three，所以「只能」用動態 import() 載入，不能被首頁的程式碼靜態引用，
// 否則 three 會被打進主程式包（約 +500KB）。呼叫端見 TossStep：進到擲筊頁才 import('../lib/jiaobei-scene')。
//
// 失敗一律退回 2D：建立 WebGL 失敗、貼圖載入失敗都會讓 createScene 丟出例外，由呼叫端接住、改用原本的 CSS 版本。
import * as THREE from 'three';
import { JIAOBEI_ASPECT, JIAOBEI_OUTLINE } from '../data/jiaobei-shape';
import { art } from '../data/art';
import { HAND_HEIGHT, TOTAL_MS, poseAt, type BlockPlan } from './jiaobei-physics';

export interface JiaobeiScene {
  /** 放兩個筊杯回到手上、準備下一次擲出（靜止在畫面外上方） */
  reset(): void;
  /** 開始演出一次擲出。onLanded 在最後一格靜止時呼叫一次 */
  play(plans: readonly [BlockPlan, BlockPlan], onLanded: () => void): void;
  /** 直接把兩個筊杯擺在落地姿態（用於初始畫面、prefers-reduced-motion、截圖） */
  settle(plans: readonly [BlockPlan, BlockPlan]): void;
  resize(): void;
  dispose(): void;
}

const CX = JIAOBEI_ASPECT / 2;

/** 輪廓（以筊杯中心為原點，旋轉才會繞著中心） */
function makeShape(): THREE.Shape {
  const pts = JIAOBEI_OUTLINE;
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0] - CX, pts[0][1] - 0.5);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0] - CX, pts[i][1] - 0.5);
  shape.closePath();
  return shape;
}

/** UV 直接用 XY 座標對應貼圖：u = (x + CX) / 寬高比、v = y + 0.5，貼圖與輪廓一一對應 */
function mapUV(geo: THREE.BufferGeometry) {
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + CX) / JIAOBEI_ASPECT, pos.getY(i) + 0.5);
  uv.needsUpdate = true;
}

/** 擠出厚度的月牙。前後兩個蓋面的輪廓＝原輪廓（bevelOffset 0），側面微微鼓出，所以蓋面貼圖的邊剛好對齊 */
function makeBlockGeometry(): THREE.ExtrudeGeometry {
  const geo = new THREE.ExtrudeGeometry(makeShape(), { depth: 0.12, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.03, bevelSegments: 3, curveSegments: 1 });
  geo.translate(0, 0, -0.06); // 厚度置中：前蓋面在 +0.095、後蓋面在 -0.095
  mapUV(geo);
  return geo;
}

function loadTexture(loader: THREE.TextureLoader, url: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        resolve(t);
      },
      undefined,
      () => reject(new Error(`貼圖載入失敗：${url}`)),
    );
  });
}

export async function createScene(canvas: HTMLCanvasElement): Promise<JiaobeiScene> {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap; // 0.187 已移除 PCFSoftShadowMap，用了會在主控台警告

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50);
  // 從斜上方看地面，看得到拋起的高度也看得到落點。
  // 數字不是目測：用 jiaobei-physics 的軌跡掃 120 個 seed、在畫布寬高比 0.95～1.2 下，
  // 確認筊杯全程（含拋到最高）都在畫面內、邊界留 ≥5%；拋起時筊杯約比落地時大 39%（近大遠小）。
  camera.position.set(0, 5.2, 6.2);
  camera.lookAt(0, 0.5, 0.1);

  scene.add(new THREE.HemisphereLight(0xfff0d8, 0x4a2c20, 1.5));
  const sun = new THREE.DirectionalLight(0xffe2b0, 2.4);
  sun.position.set(-2.2, 6, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  const sc = sun.shadow.camera;
  sc.left = -3; sc.right = 3; sc.top = 3; sc.bottom = -3; sc.near = 0.5; sc.far = 14;
  sun.shadow.radius = 4;
  scene.add(sun);

  // 地面：只接影子（透明），底下的網頁背景透出來
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(10, 8), new THREE.ShadowMaterial({ opacity: 0.45 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const loader = new THREE.TextureLoader();
  let texFlat: THREE.Texture;
  let texRound: THREE.Texture;
  try {
    [texFlat, texRound] = await Promise.all([loadTexture(loader, art.jiaobei.flat), loadTexture(loader, art.jiaobei.round)]);
  } catch (e) {
    renderer.dispose();
    throw e;
  }

  const geo = makeBlockGeometry();
  const side = new THREE.MeshStandardMaterial({ color: 0x6a1a10, roughness: 0.55, metalness: 0.0 });
  // ExtrudeGeometry 的材質群組：0 = 前後兩個蓋面、1 = 側面。前後共用同一個材質，
  // 所以平面／圓面靠「翻轉整個筊杯」呈現：flat 貼圖在 +z 面，round 貼圖放在另一個疊上去的薄片（見下）。
  const faceMat = (t: THREE.Texture, sideOf: THREE.Side = THREE.FrontSide) => new THREE.MeshStandardMaterial({ map: t, roughness: 0.5, metalness: 0.05, side: sideOf });

  // 每個筊杯 = 一個群組：本體（側面深紅、前後蓋面貼「平面」） + 一片貼「圓面」的薄片蓋住後蓋面。
  // 約定：平面朝 +z、圓面朝 -z。
  const capGeo = new THREE.ShapeGeometry(makeShape());
  mapUV(capGeo);
  const makeBlock = () => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(geo, [faceMat(texFlat), side]);
    body.castShadow = true;
    g.add(body);
    // 圓面薄片：和本體「同一個輪廓、同一組 UV」，只是只畫背面（BackSide），所以從 -z 方向看得到、輪廓與本體完全重合。
    // 不能用 rotation.y = π 翻過去：那會讓輪廓左右鏡射，和本體對不上，邊緣就會冒出一圈鏡射的「耳朵」。
    // 代價：從背面看，圓面的高光會左右反過來（上方光點在右上而不是左上），不影響辨識。
    const cap = new THREE.Mesh(capGeo, faceMat(texRound, THREE.BackSide));
    cap.position.z = -0.0955; // 貼在後蓋面（-0.095）外側一點點，避免 z-fighting
    g.add(cap);
    return g;
  };
  const blocks = [makeBlock(), makeBlock()];
  blocks.forEach((b) => scene.add(b));

  /**
   * 姿態約定（和 jiaobei-physics 一致）：Euler 順序 XYZ，矩陣 = Rx·Ry·Rz，所以向量先被 z（筊杯自己平面內的朝向）轉，
   * 最後才被 x 翻面，等於落地後的「水平朝向」。flat 朝上 = x -90°（+z 轉成 +y）、round 朝上 = x +90°（-z 轉成 +y）。
   */
  const apply = (b: THREE.Object3D, p: ReturnType<typeof poseAt>) => {
    b.position.set(p.pos.x, p.pos.y, p.pos.z);
    b.rotation.set(p.rot.x, p.rot.y, p.rot.z, 'XYZ');
  };

  let raf = 0;
  let disposed = false;
  let plans: readonly [BlockPlan, BlockPlan] | null = null;
  let start = 0;
  let onLanded: (() => void) | null = null;

  const render = () => renderer.render(scene, camera);
  const frame = (now: number) => {
    if (disposed || !plans) return;
    const t = now - start;
    blocks.forEach((b, i) => apply(b, poseAt(plans![i], t)));
    render();
    if (t >= TOTAL_MS) {
      raf = 0;
      const cb = onLanded;
      onLanded = null;
      cb?.();
      return;
    }
    raf = requestAnimationFrame(frame);
  };

  const resize = () => {
    const w = canvas.clientWidth || 360;
    const h = canvas.clientHeight || 300;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    render();
  };

  const park = () => {
    // 待機：兩個筊杯停在畫面上方（手上），還沒擲出
    blocks[0].position.set(-0.35, HAND_HEIGHT, 1.4);
    blocks[1].position.set(0.35, HAND_HEIGHT, 1.4);
    blocks.forEach((b) => b.rotation.set(-Math.PI / 2 + 0.5, 0, 0, 'XYZ'));
  };
  park();
  resize();

  return {
    reset() {
      cancelAnimationFrame(raf);
      raf = 0;
      plans = null;
      park();
      render();
    },
    play(p, cb) {
      cancelAnimationFrame(raf);
      plans = p;
      onLanded = cb;
      start = performance.now();
      raf = requestAnimationFrame(frame);
    },
    settle(p) {
      cancelAnimationFrame(raf);
      raf = 0;
      plans = p;
      blocks.forEach((b, i) => apply(b, poseAt(p[i], TOTAL_MS)));
      render();
    },
    resize,
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      geo.dispose();
      capGeo.dispose();
      side.dispose();
      texFlat.dispose();
      texRound.dispose();
      blocks.forEach((b) => b.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          mats.forEach((x) => x !== side && x.dispose());
        }
      }));
      renderer.dispose();
    },
  };
}
