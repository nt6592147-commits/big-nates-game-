import * as THREE from 'three';

export interface ProceduralTextureSet {
  asphaltMap: THREE.CanvasTexture;
  asphaltBump: THREE.CanvasTexture;
  dirtMap: THREE.CanvasTexture;
  grassMap: THREE.CanvasTexture;
  bridgeDeckMap: THREE.CanvasTexture;
  waterNormal: THREE.CanvasTexture;
  roofTileMap: THREE.CanvasTexture;
  contactShadowMap: THREE.CanvasTexture;
  buildingFacadeMap: THREE.CanvasTexture;
  plazaMap: THREE.CanvasTexture;
  dispose: () => void;
}

function configureTex(
  canvas: HTMLCanvasElement,
  isColor: boolean,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = Math.max(1, anisotropy);
  tex.needsUpdate = true;
  return tex;
}

export function createProceduralTextures(maxAnisotropy: number, quality: 'low' | 'medium' | 'high'): ProceduralTextureSet {
  const sz = quality === 'low' ? 128 : quality === 'medium' ? 256 : 512;
  const aniso = quality === 'low' ? 1 : Math.min(8, maxAnisotropy);

  // 1. Asphalt Road Texture (with dashed center line & shoulders)
  const asphaltCanvas = document.createElement('canvas');
  asphaltCanvas.width = sz;
  asphaltCanvas.height = sz;
  const actx = asphaltCanvas.getContext('2d')!;
  actx.fillStyle = '#2d3138';
  actx.fillRect(0, 0, sz, sz);
  for (let i = 0; i < sz * 8; i++) {
    const x = Math.random() * sz;
    const y = Math.random() * sz;
    const v = 36 + Math.floor(Math.random() * 24);
    actx.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
    actx.fillRect(x, y, 2, 2);
  }
  // White shoulder stripes
  actx.fillStyle = '#d4d8de';
  actx.fillRect(sz * 0.05, 0, sz * 0.03, sz);
  actx.fillRect(sz * 0.92, 0, sz * 0.03, sz);
  // Amber dashed center line
  actx.fillStyle = '#eab308';
  actx.fillRect(sz * 0.485, sz * 0.1, sz * 0.03, sz * 0.35);
  actx.fillRect(sz * 0.485, sz * 0.6, sz * 0.03, sz * 0.35);
  const asphaltMap = configureTex(asphaltCanvas, true, aniso, 1, 4);

  // 2. Asphalt / Surface Micro-Bump
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = sz;
  bumpCanvas.height = sz;
  const bctx = bumpCanvas.getContext('2d')!;
  const imgData = bctx.createImageData(sz, sz);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const val = 100 + Math.floor(Math.random() * 60);
    imgData.data[i] = val;
    imgData.data[i + 1] = val;
    imgData.data[i + 2] = val;
    imgData.data[i + 3] = 255;
  }
  bctx.putImageData(imgData, 0, 0);
  const asphaltBump = configureTex(bumpCanvas, false, aniso, 4, 16);

  // 3. Dirt & Trail Texture
  const dirtCanvas = document.createElement('canvas');
  dirtCanvas.width = sz;
  dirtCanvas.height = sz;
  const dctx = dirtCanvas.getContext('2d')!;
  dctx.fillStyle = '#7c5d41';
  dctx.fillRect(0, 0, sz, sz);
  for (let i = 0; i < sz * 10; i++) {
    const x = Math.random() * sz;
    const y = Math.random() * sz;
    const r = 105 + Math.floor(Math.random() * 35);
    const g = 78 + Math.floor(Math.random() * 28);
    const b = 52 + Math.floor(Math.random() * 22);
    dctx.fillStyle = `rgb(${r},${g},${b})`;
    dctx.fillRect(x, y, 3, 3);
  }
  // Tire ruts
  dctx.fillStyle = 'rgba(62, 42, 26, 0.45)';
  dctx.fillRect(sz * 0.24, 0, sz * 0.14, sz);
  dctx.fillRect(sz * 0.62, 0, sz * 0.14, sz);
  const dirtMap = configureTex(dirtCanvas, true, aniso, 1, 4);

  // 4. Grass / Terrain Micro-Detail Texture
  const grassCanvas = document.createElement('canvas');
  grassCanvas.width = sz;
  grassCanvas.height = sz;
  const gctx = grassCanvas.getContext('2d')!;
  gctx.fillStyle = '#dcdcdc';
  gctx.fillRect(0, 0, sz, sz);
  for (let i = 0; i < sz * 16; i++) {
    const x = Math.random() * sz;
    const y = Math.random() * sz;
    const v = 165 + Math.floor(Math.random() * 55);
    gctx.fillStyle = `rgb(${v - 10},${v},${v - 16})`;
    gctx.fillRect(x, y, 2, 4);
  }
  const grassMap = configureTex(grassCanvas, true, aniso, 32, 32);

  // 5. Bridge Deck Texture (ribbed concrete + lengthwise road markings along U/X axis)
  const brCanvas = document.createElement('canvas');
  brCanvas.width = sz;
  brCanvas.height = sz;
  const brctx = brCanvas.getContext('2d')!;
  brctx.fillStyle = '#3f454e';
  brctx.fillRect(0, 0, sz, sz);
  brctx.fillStyle = '#31363e';
  for (let x = 0; x < sz; x += Math.max(8, sz / 8)) {
    brctx.fillRect(x, 0, 2, sz);
  }
  // White shoulder stripes along X (U axis)
  brctx.fillStyle = '#e2e8f0';
  brctx.fillRect(0, sz * 0.05, sz, sz * 0.03);
  brctx.fillRect(0, sz * 0.92, sz, sz * 0.03);
  // Amber dashed center line along X (U axis)
  brctx.fillStyle = '#facc15';
  brctx.fillRect(sz * 0.08, sz * 0.485, sz * 0.36, sz * 0.03);
  brctx.fillRect(sz * 0.56, sz * 0.485, sz * 0.36, sz * 0.03);
  const bridgeDeckMap = configureTex(brCanvas, true, aniso, 6, 1);

  // 6. Water Ripple Normal/Bump Texture
  const wCanvas = document.createElement('canvas');
  wCanvas.width = sz;
  wCanvas.height = sz;
  const wctx = wCanvas.getContext('2d')!;
  wctx.fillStyle = 'rgb(128, 128, 255)';
  wctx.fillRect(0, 0, sz, sz);
  for (let y = 0; y < sz; y += 2) {
    for (let x = 0; x < sz; x += 2) {
      const nx = Math.sin((x / sz) * Math.PI * 8 + Math.cos((y / sz) * Math.PI * 6)) * 32 + 128;
      const ny = Math.cos((y / sz) * Math.PI * 10 + Math.sin((x / sz) * Math.PI * 4)) * 32 + 128;
      wctx.fillStyle = `rgb(${Math.floor(nx)},${Math.floor(ny)},245)`;
      wctx.fillRect(x, y, 2, 2);
    }
  }
  const waterNormal = configureTex(wCanvas, false, aniso, 6, 18);

  // 7. Roof Tile Texture
  const rCanvas = document.createElement('canvas');
  rCanvas.width = 128;
  rCanvas.height = 128;
  const rctx = rCanvas.getContext('2d')!;
  rctx.fillStyle = '#8b3a2b';
  rctx.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 16) {
    rctx.fillStyle = 'rgba(0,0,0,0.22)';
    rctx.fillRect(0, y, 128, 2);
    for (let x = (y % 32 === 0 ? 0 : 8); x < 128; x += 16) {
      rctx.fillStyle = 'rgba(255,220,200,0.1)';
      rctx.fillRect(x, y + 2, 12, 12);
    }
  }
  const roofTileMap = configureTex(rCanvas, true, aniso, 3, 3);

  // 8. Soft Radial Contact Shadow Disc
  const csCanvas = document.createElement('canvas');
  csCanvas.width = 128;
  csCanvas.height = 128;
  const csctx = csCanvas.getContext('2d')!;
  const grad = csctx.createRadialGradient(64, 64, 12, 64, 64, 62);
  grad.addColorStop(0, 'rgba(8, 12, 10, 0.72)');
  grad.addColorStop(0.6, 'rgba(8, 12, 10, 0.35)');
  grad.addColorStop(1, 'rgba(8, 12, 10, 0)');
  csctx.fillStyle = grad;
  csctx.fillRect(0, 0, 128, 128);
  const contactShadowMap = new THREE.CanvasTexture(csCanvas);
  contactShadowMap.colorSpace = THREE.SRGBColorSpace;
  contactShadowMap.needsUpdate = true;

  // 9. Skyscraper Glass & Mullion Facade Texture
  const facCanvas = document.createElement('canvas');
  facCanvas.width = sz;
  facCanvas.height = sz;
  const fctx = facCanvas.getContext('2d')!;
  fctx.fillStyle = '#1e293b';
  fctx.fillRect(0, 0, sz, sz);
  const cols = 8;
  const rows = 12;
  const cw = sz / cols;
  const rh = sz / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const litSeed = ((r * 17 + c * 31) % 11) / 11;
      if (litSeed > 0.62) {
        fctx.fillStyle = litSeed > 0.85 ? '#fef08a' : '#bae6fd';
      } else {
        fctx.fillStyle = litSeed > 0.3 ? '#334155' : '#0f172a';
      }
      fctx.fillRect(c * cw + cw * 0.14, r * rh + rh * 0.18, cw * 0.72, rh * 0.64);
    }
    // Floor slab divider
    fctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    fctx.fillRect(0, r * rh, sz, Math.max(1, rh * 0.12));
  }
  const buildingFacadeMap = configureTex(facCanvas, true, aniso, 2, 4);

  // 10. Urban Concrete Sidewalk / Plaza Paving Texture
  const pzCanvas = document.createElement('canvas');
  pzCanvas.width = sz;
  pzCanvas.height = sz;
  const pctx = pzCanvas.getContext('2d')!;
  pctx.fillStyle = '#94a3b8';
  pctx.fillRect(0, 0, sz, sz);
  const tiles = 4;
  const ts = sz / tiles;
  for (let r = 0; r < tiles; r++) {
    for (let c = 0; c < tiles; c++) {
      const shade = 138 + ((r * 7 + c * 13) % 18);
      pctx.fillStyle = `rgb(${shade}, ${shade + 4}, ${shade + 9})`;
      pctx.fillRect(c * ts + 2, r * ts + 2, ts - 4, ts - 4);
    }
  }
  pctx.strokeStyle = '#64748b';
  pctx.lineWidth = 2;
  for (let k = 0; k <= tiles; k++) {
    pctx.beginPath();
    pctx.moveTo(k * ts, 0);
    pctx.lineTo(k * ts, sz);
    pctx.stroke();
    pctx.beginPath();
    pctx.moveTo(0, k * ts);
    pctx.lineTo(sz, k * ts);
    pctx.stroke();
  }
  const plazaMap = configureTex(pzCanvas, true, aniso, 16, 16);

  return {
    asphaltMap,
    asphaltBump,
    dirtMap,
    grassMap,
    bridgeDeckMap,
    waterNormal,
    roofTileMap,
    contactShadowMap,
    buildingFacadeMap,
    plazaMap,
    dispose: () => {
      asphaltMap.dispose();
      asphaltBump.dispose();
      dirtMap.dispose();
      grassMap.dispose();
      bridgeDeckMap.dispose();
      waterNormal.dispose();
      roofTileMap.dispose();
      contactShadowMap.dispose();
      buildingFacadeMap.dispose();
      plazaMap.dispose();
    },
  };
}
