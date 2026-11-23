import * as THREE from 'three';
import { AnimalSpecies, ObstacleSpec, StuntRampSpec, VehicleSpec } from './types';
import { MAIN_BRIDGE_Y, NORTH_BRIDGE_Y, SOUTH_BRIDGE_Y, StaticWorldProp } from './worldMath';

export interface VehicleRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  wheels: THREE.Object3D[];
  frontSteerPivots: THREE.Object3D[];
  brakeLightMat: THREE.MeshStandardMaterial;
  headlightMat: THREE.MeshStandardMaterial;
  emergencyRedMat?: THREE.MeshStandardMaterial;
  emergencyBlueMat?: THREE.MeshStandardMaterial;
  steeringWheel?: THREE.Object3D;
  exteriorCabinParts: THREE.Object3D[];
  bodyMaterials: THREE.MeshStandardMaterial[];
}

export function createVehicleMesh(
  spec: VehicleSpec,
  contactShadowMap: THREE.Texture,
  isSoftwareGl: boolean,
): VehicleRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const L = spec.length;
  const W = spec.width;
  const H = spec.height;
  const wr = spec.wheelRadius;
  const groundClearance = wr * 0.65;

  // Contact Shadow disc directly on ground
  const shadowMat = new THREE.MeshBasicMaterial({
    map: contactShadowMap,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const shadowDisc = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.45, L * 1.25), shadowMat);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.025;
  root.add(shadowDisc);

  // Materials with varied roughness/metalness
  const paintMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(spec.color),
    roughness: 0.24,
    metalness: 0.55,
    clearcoat: isSoftwareGl ? 0.3 : 0.9,
    clearcoatRoughness: 0.14,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(spec.accentColor),
    roughness: 0.62,
    metalness: 0.2,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.8,
    metalness: 0.15,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.18,
    metalness: 0.88,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x162432,
    roughness: 0.08,
    metalness: 0.25,
    transparent: true,
    opacity: 0.68,
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x171717,
    roughness: 0.92,
    metalness: 0.04,
  });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xfef9c3,
    emissive: 0xfef08a,
    emissiveIntensity: 0.35,
    roughness: 0.15,
    metalness: 0.1,
  });
  const brakeLightMat = new THREE.MeshStandardMaterial({
    color: 0x991b1b,
    emissive: 0xef4444,
    emissiveIntensity: 0.35,
    roughness: 0.2,
    metalness: 0.1,
  });

  // Lower chassis / underbody frame
  const underbody = new THREE.Mesh(
    new THREE.BoxGeometry(W * 0.88, groundClearance * 0.65, L * 0.92),
    trimMat,
  );
  underbody.position.y = groundClearance + 0.05;
  underbody.castShadow = true;
  bodyGroup.add(underbody);

  // Body silhouettes by vehicle category
  const bodyBaseY = groundClearance + 0.12;
  const exteriorCabinParts: THREE.Object3D[] = [];
  let cabinY = bodyBaseY + 0.45;
  let cabinZ = -0.15;

  if (spec.bodyStyle === 'supercar') {
    const isLambo = spec.id === 'lamborghini_aventador';
    const halfL = L * 0.49;
    const baseY = bodyBaseY;
    const deckH = 0.50;

    // Wedge supercar side profile in (z -> shape.x, y -> shape.y)
    const wedge = new THREE.Shape();
    wedge.moveTo(-halfL, baseY + 0.04);
    wedge.lineTo(halfL - 0.1, baseY + 0.02); // low front splitter
    wedge.lineTo(halfL, baseY + 0.22); // sharp nose
    wedge.lineTo(halfL * 0.42, baseY + 0.44); // sloping hood
    wedge.lineTo(halfL * 0.1, baseY + deckH + 0.36); // raked windshield
    wedge.lineTo(-halfL * 0.36, baseY + deckH + 0.36); // roof apex
    wedge.lineTo(-halfL * 0.88, baseY + 0.52); // fastback engine deck
    wedge.lineTo(-halfL, baseY + 0.44);
    wedge.lineTo(-halfL, baseY + 0.08);
    wedge.closePath();

    const hullGeo = new THREE.ExtrudeGeometry(wedge, {
      depth: W * 0.94,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 2,
    });
    hullGeo.translate(0, 0, -(W * 0.47));
    hullGeo.rotateY(-Math.PI / 2);

    const hullMesh = new THREE.Mesh(hullGeo, paintMat);
    hullMesh.castShadow = true;
    hullMesh.receiveShadow = true;
    bodyGroup.add(hullMesh);

    // Sleek dark glass canopy
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(W * 0.74, 0.32, L * 0.38), glassMat);
    canopy.position.set(0, baseY + deckH + 0.22, 0.08);
    canopy.castShadow = true;
    bodyGroup.add(canopy);
    exteriorCabinParts.push(canopy);

    // Front carbon splitter & side intake scoops
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(W * 0.98, 0.06, 0.36), trimMat);
    splitter.position.set(0, baseY + 0.04, halfL - 0.08);
    bodyGroup.add(splitter);

    for (const sx of [-1, 1]) {
      const intake = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, L * 0.28), trimMat);
      intake.position.set(sx * (W * 0.49), baseY + 0.3, -L * 0.14);
      bodyGroup.add(intake);

      // Quad chrome exhaust pipes
      const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.18, 8), chromeMat);
      exhaust.rotation.x = Math.PI / 2;
      exhaust.position.set(sx * 0.28, baseY + 0.18, -halfL - 0.02);
      bodyGroup.add(exhaust);
    }

    // Rear aerodynamic spoiler (Lambo wide GT wing vs Ferrari sculpted lip spoiler)
    if (isLambo) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(W * 0.96, 0.06, 0.32), accentMat);
      wing.position.set(0, baseY + deckH + 0.28, -halfL + 0.14);
      for (const sx of [-1, 1]) {
        const strut = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.26, 0.14), trimMat);
        strut.position.set(sx * W * 0.3, baseY + deckH + 0.14, -halfL + 0.14);
        bodyGroup.add(strut);
      }
      bodyGroup.add(wing);
    } else {
      const ducktail = new THREE.Mesh(new THREE.BoxGeometry(W * 0.88, 0.09, 0.24), paintMat);
      ducktail.position.set(0, baseY + 0.56, -halfL + 0.12);
      ducktail.rotation.x = -0.22;
      bodyGroup.add(ducktail);
    }

    cabinY = baseY + deckH + 0.16;
    cabinZ = 0.24;
  } else if (spec.bodyStyle === 'coupe') {
    const hullH = 0.56;
    const lowerHull = new THREE.Mesh(new THREE.BoxGeometry(W * 0.96, hullH, L * 0.95), paintMat);
    lowerHull.position.y = bodyBaseY + hullH * 0.5;
    lowerHull.castShadow = true;
    lowerHull.receiveShadow = true;
    bodyGroup.add(lowerHull);

    const cabH = H - hullH - groundClearance;
    const cabGeo = new THREE.BoxGeometry(W * 0.78, Math.max(0.36, cabH), L * 0.46);
    const cabin = new THREE.Mesh(cabGeo, glassMat);
    cabin.position.set(0, bodyBaseY + hullH + cabH * 0.42, -0.12);
    cabin.castShadow = true;
    bodyGroup.add(cabin);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(W * 0.72, 0.09, L * 0.34), paintMat);
    roof.position.set(0, bodyBaseY + hullH + cabH * 0.84, -0.15);
    bodyGroup.add(roof);
    exteriorCabinParts.push(cabin, roof);

    const wing = new THREE.Mesh(new THREE.BoxGeometry(W * 0.88, 0.06, 0.28), accentMat);
    wing.position.set(0, bodyBaseY + hullH + 0.22, -L * 0.44);
    const strutL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.12), trimMat);
    strutL.position.set(-W * 0.28, bodyBaseY + hullH + 0.11, -L * 0.44);
    const strutR = strutL.clone();
    strutR.position.x = W * 0.28;
    bodyGroup.add(wing, strutL, strutR);
    cabinY = bodyBaseY + hullH + 0.18;
    cabinZ = 0.25;
  } else if (spec.bodyStyle === 'boxtruck' || spec.bodyStyle === 'ambulance') {
    // Cab + Rear Cargo/Medical Box
    const cabH = H * 0.72;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(W * 0.9, cabH, L * 0.34), paintMat);
    cab.position.set(0, bodyBaseY + cabH * 0.5, L * 0.31);
    cab.castShadow = true;
    bodyGroup.add(cab);

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(W * 0.84, cabH * 0.38, 0.1), glassMat);
    windshield.position.set(0, bodyBaseY + cabH * 0.68, L * 0.48);
    bodyGroup.add(windshield);

    const boxH = H * 0.82;
    const box = new THREE.Mesh(new THREE.BoxGeometry(W * 0.98, boxH, L * 0.62), paintMat);
    box.position.set(0, bodyBaseY + boxH * 0.5, -L * 0.18);
    box.castShadow = true;
    box.receiveShadow = true;
    bodyGroup.add(box);

    // Accent stripe
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(W * 0.99, 0.22, L * 0.63), accentMat);
    stripe.position.set(0, bodyBaseY + boxH * 0.45, -L * 0.18);
    bodyGroup.add(stripe);

    cabinY = bodyBaseY + cabH * 0.56;
    cabinZ = L * 0.34;
  } else if (spec.bodyStyle === 'pickup' || spec.bodyStyle === 'flatbed' || spec.bodyStyle === 'semi') {
    const hoodH = spec.bodyStyle === 'semi' ? 1.15 : 0.66;
    const hood = new THREE.Mesh(new THREE.BoxGeometry(W * 0.92, hoodH, L * 0.35), paintMat);
    hood.position.set(0, bodyBaseY + hoodH * 0.5, L * 0.31);
    hood.castShadow = true;
    bodyGroup.add(hood);

    const cabH = H - groundClearance - 0.15;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(W * 0.88, cabH * 0.6, L * 0.28), paintMat);
    cab.position.set(0, bodyBaseY + hoodH + cabH * 0.24, L * 0.08);
    cab.castShadow = true;
    bodyGroup.add(cab);

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(W * 0.82, cabH * 0.32, 0.08), glassMat);
    windshield.position.set(0, bodyBaseY + hoodH + cabH * 0.28, L * 0.22);
    bodyGroup.add(windshield);

    // Cargo bed or flatbed deck
    const bedH = spec.bodyStyle === 'pickup' ? 0.58 : 0.24;
    const bed = new THREE.Mesh(new THREE.BoxGeometry(W * 0.95, bedH, L * 0.44), accentMat);
    bed.position.set(0, bodyBaseY + bedH * 0.5 + 0.1, -L * 0.26);
    bed.castShadow = true;
    bodyGroup.add(bed);

    if (spec.bodyStyle === 'flatbed') {
      // Timber logs strapped to flatbed
      const logMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.88 });
      for (let k = -1; k <= 1; k++) {
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, L * 0.38, 10), logMat);
        log.rotation.x = Math.PI / 2;
        log.position.set(k * 0.48, bodyBaseY + bedH + 0.28, -L * 0.26);
        bodyGroup.add(log);
      }
    } else if (spec.bodyStyle === 'semi') {
      // Twin vertical chrome exhaust stacks
      for (const sx of [-1, 1]) {
        const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, H * 0.9, 10), chromeMat);
        stack.position.set(sx * (W * 0.42), bodyBaseY + H * 0.5, -L * 0.06);
        bodyGroup.add(stack);
      }
    }
    cabinY = bodyBaseY + hoodH + cabH * 0.12;
    cabinZ = L * 0.12;
  } else if (spec.bodyStyle === 'bus') {
    const busH = H - groundClearance - 0.12;
    const body = new THREE.Mesh(new THREE.BoxGeometry(W * 0.96, busH, L * 0.96), paintMat);
    body.position.set(0, bodyBaseY + busH * 0.5, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    bodyGroup.add(body);

    const winBand = new THREE.Mesh(new THREE.BoxGeometry(W * 0.97, busH * 0.34, L * 0.92), glassMat);
    winBand.position.set(0, bodyBaseY + busH * 0.68, 0);
    bodyGroup.add(winBand);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(W * 0.98, 0.18, L * 0.965), accentMat);
    stripe.position.set(0, bodyBaseY + busH * 0.36, 0);
    bodyGroup.add(stripe);

    cabinY = bodyBaseY + busH * 0.56;
    cabinZ = L * 0.4;
  } else if (spec.bodyStyle === 'buggy') {
    // Open tubular trail buggy
    const tub = new THREE.Mesh(new THREE.BoxGeometry(W * 0.72, 0.44, L * 0.84), paintMat);
    tub.position.set(0, bodyBaseY + 0.26, 0);
    tub.castShadow = true;
    bodyGroup.add(tub);

    const cageMat = accentMat;
    const barL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, L * 0.55, 8), cageMat);
    barL.rotation.x = Math.PI / 2;
    barL.position.set(-W * 0.32, bodyBaseY + 0.92, -0.1);
    const barR = barL.clone();
    barR.position.x = W * 0.32;
    const roofPlate = new THREE.Mesh(new THREE.BoxGeometry(W * 0.68, 0.06, L * 0.42), accentMat);
    roofPlate.position.set(0, bodyBaseY + 0.96, -0.1);
    bodyGroup.add(barL, barR, roofPlate);
    cabinY = bodyBaseY + 0.62;
    cabinZ = 0.2;
  } else {
    // Sedan, SUV, Police
    const hullH = spec.bodyStyle === 'suv' ? 0.72 : 0.58;
    const hull = new THREE.Mesh(new THREE.BoxGeometry(W * 0.95, hullH, L * 0.95), paintMat);
    hull.position.y = bodyBaseY + hullH * 0.5;
    hull.castShadow = true;
    hull.receiveShadow = true;
    bodyGroup.add(hull);

    // Police white doors contrast
    if (spec.bodyStyle === 'police') {
      const doorBand = new THREE.Mesh(new THREE.BoxGeometry(W * 0.965, hullH * 0.82, L * 0.38), accentMat);
      doorBand.position.set(0, bodyBaseY + hullH * 0.5, -0.05);
      bodyGroup.add(doorBand);
    }

    const cabH = Math.max(0.42, H - hullH - groundClearance - 0.06);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(W * 0.82, cabH, L * 0.5), glassMat);
    cabin.position.set(0, bodyBaseY + hullH + cabH * 0.45, -0.16);
    cabin.castShadow = true;
    bodyGroup.add(cabin);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(W * 0.78, 0.09, L * 0.4), spec.bodyStyle === 'police' ? accentMat : paintMat);
    roof.position.set(0, bodyBaseY + hullH + cabH * 0.9, -0.18);
    bodyGroup.add(roof);
    exteriorCabinParts.push(cabin, roof);

    cabinY = bodyBaseY + hullH + 0.2;
    cabinZ = 0.22;
  }

  // Emergency lightbar (Police & Ambulance)
  let emergencyRedMat: THREE.MeshStandardMaterial | undefined;
  let emergencyBlueMat: THREE.MeshStandardMaterial | undefined;
  if (spec.isEmergency) {
    emergencyRedMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 1.4,
      roughness: 0.2,
    });
    emergencyBlueMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      emissive: 0x3b82f6,
      emissiveIntensity: 1.4,
      roughness: 0.2,
    });
    const barBase = new THREE.Mesh(new THREE.BoxGeometry(W * 0.62, 0.08, 0.24), trimMat);
    barBase.position.set(0, H + 0.04, spec.bodyStyle === 'ambulance' ? L * 0.28 : -0.15);
    const redPod = new THREE.Mesh(new THREE.BoxGeometry(W * 0.26, 0.11, 0.22), emergencyRedMat);
    redPod.position.set(-W * 0.16, H + 0.09, barBase.position.z);
    const bluePod = new THREE.Mesh(new THREE.BoxGeometry(W * 0.26, 0.11, 0.22), emergencyBlueMat);
    bluePod.position.set(W * 0.16, H + 0.09, barBase.position.z);
    bodyGroup.add(barBase, redPod, bluePod);
  }

  // Front Bumper, Radiator Grille, Side Mirrors, Headlights & Taillights
  const frontZ = L * 0.48;
  const backZ = -L * 0.48;
  const lightY = bodyBaseY + 0.34;

  const grille = new THREE.Mesh(new THREE.BoxGeometry(W * 0.46, 0.22, 0.08), chromeMat);
  grille.position.set(0, lightY - 0.04, frontZ);
  bodyGroup.add(grille);

  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(W * 0.96, 0.16, 0.16), trimMat);
  frontBumper.position.set(0, bodyBaseY + 0.08, frontZ - 0.02);
  const rearBumper = frontBumper.clone();
  rearBumper.position.z = backZ + 0.02;
  bodyGroup.add(frontBumper, rearBumper);

  for (const sx of [-1, 1]) {
    // Headlights
    const hl = new THREE.Mesh(new THREE.BoxGeometry(W * 0.18, 0.12, 0.08), headlightMat);
    hl.position.set(sx * W * 0.34, lightY, frontZ);
    bodyGroup.add(hl);

    // Taillights
    const tl = new THREE.Mesh(new THREE.BoxGeometry(W * 0.2, 0.12, 0.08), brakeLightMat);
    tl.position.set(sx * W * 0.34, lightY + 0.04, backZ);
    bodyGroup.add(tl);

    // Side Mirrors
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.12), accentMat);
    mirror.position.set(sx * (W * 0.49), bodyBaseY + 0.62, L * 0.14);
    bodyGroup.add(mirror);
  }

  // Cockpit interior dashboard cowling + steering wheel (visible in first-person cockpit cam)
  const dashMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.75 });
  const dash = new THREE.Mesh(new THREE.BoxGeometry(W * 0.78, 0.24, 0.42), dashMat);
  dash.position.set(0, bodyBaseY + 0.62, cabinZ + 0.34);
  bodyGroup.add(dash);

  const steeringGroup = new THREE.Group();
  steeringGroup.position.set(-W * 0.2, bodyBaseY + 0.74, cabinZ + 0.16);
  const wheelRing = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.026, 8, 18), trimMat);
  const wheelHub = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 10), chromeMat);
  wheelHub.rotation.x = Math.PI / 2;
  const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.03, 0.02), chromeMat);
  steeringGroup.add(wheelRing, wheelHub, spoke);
  steeringGroup.rotation.x = -0.35;
  bodyGroup.add(steeringGroup);

  // 4 Articulated Wheels (Rubber Tire + Alloy Rim + Hub)
  const wheels: THREE.Object3D[] = [];
  const frontSteerPivots: THREE.Object3D[] = [];
  const tireW = wr * 0.62;
  const tireGeo = new THREE.CylinderGeometry(wr, wr, tireW, 18);
  tireGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(wr * 0.6, wr * 0.6, tireW + 0.02, 12);
  rimGeo.rotateZ(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(wr * 0.22, wr * 0.22, tireW + 0.04, 8);
  hubGeo.rotateZ(Math.PI / 2);

  const halfTrack = spec.trackWidth * 0.5;
  const halfWheelBase = spec.wheelBase * 0.5;

  const wheelPositions: Array<[number, number, boolean]> = [
    [-halfTrack, halfWheelBase, true],
    [halfTrack, halfWheelBase, true],
    [-halfTrack, -halfWheelBase, false],
    [halfTrack, -halfWheelBase, false],
  ];

  for (const [wx, wz, isFront] of wheelPositions) {
    const steerPivot = new THREE.Group();
    steerPivot.position.set(wx, wr, wz);

    const spinGroup = new THREE.Group();
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.castShadow = true;
    const rim = new THREE.Mesh(rimGeo, chromeMat);
    const hub = new THREE.Mesh(hubGeo, accentMat);
    spinGroup.add(tire, rim, hub);

    steerPivot.add(spinGroup);
    root.add(steerPivot);
    wheels.push(spinGroup);
    if (isFront) {
      frontSteerPivots.push(steerPivot);
    }
  }

  return {
    root,
    bodyGroup,
    wheels,
    frontSteerPivots,
    brakeLightMat,
    headlightMat,
    emergencyRedMat,
    emergencyBlueMat,
    steeringWheel: steeringGroup,
    exteriorCabinParts,
    bodyMaterials: [paintMat],
  };
}

export function createMainSuspensionBridge(deckTexture: THREE.Texture): THREE.Group {
  const group = new THREE.Group();

  const steelMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.45, metalness: 0.45, envMapIntensity: 0.35 });
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.88, metalness: 0.05, envMapIntensity: 0.2 });
  const deckMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: deckTexture,
    roughness: 0.86,
    metalness: 0.04,
    envMapIntensity: 0.2,
  });
  const cableMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.32, metalness: 0.75, envMapIntensity: 0.5 });

  // Main horizontal bridge span (x = -42..42)
  const spanLen = 86;
  const deckGeo = new THREE.BoxGeometry(spanLen, 0.7, 11.4);
  const deck = new THREE.Mesh(deckGeo, deckMat);
  deck.position.set(0, MAIN_BRIDGE_Y - 0.12, 0);
  deck.receiveShadow = true;
  deck.castShadow = true;
  group.add(deck);

  // Approach ramps (left & right) flush from x = +-42 down to x = +-75
  const rampLen = 34;
  for (const side of [-1, 1]) {
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(rampLen, 0.8, 11.4), deckMat);
    ramp.position.set(side * (42 + rampLen * 0.48), MAIN_BRIDGE_Y * 0.5 + 0.12, 0);
    ramp.rotation.z = side * -0.078;
    ramp.receiveShadow = true;
    group.add(ramp);

    // Solid concrete abutment embankment under ramp so no underside gap is ever visible
    const embankment = new THREE.Mesh(new THREE.BoxGeometry(rampLen * 0.9, 3.2, 11.0), concreteMat);
    embankment.position.set(side * (42 + rampLen * 0.45), MAIN_BRIDGE_Y * 0.5 - 1.5, 0);
    embankment.rotation.z = side * -0.078;
    group.add(embankment);

    // Side guardrails on ramps
    for (const sz of [-5.4, 5.4]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(rampLen, 0.85, 0.25), steelMat);
      rail.position.set(ramp.position.x, ramp.position.y + 0.65, sz);
      rail.rotation.z = ramp.rotation.z;
      group.add(rail);
    }
  }

  // Guardrails along main span
  for (const sz of [-5.4, 5.4]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(spanLen, 0.95, 0.28), steelMat);
    rail.position.set(0, MAIN_BRIDGE_Y + 0.58, sz);
    rail.castShadow = true;
    group.add(rail);
  }

  // Concrete piers anchored into riverbed
  for (const px of [-36, -12, 12, 36]) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(2.8, 7.6, 10.6), concreteMat);
    pier.position.set(px, MAIN_BRIDGE_Y - 4.1, 0);
    pier.castShadow = true;
    pier.receiveShadow = true;
    group.add(pier);
  }

  // Twin Suspension Pylons & Cables
  for (const tx of [-24, 24]) {
    for (const tz of [-5.5, 5.5]) {
      const pylon = new THREE.Mesh(new THREE.BoxGeometry(1.4, 15.5, 1.4), steelMat);
      pylon.position.set(tx, MAIN_BRIDGE_Y + 6.8, tz);
      pylon.castShadow = true;
      group.add(pylon);
    }
    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 11.6), steelMat);
    crossBeam.position.set(tx, MAIN_BRIDGE_Y + 13.6, 0);
    group.add(crossBeam);

    // Bridge Streetlight posts
    const lampHead = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.25, 0.6),
      new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfde047, emissiveIntensity: 0.9 }),
    );
    lampHead.position.set(tx, MAIN_BRIDGE_Y + 5.5, 4.8);
    group.add(lampHead);
  }

  // Suspension catenary cables
  for (const tz of [-5.5, 5.5]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-42, MAIN_BRIDGE_Y + 1.0, tz),
      new THREE.Vector3(-24, MAIN_BRIDGE_Y + 14.0, tz),
      new THREE.Vector3(0, MAIN_BRIDGE_Y + 4.8, tz),
      new THREE.Vector3(24, MAIN_BRIDGE_Y + 14.0, tz),
      new THREE.Vector3(42, MAIN_BRIDGE_Y + 1.0, tz),
    ]);
    const cable = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.16, 6, false), cableMat);
    group.add(cable);

    // Vertical suspender rods
    for (let sx = -36; sx <= 36; sx += 6) {
      const archFactor = Math.abs(sx) <= 24 ? (sx * sx) / (24 * 24) : 1 - (Math.abs(sx) - 24) / 18;
      const topY = MAIN_BRIDGE_Y + (Math.abs(sx) <= 24 ? 4.8 + archFactor * 9.2 : 1.0 + archFactor * 13.0);
      const rodH = Math.max(0.5, topY - MAIN_BRIDGE_Y);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, rodH, 5), cableMat);
      rod.position.set(sx, MAIN_BRIDGE_Y + rodH * 0.5, tz);
      group.add(rod);
    }
  }

  return group;
}

export function createNorthBridge(deckTexture: THREE.Texture): THREE.Group {
  const group = new THREE.Group();
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.6 });
  const timberMat = new THREE.MeshStandardMaterial({ color: 0x78502b, roughness: 0.85, metalness: 0.05 });
  const deckMat = new THREE.MeshStandardMaterial({
    color: 0xd6d3d1,
    map: deckTexture,
    roughness: 0.85,
  });

  const spanLen = 78;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(spanLen, 0.6, 9.2), deckMat);
  deck.position.set(0, NORTH_BRIDGE_Y - 0.15, -115);
  deck.receiveShadow = true;
  deck.castShadow = true;
  group.add(deck);

  for (const side of [-1, 1]) {
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(27, 0.6, 9.2), deckMat);
    ramp.position.set(side * (38 + 13), NORTH_BRIDGE_Y * 0.5 + 0.15, -115);
    ramp.rotation.z = side * -0.075;
    ramp.receiveShadow = true;
    group.add(ramp);
  }

  // Steel truss side girders
  for (const sz of [-119.3, -110.7]) {
    const topChord = new THREE.Mesh(new THREE.BoxGeometry(spanLen, 0.38, 0.38), steelMat);
    topChord.position.set(0, NORTH_BRIDGE_Y + 2.8, sz);
    group.add(topChord);
    for (let x = -36; x <= 36; x += 6) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.32, 3.0, 0.32), timberMat);
      post.position.set(x, NORTH_BRIDGE_Y + 1.35, sz);
      group.add(post);
    }
  }

  // Piers
  for (const px of [-28, 0, 28]) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(2.4, 7.2, 8.6), steelMat);
    pier.position.set(px, NORTH_BRIDGE_Y - 3.9, -115);
    group.add(pier);
  }

  return group;
}

export function createSouthBridge(deckTexture: THREE.Texture): THREE.Group {
  const group = new THREE.Group();
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.42, metalness: 0.55 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, emissive: 0x0369a1, emissiveIntensity: 0.35, roughness: 0.35 });
  const deckMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: deckTexture,
    roughness: 0.85,
  });

  const spanLen = 78;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(spanLen, 0.65, 10.2), deckMat);
  deck.position.set(0, SOUTH_BRIDGE_Y - 0.14, 86);
  deck.receiveShadow = true;
  deck.castShadow = true;
  group.add(deck);

  for (const side of [-1, 1]) {
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(27, 0.65, 10.2), deckMat);
    ramp.position.set(side * (38 + 13), SOUTH_BRIDGE_Y * 0.5 + 0.14, 86);
    ramp.rotation.z = side * -0.072;
    ramp.receiveShadow = true;
    group.add(ramp);
  }

  // Modern arch girders & neon blue trim along South Metro Bridge
  for (const sz of [81.2, 90.8]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(spanLen, 0.85, 0.32), steelMat);
    rail.position.set(0, SOUTH_BRIDGE_Y + 0.5, sz);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(spanLen, 0.2, 0.36), accentMat);
    strip.position.set(0, SOUTH_BRIDGE_Y + 0.85, sz);
    group.add(rail, strip);
  }

  for (const px of [-28, 0, 28]) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(2.5, 7.0, 9.4), steelMat);
    pier.position.set(px, SOUTH_BRIDGE_Y - 3.8, 86);
    group.add(pier);
  }

  return group;
}

export function createVillageHouse(roofTex: THREE.Texture, wallColor: number, isNightLit: { value: boolean }): THREE.Group {
  const g = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });
  const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.78 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: roofTex, roughness: 0.7 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.85 });
  const winMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    emissive: 0xfde68a,
    emissiveIntensity: isNightLit.value ? 0.9 : 0.15,
    roughness: 0.2,
  });

  // Foundation plinth
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.45, 5.6), stoneMat);
  plinth.position.y = 0.22;
  plinth.receiveShadow = true;
  g.add(plinth);

  // Main cottage body
  const walls = new THREE.Mesh(new THREE.BoxGeometry(6.4, 3.4, 5.2), wallMat);
  walls.position.y = 2.1;
  walls.castShadow = true;
  walls.receiveShadow = true;
  g.add(walls);

  // Pitched roof (4-sided pyramid/cone rotated)
  const roof = new THREE.Mesh(new THREE.ConeGeometry(5.1, 2.5, 4), roofMat);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 5.05;
  roof.castShadow = true;
  g.add(roof);

  // Chimney
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.6, 0.7), stoneMat);
  chimney.position.set(1.8, 5.2, -1.0);
  g.add(chimney);

  // Front door + porch overhang
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.1, 0.14), woodMat);
  door.position.set(0, 1.45, 2.62);
  g.add(door);

  // Windows
  for (const wx of [-1.8, 1.8]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 0.14), winMat);
    win.position.set(wx, 2.2, 2.62);
    g.add(win);
  }

  return g;
}

export function createFuelStation(): THREE.Group {
  const g = new THREE.Group();
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.4, metalness: 0.3 });
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35, metalness: 0.5 });
  const pumpMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 });
  const signMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xfacc15,
    emissiveIntensity: 0.6,
    roughness: 0.25,
  });

  // Concrete pad
  const pad = new THREE.Mesh(new THREE.BoxGeometry(11, 0.25, 8), new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 }));
  pad.position.y = 0.12;
  pad.receiveShadow = true;
  g.add(pad);

  // Overhead Canopy
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.6, 7.2), canopyMat);
  canopy.position.y = 4.6;
  canopy.castShadow = true;
  g.add(canopy);

  const trim = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.16, 7.3), signMat);
  trim.position.y = 4.35;
  g.add(trim);

  // Pillars & Fuel Pumps
  for (const px of [-3.4, 3.4]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.45, 4.4, 0.45), pillarMat);
    pillar.position.set(px, 2.2, 0);
    pillar.castShadow = true;
    g.add(pillar);

    const pump = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.6, 0.55), pumpMat);
    pump.position.set(px * 0.55, 0.95, 0);
    g.add(pump);
  }

  return g;
}

export interface WildlifeRig {
  root: THREE.Group;
  wingL?: THREE.Object3D;
  wingR?: THREE.Object3D;
  legs?: THREE.Object3D[];
}

export function createWildlifeMesh(species: AnimalSpecies): WildlifeRig {
  const root = new THREE.Group();

  if (species === 'bird_flying' || species === 'bird_perched') {
    const bodyColor = species === 'bird_flying' ? 0x5c4033 : 0x38bdf8;
    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.7 });
    const wingMat = new THREE.MeshStandardMaterial({ color: species === 'bird_flying' ? 0x3e2723 : 0x0284c7, roughness: 0.75 });
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 });
    const s = species === 'bird_flying' ? 1.2 : 0.75;

    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.24 * s, 8, 8), bodyMat);
    torso.scale.set(0.8, 0.75, 1.5);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15 * s, 8, 8), bodyMat);
    head.position.set(0, 0.12 * s, 0.34 * s);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.05 * s, 0.16 * s, 6), beakMat);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.1 * s, 0.52 * s);

    const wingL = new THREE.Group();
    const wMeshL = new THREE.Mesh(new THREE.BoxGeometry(0.65 * s, 0.04 * s, 0.28 * s), wingMat);
    wMeshL.position.x = -0.34 * s;
    wingL.add(wMeshL);

    const wingR = new THREE.Group();
    const wMeshR = new THREE.Mesh(new THREE.BoxGeometry(0.65 * s, 0.04 * s, 0.28 * s), wingMat);
    wMeshR.position.x = 0.34 * s;
    wingR.add(wMeshR);

    root.add(torso, head, beak, wingL, wingR);
    return { root, wingL, wingR };
  }

  if (species === 'butterfly') {
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xea580c,
      emissiveIntensity: 0.25,
      roughness: 0.5,
      side: THREE.DoubleSide,
    });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.25, 6), new THREE.MeshStandardMaterial({ color: 0x18181b }));
    body.rotation.x = Math.PI / 2;
    const wingL = new THREE.Group();
    const wl = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.22), wingMat);
    wl.rotation.x = -Math.PI / 2;
    wl.position.x = -0.14;
    wingL.add(wl);
    const wingR = new THREE.Group();
    const wr = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.22), wingMat);
    wr.rotation.x = -Math.PI / 2;
    wr.position.x = 0.14;
    wingR.add(wr);
    root.add(body, wingL, wingR);
    return { root, wingL, wingR };
  }

  // Quadrupeds: deer, cow, goat, rabbit, monkey, dog, cat
  const palette: Record<string, { body: number; accent: number; scale: number; neckH: number }> = {
    deer: { body: 0xa1622e, accent: 0xfef3c7, scale: 1.05, neckH: 0.65 },
    cow: { body: 0xf8fafc, accent: 0x1e293b, scale: 1.32, neckH: 0.25 },
    goat: { body: 0xd6d3d1, accent: 0x57534e, scale: 0.85, neckH: 0.38 },
    rabbit: { body: 0xd4c4b5, accent: 0xffffff, scale: 0.42, neckH: 0.08 },
    monkey: { body: 0x78492a, accent: 0xd6b08c, scale: 0.65, neckH: 0.18 },
    dog: { body: 0xc2853e, accent: 0x3b2412, scale: 0.68, neckH: 0.26 },
    cat: { body: 0xf59e0b, accent: 0xfef3c7, scale: 0.48, neckH: 0.18 },
  };
  const cfg = palette[species] ?? palette.deer;
  const s = cfg.scale;
  const bodyMat = new THREE.MeshStandardMaterial({ color: cfg.body, roughness: 0.85 });
  const accentMat = new THREE.MeshStandardMaterial({ color: cfg.accent, roughness: 0.78 });

  const legH = 0.58 * s;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.54 * s, 0.5 * s, 1.05 * s), bodyMat);
  torso.position.y = legH + 0.22 * s;
  torso.castShadow = true;
  root.add(torso);

  // Cow spots
  if (species === 'cow') {
    const spot = new THREE.Mesh(new THREE.BoxGeometry(0.56 * s, 0.3 * s, 0.45 * s), accentMat);
    spot.position.set(0, torso.position.y + 0.04, 0.1);
    root.add(spot);
  }

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.34 * s, 0.32 * s, 0.4 * s), bodyMat);
  head.position.set(0, torso.position.y + cfg.neckH * s + 0.12 * s, 0.62 * s);
  head.castShadow = true;
  root.add(head);

  // Species-specific accents (antlers, horns, ears, tail)
  if (species === 'deer' || species === 'goat') {
    for (const sx of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.025 * s, 0.04 * s, 0.42 * s, 6), accentMat);
      horn.position.set(sx * 0.12 * s, head.position.y + 0.32 * s, head.position.z - 0.05 * s);
      horn.rotation.z = sx * -0.3;
      root.add(horn);
    }
  } else if (species === 'rabbit') {
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.08 * s, 0.42 * s, 0.08 * s), accentMat);
      ear.position.set(sx * 0.09 * s, head.position.y + 0.32 * s, head.position.z);
      root.add(ear);
    }
  } else {
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * s, 0.04 * s, 0.55 * s, 6), accentMat);
    tail.rotation.x = -0.8;
    tail.position.set(0, torso.position.y + 0.15 * s, -0.65 * s);
    root.add(tail);
  }

  const legs: THREE.Object3D[] = [];
  const legGeo = new THREE.BoxGeometry(0.14 * s, legH, 0.14 * s);
  for (const [lx, lz] of [
    [-0.18 * s, 0.36 * s],
    [0.18 * s, 0.36 * s],
    [-0.18 * s, -0.36 * s],
    [0.18 * s, -0.36 * s],
  ]) {
    const leg = new THREE.Mesh(legGeo, accentMat);
    leg.position.set(lx, legH * 0.5, lz);
    leg.castShadow = true;
    root.add(leg);
    legs.push(leg);
  }

  return { root, legs };
}

export function createObstacleMesh(obs: ObstacleSpec, baseY: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(obs.x, baseY, obs.z);
  g.rotation.y = obs.rotation;

  if (obs.kind === 'fallen_tree') {
    const barkMat = new THREE.MeshStandardMaterial({ color: 0x5c3d24, roughness: 0.92 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f6b36, roughness: 0.85 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.52, 5.2, 8), barkMat);
    trunk.rotation.z = Math.PI / 2;
    trunk.position.y = 0.45;
    trunk.castShadow = true;
    const branch = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.2, 7), leafMat);
    branch.rotation.z = -Math.PI / 2;
    branch.position.set(2.4, 0.65, 0.3);
    g.add(trunk, branch);
  } else if (obs.kind === 'boulder') {
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.92 });
    const main = new THREE.Mesh(new THREE.DodecahedronGeometry(obs.radius * 0.72, 1), rockMat);
    main.position.y = obs.radius * 0.42;
    main.scale.set(1.2, 0.85, 1.0);
    main.castShadow = true;
    const sub = new THREE.Mesh(new THREE.DodecahedronGeometry(obs.radius * 0.45, 0), rockMat);
    sub.position.set(obs.radius * 0.55, obs.radius * 0.25, 0.3);
    g.add(main, sub);
  } else if (obs.kind === 'barrier' || obs.kind === 'construction') {
    const orangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.45 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 });
    const plank = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.45, 0.22), orangeMat);
    plank.position.y = 0.95;
    plank.castShadow = true;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.47, 0.24), whiteMat);
    stripe.position.y = 0.95;
    g.add(plank, stripe);
    for (const sx of [-1.2, 1.2]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.1, 0.55), whiteMat);
      leg.position.set(sx, 0.55, 0);
      g.add(leg);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.7, 8), orangeMat);
      cone.position.set(sx * 1.45, 0.35, 0.4);
      g.add(cone);
    }
  } else if (obs.kind === 'abandoned_car') {
    const rustMat = new THREE.MeshStandardMaterial({ color: 0x7c4a3a, roughness: 0.88, metalness: 0.25 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.65, 4.0), rustMat);
    hull.position.y = 0.5;
    hull.rotation.z = 0.06;
    hull.castShadow = true;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.5, 2.0), darkMat);
    cab.position.set(0, 1.02, -0.2);
    g.add(hull, cab);
  } else if (obs.kind === 'mud_pit') {
    const mudMat = new THREE.MeshStandardMaterial({ color: 0x4a3423, roughness: 0.38, metalness: 0.08 });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(obs.radius, 18), mudMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.04;
    g.add(disc);
  } else if (obs.kind === 'flood_zone') {
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x2563eb,
      roughness: 0.15,
      metalness: 0.3,
      transparent: true,
      opacity: 0.68,
    });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(obs.radius, 20), waterMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.06;
    g.add(disc);
  } else if (obs.kind === 'pothole') {
    const holeMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.95 });
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x52525b, roughness: 0.9 });
    const ring = new THREE.Mesh(new THREE.RingGeometry(obs.radius * 0.65, obs.radius, 14), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    const core = new THREE.Mesh(new THREE.CircleGeometry(obs.radius * 0.66, 14), holeMat);
    core.rotation.x = -Math.PI / 2;
    core.position.y = 0.035;
    g.add(ring, core);
  }

  return g;
}

export function createCityBuildingMesh(
  b: StaticWorldProp,
  facadeTex: THREE.Texture,
  isNightLit: { value: boolean },
): { group: THREE.Group; emissiveMats: THREE.MeshStandardMaterial[] } {
  const g = new THREE.Group();
  const w = (b.halfW ?? 6) * 2;
  const d = (b.halfD ?? 6) * 2;
  const totalH = b.height ?? 28;
  const emissiveMats: THREE.MeshStandardMaterial[] = [];

  const plinthMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.84,
    metalness: 0.12,
  });
  const towerMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(b.color ?? '#334155'),
    map: facadeTex,
    emissive: new THREE.Color(0xfef08a),
    emissiveMap: facadeTex,
    emissiveIntensity: isNightLit.value ? 0.85 : 0.12,
    roughness: 0.35,
    metalness: 0.45,
  });
  emissiveMats.push(towerMat);

  const accentMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(b.accent ?? '#38bdf8'),
    emissive: new THREE.Color(b.accent ?? '#38bdf8'),
    emissiveIntensity: b.style === 'neon_plaza' ? 1.15 : 0.45,
    roughness: 0.25,
    metalness: 0.4,
  });
  emissiveMats.push(accentMat);

  // Granite ground-floor lobby plinth
  const lobbyH = 3.6;
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(w, lobbyH, d), plinthMat);
  plinth.position.y = lobbyH * 0.5;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  g.add(plinth);

  // Main tower shaft
  const shaftH = b.style === 'stepped_tower' ? totalH * 0.65 : totalH - lobbyH;
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, shaftH, d * 0.94), towerMat);
  shaft.position.y = lobbyH + shaftH * 0.5;
  shaft.castShadow = true;
  shaft.receiveShadow = true;
  g.add(shaft);

  // Architectural top tier / crown / spire / helipad
  if (b.style === 'stepped_tower') {
    const upperH = totalH - lobbyH - shaftH;
    const upper = new THREE.Mesh(new THREE.BoxGeometry(w * 0.66, upperH, d * 0.66), towerMat);
    upper.position.y = lobbyH + shaftH + upperH * 0.5;
    upper.castShadow = true;
    g.add(upper);

    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.35, 7.5, 6), accentMat);
    spire.position.y = totalH + 3.5;
    g.add(spire);
  } else if (b.style === 'neon_plaza') {
    const collar = new THREE.Mesh(new THREE.BoxGeometry(w * 0.98, 0.65, d * 0.98), accentMat);
    collar.position.y = lobbyH + 0.2;
    const crown = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.85, d * 0.96), accentMat);
    crown.position.y = totalH;
    g.add(collar, crown);
  } else {
    // Rooftop mechanical penthouse + glowing edge rim
    const pent = new THREE.Mesh(new THREE.BoxGeometry(w * 0.45, 2.2, d * 0.45), plinthMat);
    pent.position.y = totalH + 1.1;
    const rim = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.45, d * 0.96), accentMat);
    rim.position.y = totalH;
    g.add(pent, rim);
  }

  return { group: g, emissiveMats };
}

export interface PersonRig {
  root: THREE.Group;
  legL: THREE.Object3D;
  legR: THREE.Object3D;
  armL: THREE.Object3D;
  armR: THREE.Object3D;
}

export function createPersonMesh(shirtColor: number, pantsColor: number): PersonRig {
  const root = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf1c27d, roughness: 0.78 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.72 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.82 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.9 });

  const legGeo = new THREE.BoxGeometry(0.18, 0.72, 0.2);
  const legL = new THREE.Group();
  legL.position.set(-0.12, 0.72, 0);
  const legLMesh = new THREE.Mesh(legGeo, pantsMat);
  legLMesh.position.y = -0.36;
  legL.add(legLMesh);

  const legR = new THREE.Group();
  legR.position.set(0.12, 0.72, 0);
  const legRMesh = new THREE.Mesh(legGeo, pantsMat);
  legRMesh.position.y = -0.36;
  legR.add(legRMesh);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.66, 0.26), shirtMat);
  torso.position.y = 1.05;
  torso.castShadow = true;

  const armGeo = new THREE.BoxGeometry(0.14, 0.56, 0.16);
  const armL = new THREE.Group();
  armL.position.set(-0.32, 1.32, 0);
  const armLMesh = new THREE.Mesh(armGeo, shirtMat);
  armLMesh.position.y = -0.25;
  armL.add(armLMesh);

  const armR = new THREE.Group();
  armR.position.set(0.32, 1.32, 0);
  const armRMesh = new THREE.Mesh(armGeo, shirtMat);
  armRMesh.position.y = -0.25;
  armR.add(armRMesh);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 10), skinMat);
  head.position.y = 1.56;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
  hair.position.y = 1.58;

  root.add(legL, legR, torso, armL, armR, head, hair);
  return { root, legL, legR, armL, armR };
}

export interface AircraftRig {
  root: THREE.Group;
  mainRotor?: THREE.Object3D;
  tailRotor?: THREE.Object3D;
}

export function createAircraftMesh(kind: 'jet' | 'helicopter'): AircraftRig {
  const root = new THREE.Group();
  const metalMat = new THREE.MeshStandardMaterial({
    color: kind === 'jet' ? 0xf8fafc : 0x0f172a,
    roughness: 0.28,
    metalness: 0.7,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: kind === 'jet' ? 0x0284c7 : 0xfacc15,
    emissive: kind === 'jet' ? 0x0284c7 : 0xca8a04,
    emissiveIntensity: 0.35,
    roughness: 0.35,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.1,
    metalness: 0.3,
    transparent: true,
    opacity: 0.78,
  });

  if (kind === 'jet') {
    const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.95, 11.5, 10), metalMat);
    fuselage.rotation.x = Math.PI / 2;
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.75, 2.8, 10), accentMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.z = 7.1;

    const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.65, 10, 8), glassMat);
    cockpit.scale.set(0.85, 0.75, 2.1);
    cockpit.position.set(0, 0.65, 3.2);

    const wing = new THREE.Mesh(new THREE.BoxGeometry(11.8, 0.18, 2.8), metalMat);
    wing.position.set(0, -0.05, 0.2);

    const tailWing = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.14, 1.4), accentMat);
    tailWing.position.set(0, 0.15, -5.0);

    const vFin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.4, 1.8), accentMat);
    vFin.position.set(0, 1.25, -4.9);

    root.add(fuselage, nose, cockpit, wing, tailWing, vFin);
    return { root };
  }

  // Helicopter
  const hull = new THREE.Mesh(new THREE.SphereGeometry(1.5, 12, 10), metalMat);
  hull.scale.set(0.95, 0.85, 1.65);
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.25, 10, 8), glassMat);
  canopy.position.set(0, 0.18, 0.8);
  const tailBoom = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, 4.8, 8), metalMat);
  tailBoom.rotation.x = Math.PI / 2;
  tailBoom.position.set(0, 0.2, -3.5);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.22, 3.2), accentMat);
  stripe.position.set(0, -0.1, 0);

  const skidMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7, roughness: 0.3 });
  for (const sx of [-1.05, 1.05]) {
    const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.8, 6), skidMat);
    skid.rotation.x = Math.PI / 2;
    skid.position.set(sx, -1.35, 0.2);
    root.add(skid);
  }

  const mainRotor = new THREE.Group();
  mainRotor.position.set(0, 1.5, 0);
  const blade1 = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.06, 0.32), skidMat);
  const blade2 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 8.2), skidMat);
  mainRotor.add(blade1, blade2);

  const tailRotor = new THREE.Group();
  tailRotor.position.set(0.28, 0.35, -5.7);
  const tBlade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.6, 0.16), accentMat);
  tailRotor.add(tBlade);

  root.add(hull, canopy, tailBoom, stripe, mainRotor, tailRotor);
  return { root, mainRotor, tailRotor };
}

export interface SuperheroRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  legL: THREE.Object3D;
  legR: THREE.Object3D;
  armL: THREE.Object3D;
  armR: THREE.Object3D;
  cape?: THREE.Object3D;
  auraMat: THREE.MeshStandardMaterial;
}

export function createSuperheroMesh(hero: 'flash' | 'superman'): SuperheroRig {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const isFlash = hero === 'flash';
  const suitMat = new THREE.MeshStandardMaterial({
    color: isFlash ? 0xdc2626 : 0x1d4ed8,
    emissive: isFlash ? 0x991b1b : 0x1e3a8a,
    emissiveIntensity: 0.35,
    roughness: 0.35,
    metalness: 0.25,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: isFlash ? 0xfacc15 : 0xdc2626,
    emissive: isFlash ? 0xfacc15 : 0x991b1b,
    emissiveIntensity: isFlash ? 1.25 : 0.4,
    roughness: 0.25,
  });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf1c27d, roughness: 0.7 });
  const auraMat = new THREE.MeshStandardMaterial({
    color: isFlash ? 0xfde047 : 0x38bdf8,
    emissive: isFlash ? 0xfacc15 : 0x38bdf8,
    emissiveIntensity: 1.4,
    transparent: true,
    opacity: 0.45,
  });

  // Grounded legs
  const legGeo = new THREE.BoxGeometry(0.22, 0.82, 0.24);
  const legL = new THREE.Group();
  legL.position.set(-0.15, 0.84, 0);
  const legLMesh = new THREE.Mesh(legGeo, isFlash ? suitMat : accentMat);
  legLMesh.position.y = -0.41;
  legL.add(legLMesh);

  const legR = new THREE.Group();
  legR.position.set(0.15, 0.84, 0);
  const legRMesh = new THREE.Mesh(legGeo, isFlash ? suitMat : accentMat);
  legRMesh.position.y = -0.41;
  legR.add(legRMesh);

  // Athletic torso + chest emblem
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.78, 0.32), suitMat);
  torso.position.y = 1.25;
  const emblem = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.26, 0.06),
    isFlash ? accentMat : new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xfacc15, emissiveIntensity: 0.8 }),
  );
  emblem.rotation.z = Math.PI / 4;
  emblem.position.set(0, 1.38, 0.18);

  // Arms
  const armGeo = new THREE.BoxGeometry(0.18, 0.68, 0.2);
  const armL = new THREE.Group();
  armL.position.set(-0.4, 1.56, 0);
  const armLMesh = new THREE.Mesh(armGeo, suitMat);
  armLMesh.position.y = -0.3;
  armL.add(armLMesh);

  const armR = new THREE.Group();
  armR.position.set(0.4, 1.56, 0);
  const armRMesh = new THREE.Mesh(armGeo, suitMat);
  armRMesh.position.y = -0.3;
  armR.add(armRMesh);

  // Head & Cowl / Hair
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 10), isFlash ? suitMat : skinMat);
  head.position.y = 1.84;

  bodyPivot.add(legL, legR, torso, emblem, armL, armR, head);

  if (isFlash) {
    // Golden ear lightning wings
    for (const sx of [-1, 1]) {
      const earWing = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.28, 4), accentMat);
      earWing.rotation.z = sx * -0.5;
      earWing.rotation.x = -0.4;
      earWing.position.set(sx * 0.24, 1.9, -0.05);
      bodyPivot.add(earWing);
    }
    const speedRing = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.05, 6, 18), auraMat);
    speedRing.rotation.x = Math.PI / 2;
    speedRing.position.y = 0.9;
    bodyPivot.add(speedRing);
    return { root, bodyPivot, legL, legR, armL, armR, auraMat };
  }

  // Superman Hair + Flowing Crimson Cape + Sky-Readable Scale & Flight Aura
  root.scale.setScalar(1.48);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
  hair.position.y = 1.87;
  const cape = new THREE.Group();
  cape.position.set(0, 1.62, -0.18);
  const capeMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xb91c1c,
    emissiveIntensity: 0.45,
    side: THREE.DoubleSide,
    roughness: 0.52,
  });
  const capeSheet = new THREE.Mesh(new THREE.BoxGeometry(0.86, 1.55, 0.05), capeMat);
  capeSheet.position.set(0, -0.74, -0.06);
  cape.add(capeSheet);

  const flightRing = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.055, 6, 18), auraMat);
  flightRing.rotation.x = Math.PI / 2;
  flightRing.position.y = 1.1;
  bodyPivot.add(hair, cape, flightRing);

  return { root, bodyPivot, legL, legR, armL, armR, cape, auraMat };
}

export function createStuntRampMesh(ramp: StuntRampSpec): THREE.Group {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(-ramp.length * 0.5, 0);
  shape.lineTo(ramp.length * 0.5, 0);
  shape.lineTo(ramp.length * 0.5, ramp.height);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, { depth: ramp.width, bevelEnabled: false });
  geo.translate(0, 0, -ramp.width * 0.5);
  geo.rotateY(-Math.PI / 2);

  const deckMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.65,
    metalness: 0.25,
  });
  const mesh = new THREE.Mesh(geo, deckMat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);

  // Glowing neon chevron boost rails along ramp sides
  const neonMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.35,
  });
  const slopeAngle = Math.atan2(ramp.height, ramp.length);
  const slopeLen = Math.hypot(ramp.length, ramp.height);
  for (const sx of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, slopeLen), neonMat);
    rail.position.set(sx * (ramp.width * 0.48), ramp.height * 0.5 + 0.1, 0);
    rail.rotation.x = -slopeAngle;
    g.add(rail);
  }

  return g;
}

export function createCityRingMesh(): THREE.Group {
  const g = new THREE.Group();
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.5,
    roughness: 0.2,
    metalness: 0.6,
  });
  const torus = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.28, 10, 24), ringMat);
  const innerMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
  });
  const inner = new THREE.Mesh(new THREE.CircleGeometry(2.1, 20), innerMat);
  g.add(torus, inner);
  return g;
}

