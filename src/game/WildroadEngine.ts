import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  CameraMode,
  CollectibleRingSpec,
  GameModeId,
  GameState,
  GraphicsSettings,
  HudSnapshot,
  MinimapActor,
  ObstacleSpec,
  VehicleSpec,
} from './types';
import { getVehicleById } from './vehiclesData';
import {
  CITY_INTERSECTIONS,
  CITY_STUNT_RAMPS,
  FUEL_STATIONS,
  ROAD_NETWORK,
  RoadPolyline,
  StaticWorldProp,
  VILLAGE_CENTERS,
  VILLAGE_HOUSE_SPOTS,
  WATER_Y,
  WORLD_RADIUS,
  biomeAt,
  computeCollisionImpactDamage,
  generateCityBuildings,
  generateWorldProps,
  getCheckpointsForMode,
  getCollectibleRingsForMode,
  getDistrictName,
  getObstaclesForMode,
  getRampSupportAt,
  getSpawnForMode,
  groundHeightAt,
  isOnMainBridgeDeck,
  isOnNorthBridgeDeck,
  isOnSouthBridgeDeck,
  rawTerrainHeightAt,
  riverCenterX,
  riverHalfWidth,
  surfaceAt,
} from './worldMath';
import {
  VehicleDriveInput,
  VehiclePhysicsState,
  createInitialVehicleState,
  stepVehiclePhysics,
} from './vehiclePhysics';
import {
  AircraftAgent,
  PedestrianAgent,
  PoliceAgent,
  SuperheroAgent,
  TrafficAgent,
  WantedState,
  WildlifeAgent,
  WorldDynamicState,
  addWantedHeat,
  createAircraftAgents,
  createPedestrians,
  createPoliceAgents,
  createSuperheroAgents,
  createTrafficAgents,
  createWantedState,
  createWildlifeAgents,
  createWorldDynamicState,
  getTimeLabel,
  stepAircraftAgents,
  stepPedestrians,
  stepPoliceAgents,
  stepSuperheroAgents,
  stepTrafficAgents,
  stepWantedSystem,
  stepWildlifeAgents,
  stepWorldDynamicAI,
} from './aiSystems';
import { ProceduralTextureSet, createProceduralTextures } from './textures';
import {
  AircraftRig,
  PersonRig,
  SuperheroRig,
  VehicleRig,
  WildlifeRig,
  createAircraftMesh,
  createCityBuildingMesh,
  createCityRingMesh,
  createFuelStation,
  createMainSuspensionBridge,
  createNorthBridge,
  createObstacleMesh,
  createPersonMesh,
  createSouthBridge,
  createStuntRampMesh,
  createSuperheroMesh,
  createVehicleMesh,
  createVillageHouse,
  createWildlifeMesh,
} from './models';
import { WildroadAudio } from './audio';

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

interface ParticleSlot {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  color: number;
}

export interface EngineCallbacks {
  onHudUpdate: (hud: HudSnapshot) => void;
  onStateChange: (state: GameState) => void;
  onSpeciesDiscovered: (species: string) => void;
  onModeCompleted: (mode: GameModeId, elapsedSec: number, rewardCredits: number) => void;
}

export class WildroadEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private textures: ProceduralTextureSet;
  private audio = new WildroadAudio();

  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private headlightL: THREE.SpotLight;
  private headlightR: THREE.SpotLight;
  private headlightTargetL = new THREE.Object3D();
  private headlightTargetR = new THREE.Object3D();
  private skyColor = new THREE.Color(0x87ceeb);
  private fogColor = new THREE.Color(0xbbe1f5);

  private waterMat!: THREE.MeshPhysicalMaterial;
  private riverMesh!: THREE.Mesh;
  private cloudsGroup = new THREE.Group();
  private nightLitFlag = { value: false };
  private villageLitMeshes: THREE.MeshStandardMaterial[] = [];
  private cityLitMeshes: THREE.MeshStandardMaterial[] = [];

  // Rain & Dust pooled InstancedMeshes
  private rainMesh!: THREE.InstancedMesh;
  private rainPositions = new Float32Array(420 * 3);
  private dustMesh!: THREE.InstancedMesh;
  private dustPool: ParticleSlot[] = [];
  private dustCursor = 0;

  // Player & World State
  private gameState: GameState = 'title';
  private mode: GameModeId = 'free';
  private cameraMode: CameraMode = 'chase';
  private settings: GraphicsSettings;
  private vehicleSpec: VehicleSpec;
  private playerRig!: VehicleRig;
  private playerState!: VehiclePhysicsState;
  private headlightsOn = false;
  private credits = 600;
  private discoveredSpecies = new Set<string>();

  // Traffic, Wildlife, Pedestrians, Aircraft, Superheroes, Obstacles, Rings, Checkpoints
  private trafficAgents: TrafficAgent[] = [];
  private trafficRigs: Map<string, VehicleRig> = new Map();
  private trafficGroup = new THREE.Group();

  private wildlifeAgents: WildlifeAgent[] = [];
  private wildlifeRigs: Map<string, WildlifeRig> = new Map();
  private wildlifeGroup = new THREE.Group();

  private pedestrians: PedestrianAgent[] = [];
  private pedestrianRigs: Map<string, PersonRig> = new Map();
  private pedestrianGroup = new THREE.Group();

  private aircraftAgents: AircraftAgent[] = [];
  private aircraftRigs: Map<string, AircraftRig> = new Map();
  private aircraftGroup = new THREE.Group();

  private superheroAgents: SuperheroAgent[] = [];
  private superheroRigs: Map<string, SuperheroRig> = new Map();
  private superheroGroup = new THREE.Group();

  private policeAgents: PoliceAgent[] = [];
  private policeRigs: Map<string, VehicleRig> = new Map();
  private policeGroup = new THREE.Group();
  private wantedState: WantedState = createWantedState(0);
  private cityBuildings = generateCityBuildings();

  private collectibleRings: CollectibleRingSpec[] = [];
  private ringMeshes: THREE.Group[] = [];
  private ringsGroup = new THREE.Group();
  private collectedRingsCount = 0;

  private obstacles: ObstacleSpec[] = [];
  private obstaclesGroup = new THREE.Group();
  private staticColliderGrid = new Map<number, StaticWorldProp[]>();

  private checkpoints = getCheckpointsForMode('free');
  private checkpointIdx = 0;
  private checkpointBeacon: THREE.Group;

  private worldAI: WorldDynamicState;
  private elapsedModeSec = 0;
  private collisionCooldown = 0;
  private hitstopTimer = 0;
  private cameraTrauma = 0;
  private totalDrivenMeters = 0;
  private hudEmitAccum = 0;
  private titlePanTime = 0;
  private lastAnimalHint: string | null = null;
  private animalHintTimer = 0;
  private stuntBanner: string | null = null;
  private stuntBannerTimer = 0;
  private wasAirborne = false;
  private airStartTime = 0;

  // Input state
  private keys = new Set<string>();
  private touchInput: VehicleDriveInput = { throttle: 0, brake: 0, steer: 0, handbrake: false, boost: false };
  private hornQueued = false;

  // Camera smoothing
  private camPos = new THREE.Vector3(-76, 8, 10);
  private camLook = new THREE.Vector3(-50, 2, 0);

  // Frame loop management
  private frameId = 0;
  private lastTimestamp = 0;
  private disposed = false;
  private resizeObserver: ResizeObserver;

  constructor(
    container: HTMLElement,
    initialVehicleId: string,
    initialMode: GameModeId,
    initialSettings: GraphicsSettings,
    initialCredits: number,
    initialDiscovered: string[],
    callbacks: EngineCallbacks,
  ) {
    this.container = container;
    this.callbacks = callbacks;
    this.settings = { ...initialSettings };
    this.mode = initialMode;
    this.credits = initialCredits;
    initialDiscovered.forEach((s) => this.discoveredSpecies.add(s));
    this.vehicleSpec = getVehicleById(initialVehicleId);
    this.worldAI = createWorldDynamicState(this.settings.timeOfDay, this.settings.weather);

    // 1. Software-WebGL Detection (never userAgent)
    this.isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Renderer Setup
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && this.settings.antialiasing,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.94;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && this.settings.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.updateResolutionScale();
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    // 3. Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = this.skyColor;
    this.scene.fog = new THREE.FogExp2(this.fogColor.getHex(), 0.0032);

    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    this.camera = new THREE.PerspectiveCamera(62, w / h, 0.25, this.settings.drawDistance + 140);

    // Mandatory Studio Environment Reflection (RoomEnvironment)
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // 4. Procedural Textures
    this.textures = createProceduralTextures(
      this.renderer.capabilities.getMaxAnisotropy(),
      this.settings.textureQuality,
    );

    // 5. Lighting Rig (1 shadow-casting directional sun + cool/warm Hemisphere fill)
    this.hemiLight = new THREE.HemisphereLight(0x88c4f4, 0x26381c, 0.45);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff1d6, 1.2);
    this.sunLight.position.set(80, 110, 60);
    this.sunLight.castShadow = !this.isSoftwareGl && this.settings.shadows;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    const d = 75;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 260;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Player Headlights (2 SpotLights attached to world, positioned from player car)
    this.headlightL = new THREE.SpotLight(0xfffbeb, 0, 58, Math.PI / 5, 0.45, 1.4);
    this.headlightR = new THREE.SpotLight(0xfffbeb, 0, 58, Math.PI / 5, 0.45, 1.4);
    this.scene.add(this.headlightL, this.headlightR, this.headlightTargetL, this.headlightTargetR);
    this.headlightL.target = this.headlightTargetL;
    this.headlightR.target = this.headlightTargetR;

    // 6. Build Static & Instanced 3D World
    this.buildTerrainAndRiver();
    this.buildRoadRibbons();
    this.buildBridges();
    this.buildVillagesAndStations();
    this.buildForestsAndRocks();
    this.buildClouds();
    this.buildParticlePools();

    // 7. Checkpoint Beacon
    this.checkpointBeacon = this.createCheckpointBeacon();
    this.checkpointBeacon.visible = false;
    this.scene.add(this.checkpointBeacon);

    this.scene.add(
      this.trafficGroup,
      this.policeGroup,
      this.wildlifeGroup,
      this.pedestrianGroup,
      this.aircraftGroup,
      this.superheroGroup,
      this.ringsGroup,
      this.obstaclesGroup,
    );

    // 8. Initialize Player Vehicle, Traffic, Wildlife, City Life, Obstacles
    this.rebuildPlayerVehicle();
    this.initWildlife();
    this.initCityLife();
    this.setupModeEntities(this.mode);

    // Pre-warm shaders on GPU
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // 9. Event Listeners
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleWindowBlur);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);

    // Start loop
    this.lastTimestamp = performance.now();
    this.scheduleNextTick();
  }

  private updateResolutionScale(): void {
    const baseRatio = this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2);
    const scaled = this.isSoftwareGl
      ? 1
      : Math.max(0.6, Math.min(2.0, baseRatio * this.settings.resolutionScale));
    this.renderer.setPixelRatio(scaled);
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(w, h, false);
  }

  private handleResize(): void {
    if (this.disposed) return;
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.updateResolutionScale();
  }

  private buildTerrainAndRiver(): void {
    const size = 540;
    const segs = 128;
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = rawTerrainHeightAt(x, z);
      pos.setY(i, y);

      const rDist = Math.abs(x - riverCenterX(z));
      const rHalf = riverHalfWidth(z);
      const distCenter = Math.hypot(x, z);

      if (y < WATER_Y + 0.35 && rDist < rHalf + 6) {
        // Sandy/pebble riverbed & shoreline
        _color.setRGB(0.46, 0.39, 0.28);
      } else if (distCenter > 215 || y > 24) {
        // High rocky/snowy mountain peaks
        _color.setRGB(y > 30 ? 0.78 : 0.34, y > 30 ? 0.82 : 0.36, y > 30 ? 0.86 : 0.38);
      } else if (distCenter > 175 || y > 10) {
        // Mountain pine slope
        _color.setRGB(0.16, 0.28, 0.14);
      } else if (Math.abs(x) >= 36 && Math.abs(x) <= 165 && z >= -150 && z <= 130) {
        // Urban concrete metropolis pavement & plazas
        const checker = ((Math.floor(x / 12) + Math.floor(z / 12)) & 1) === 0 ? 0.03 : -0.02;
        _color.setRGB(0.36 + checker, 0.38 + checker, 0.41 + checker);
      } else if ((x < -45 && z < -20) || (x > 45 && z < -20)) {
        // Deep lush forest moss floor
        _color.setRGB(0.13, 0.32, 0.13);
      } else {
        // Sunlit valley grassland with subtle variation
        const wave = Math.sin(x * 0.08) * Math.cos(z * 0.08) * 0.04;
        _color.setRGB(0.19 + wave, 0.42 + wave, 0.15);
      }

      colors[i * 3] = _color.r;
      colors[i * 3 + 1] = _color.g;
      colors[i * 3 + 2] = _color.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: this.textures.grassMap,
      roughness: 0.94,
      metalness: 0.01,
      envMapIntensity: 0.16,
    });
    const terrain = new THREE.Mesh(geo, terrainMat);
    terrain.receiveShadow = true;
    this.scene.add(terrain);

    // Reflective Flowing River Plane
    const riverGeo = new THREE.PlaneGeometry(115, 520, 1, 24);
    riverGeo.rotateX(-Math.PI / 2);
    const rPos = riverGeo.attributes.position;
    for (let i = 0; i < rPos.count; i++) {
      const z = rPos.getZ(i);
      rPos.setX(i, rPos.getX(i) + riverCenterX(z));
    }
    riverGeo.computeVertexNormals();

    this.waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x166d85,
      roughness: 0.1,
      metalness: 0.18,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      normalMap: this.textures.waterNormal,
      normalScale: new THREE.Vector2(0.45, 0.45),
      envMapIntensity: this.settings.reflections ? 1.65 : 0.4,
      transparent: true,
      opacity: 0.88,
    });
    this.riverMesh = new THREE.Mesh(riverGeo, this.waterMat);
    this.riverMesh.position.y = WATER_Y;
    this.riverMesh.receiveShadow = true;
    this.scene.add(this.riverMesh);
  }

  private buildRoadRibbons(): void {
    const asphaltMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: this.textures.asphaltMap,
      bumpMap: this.textures.asphaltBump,
      bumpScale: 0.04,
      roughness: 0.86,
      metalness: 0.04,
      envMapIntensity: 0.18,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    const dirtMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: this.textures.dirtMap,
      bumpMap: this.textures.asphaltBump,
      bumpScale: 0.07,
      roughness: 0.95,
      metalness: 0.01,
      envMapIntensity: 0.15,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    const buildRibbon = (road: RoadPolyline) => {
      const pts = road.points;
      const segCount = road.closed ? pts.length : pts.length - 1;
      for (let i = 0; i < segCount; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        // Skip direct over-water bridge spans (bridge meshes cover x in [-42..42])
        if (
          (road.id === 'main_highway' || road.id === 'south_metro_blvd') &&
          ((Math.abs(a.z) < 2 && Math.abs(b.z) < 2 && Math.abs(a.x) < 46 && Math.abs(b.x) < 46) ||
            (Math.abs(a.z + 115) < 2 && Math.abs(b.z + 115) < 2 && Math.abs(a.x) < 42 && Math.abs(b.x) < 42) ||
            (Math.abs(a.z - 86) < 2 && Math.abs(b.z - 86) < 2 && Math.abs(a.x) < 44 && Math.abs(b.x) < 44))
        ) {
          continue;
        }

        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const len = Math.hypot(dx, dz);
        const steps = Math.max(4, Math.ceil(len / 8));
        const width = road.halfWidth * 2;

        const positions: number[] = [];
        const uvs: number[] = [];
        const indices: number[] = [];

        const nx = -dz / len;
        const nz = dx / len;

        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const cx = a.x + dx * t;
          const cz = a.z + dz * t;
          const lx = cx + nx * (width * 0.5);
          const lz = cz + nz * (width * 0.5);
          const rx = cx - nx * (width * 0.5);
          const rz = cz - nz * (width * 0.5);

          const ly = Math.max(WATER_Y + 0.08, rawTerrainHeightAt(lx, lz)) + 0.09;
          const ry = Math.max(WATER_Y + 0.08, rawTerrainHeightAt(rx, rz)) + 0.09;

          positions.push(lx, ly, lz, rx, ry, rz);
          uvs.push(0, (t * len) / 14, 1, (t * len) / 14);

          if (s < steps) {
            const base = s * 2;
            indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
          }
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geo.setIndex(indices);
        geo.computeVertexNormals();

        const mesh = new THREE.Mesh(geo, road.surface === 'asphalt' ? asphaltMat : dirtMat);
        mesh.receiveShadow = true;
        this.scene.add(mesh);
      }
    };

    ROAD_NETWORK.forEach(buildRibbon);

    // Instanced urban asphalt intersection squares & crosswalk bars across all grid intersections
    const intGeo = new THREE.PlaneGeometry(11.4, 11.4);
    intGeo.rotateX(-Math.PI / 2);
    const intMat = new THREE.MeshStandardMaterial({
      color: 0x2c3138,
      roughness: 0.88,
      metalness: 0.04,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const intMesh = new THREE.InstancedMesh(intGeo, intMat, CITY_INTERSECTIONS.length);
    const stripeGeo = new THREE.PlaneGeometry(9.2, 0.7);
    stripeGeo.rotateX(-Math.PI / 2);
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
    const stripeMesh = new THREE.InstancedMesh(stripeGeo, stripeMat, CITY_INTERSECTIONS.length * 2);
    CITY_INTERSECTIONS.forEach((pt, idx) => {
      const y = rawTerrainHeightAt(pt.x, pt.z) + 0.12;
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.set(1, 1, 1);
      _dummy.position.set(pt.x, y, pt.z);
      _dummy.updateMatrix();
      intMesh.setMatrixAt(idx, _dummy.matrix);

      _dummy.position.set(pt.x, y + 0.02, pt.z - 5.2);
      _dummy.updateMatrix();
      stripeMesh.setMatrixAt(idx * 2, _dummy.matrix);

      _dummy.position.set(pt.x, y + 0.02, pt.z + 5.2);
      _dummy.updateMatrix();
      stripeMesh.setMatrixAt(idx * 2 + 1, _dummy.matrix);
    });
    intMesh.instanceMatrix.needsUpdate = true;
    stripeMesh.instanceMatrix.needsUpdate = true;
    intMesh.receiveShadow = true;
    this.scene.add(intMesh, stripeMesh);
  }

  private buildBridges(): void {
    const mainBridge = createMainSuspensionBridge(this.textures.bridgeDeckMap);
    this.scene.add(mainBridge);
    const northBridge = createNorthBridge(this.textures.bridgeDeckMap);
    this.scene.add(northBridge);
    const southBridge = createSouthBridge(this.textures.bridgeDeckMap);
    this.scene.add(southBridge);
  }

  private buildVillagesAndStations(): void {
    const wallPalette = [0xf1ebe1, 0xe7d8c3, 0xdbeafe, 0xfde68a];
    VILLAGE_HOUSE_SPOTS.forEach((hc, idx) => {
      const house = createVillageHouse(this.textures.roofTileMap, wallPalette[idx % wallPalette.length], this.nightLitFlag);
      house.position.set(hc.x, rawTerrainHeightAt(hc.x, hc.z), hc.z);
      house.rotation.y = hc.rot;
      house.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          const mat = (c as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (mat.emissive && mat.emissive.getHex() === 0xfde68a) {
            this.villageLitMeshes.push(mat);
          }
        }
      });
      this.scene.add(house);
    });

    // Fuel & Service Stations
    for (const st of FUEL_STATIONS) {
      const station = createFuelStation();
      station.position.set(st.x, rawTerrainHeightAt(st.x, st.z), st.z);
      this.scene.add(station);
    }

    // Wooden fence posts along village pastures
    const postGeo = new THREE.BoxGeometry(0.18, 1.1, 0.18);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.88 });
    const postMesh = new THREE.InstancedMesh(postGeo, postMat, VILLAGE_CENTERS.length * 16);
    let idx = 0;
    for (const v of VILLAGE_CENTERS) {
      for (let i = 0; i < 16; i++) {
        const ang = (i / 16) * Math.PI * 2;
        const px = v.x + Math.cos(ang) * (v.radius - 2);
        const pz = v.z + Math.sin(ang) * (v.radius - 2);
        _dummy.position.set(px, rawTerrainHeightAt(px, pz) + 0.55, pz);
        _dummy.rotation.set(0, -ang, 0);
        _dummy.scale.set(1, 1, 1);
        _dummy.updateMatrix();
        postMesh.setMatrixAt(idx++, _dummy.matrix);
      }
    }
    postMesh.instanceMatrix.needsUpdate = true;
    postMesh.computeBoundingSphere();
    this.scene.add(postMesh);
  }

  private staticGridKey(x: number, z: number): number {
    const gx = Math.floor(x / 20);
    const gz = Math.floor(z / 20);
    return ((gx + 100) << 12) + (gz + 100);
  }

  private buildForestsAndRocks(): void {
    const { pines, oaks, rocks, buildings, colliders } = generateWorldProps();

    this.staticColliderGrid.clear();
    for (const prop of colliders) {
      const key = this.staticGridKey(prop.x, prop.z);
      let bucket = this.staticColliderGrid.get(key);
      if (!bucket) {
        bucket = [];
        this.staticColliderGrid.set(key, bucket);
      }
      bucket.push(prop);
    }

    // 0. Tall City Skyscrapers, Urban Sidewalk Plazas, Streetlights & Stunt Ramps
    for (const b of buildings) {
      const { group, emissiveMats } = createCityBuildingMesh(b, this.textures.buildingFacadeMap, this.nightLitFlag);
      group.position.set(b.x, rawTerrainHeightAt(b.x, b.z), b.z);
      this.cityLitMeshes.push(...emissiveMats);
      this.scene.add(group);
    }

    // Urban Sidewalk Plaza Ground Pads covering full West & East Downtown City Blocks
    const plazaMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: this.textures.plazaMap,
      roughness: 0.9,
      metalness: 0.04,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    for (const px of [-96, 96]) {
      const pad = new THREE.Mesh(new THREE.PlaneGeometry(132, 268), plazaMat);
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(px, 0.47, -12);
      pad.receiveShadow = true;
      this.scene.add(pad);
    }

    // Instanced City Streetlights along all downtown avenues
    const poleGeo = new THREE.CylinderGeometry(0.1, 0.14, 6.2, 6);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.6 });
    const bulbGeo = new THREE.BoxGeometry(0.55, 0.22, 0.55);
    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xfef9c3,
      emissive: 0xfde047,
      emissiveIntensity: 0.95,
    });
    this.cityLitMeshes.push(bulbMat);
    const lampSpots: Array<[number, number]> = [];
    for (const lx of [-128, -103, -79, -54, 54, 79, 103, 128]) {
      for (let lz = -120; lz <= 105; lz += 45) {
        lampSpots.push([lx, lz]);
      }
    }
    const poles = new THREE.InstancedMesh(poleGeo, poleMat, lampSpots.length);
    const bulbs = new THREE.InstancedMesh(bulbGeo, bulbMat, lampSpots.length);
    lampSpots.forEach(([lx, lz], idx) => {
      const ly = rawTerrainHeightAt(lx, lz);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.set(1, 1, 1);
      _dummy.position.set(lx, ly + 3.1, lz);
      _dummy.updateMatrix();
      poles.setMatrixAt(idx, _dummy.matrix);
      _dummy.position.set(lx, ly + 6.25, lz);
      _dummy.updateMatrix();
      bulbs.setMatrixAt(idx, _dummy.matrix);
    });
    poles.instanceMatrix.needsUpdate = true;
    bulbs.instanceMatrix.needsUpdate = true;
    this.scene.add(poles, bulbs);

    // 4 Neon City Stunt Ramps
    for (const ramp of CITY_STUNT_RAMPS) {
      const rampMesh = createStuntRampMesh(ramp);
      rampMesh.position.set(ramp.x, rawTerrainHeightAt(ramp.x, ramp.z), ramp.z);
      rampMesh.rotation.y = ramp.yaw;
      this.scene.add(rampMesh);
    }

    // 1. Composite Instanced Pine Trees (Trunk + 2 Foliage Cones = 3 parts)
    const trunkGeo = new THREE.CylinderGeometry(0.24, 0.42, 4.2, 7);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3222, roughness: 0.94, envMapIntensity: 0.15 });
    const pineConeLowGeo = new THREE.ConeGeometry(2.5, 4.6, 8);
    const pineConeTopGeo = new THREE.ConeGeometry(1.75, 4.0, 8);
    const pineLeafMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.88, envMapIntensity: 0.18 });

    const pineTrunks = new THREE.InstancedMesh(trunkGeo, trunkMat, pines.length);
    const pineLow = new THREE.InstancedMesh(pineConeLowGeo, pineLeafMat, pines.length);
    const pineTop = new THREE.InstancedMesh(pineConeTopGeo, pineLeafMat, pines.length);
    pineLow.castShadow = true;
    pineTop.castShadow = true;

    pines.forEach((p, idx) => {
      const y = rawTerrainHeightAt(p.x, p.z);
      _dummy.rotation.set(0, p.yaw, 0);
      _dummy.scale.setScalar(p.scale);

      _dummy.position.set(p.x, y + 2.1 * p.scale, p.z);
      _dummy.updateMatrix();
      pineTrunks.setMatrixAt(idx, _dummy.matrix);

      _dummy.position.set(p.x, y + 4.8 * p.scale, p.z);
      _dummy.updateMatrix();
      pineLow.setMatrixAt(idx, _dummy.matrix);

      _dummy.position.set(p.x, y + 7.4 * p.scale, p.z);
      _dummy.updateMatrix();
      pineTop.setMatrixAt(idx, _dummy.matrix);

      const tint = 0.78 + (idx % 7) * 0.045;
      _color.setRGB(0.09 * tint, 0.28 * tint, 0.11 * tint);
      pineLow.setColorAt(idx, _color);
      _color.setRGB(0.11 * tint, 0.35 * tint, 0.13 * tint);
      pineTop.setColorAt(idx, _color);
    });

    [pineTrunks, pineLow, pineTop].forEach((im) => {
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.computeBoundingSphere();
      this.scene.add(im);
    });

    // 2. Composite Instanced Broadleaf Oaks (Trunk + Multi-lobe Crown)
    const oakTrunkGeo = new THREE.CylinderGeometry(0.32, 0.52, 3.6, 7);
    const oakCrownGeo = new THREE.DodecahedronGeometry(2.6, 1);
    const oakCrownMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.86, envMapIntensity: 0.18 });

    const oakTrunks = new THREE.InstancedMesh(oakTrunkGeo, trunkMat, oaks.length);
    const oakCrowns = new THREE.InstancedMesh(oakCrownGeo, oakCrownMat, oaks.length);
    oakCrowns.castShadow = true;

    oaks.forEach((o, idx) => {
      const y = rawTerrainHeightAt(o.x, o.z);
      _dummy.rotation.set(0, o.yaw, 0);
      _dummy.scale.setScalar(o.scale);

      _dummy.position.set(o.x, y + 1.8 * o.scale, o.z);
      _dummy.updateMatrix();
      oakTrunks.setMatrixAt(idx, _dummy.matrix);

      _dummy.position.set(o.x, y + 4.8 * o.scale, o.z);
      _dummy.scale.set(o.scale * 1.15, o.scale * 0.9, o.scale * 1.15);
      _dummy.updateMatrix();
      oakCrowns.setMatrixAt(idx, _dummy.matrix);

      const warm = (idx % 5) * 0.035;
      _color.setRGB(0.18 + warm, 0.38 + warm * 0.5, 0.12);
      oakCrowns.setColorAt(idx, _color);
    });

    [oakTrunks, oakCrowns].forEach((im) => {
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.computeBoundingSphere();
      this.scene.add(im);
    });

    // 3. Instanced Boulders & Natural Rocks
    const rockGeo = new THREE.DodecahedronGeometry(1.1, 0);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, envMapIntensity: 0.15 });
    const rocksMesh = new THREE.InstancedMesh(rockGeo, rockMat, rocks.length);
    rocks.forEach((r, idx) => {
      const y = rawTerrainHeightAt(r.x, r.z);
      _dummy.position.set(r.x, y + 0.45 * r.scale, r.z);
      _dummy.rotation.set(r.yaw * 0.3, r.yaw, 0.2);
      _dummy.scale.set(r.scale * 1.2, r.scale * 0.8, r.scale);
      _dummy.updateMatrix();
      rocksMesh.setMatrixAt(idx, _dummy.matrix);
      const g = 0.42 + (idx % 4) * 0.05;
      _color.setRGB(g, g + 0.02, g + 0.04);
      rocksMesh.setColorAt(idx, _color);
    });
    rocksMesh.instanceMatrix.needsUpdate = true;
    if (rocksMesh.instanceColor) rocksMesh.instanceColor.needsUpdate = true;
    rocksMesh.computeBoundingSphere();
    this.scene.add(rocksMesh);
  }

  private buildClouds(): void {
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.95,
      metalness: 0.0,
      transparent: true,
      opacity: 0.88,
    });
    const puffGeo = new THREE.SphereGeometry(7, 8, 6);

    for (let i = 0; i < 16; i++) {
      const cluster = new THREE.Group();
      for (let j = 0; j < 3; j++) {
        const puff = new THREE.Mesh(puffGeo, cloudMat);
        puff.position.set((j - 1) * 7.5, (j === 1 ? 2.5 : 0), (j % 2) * 2.5);
        puff.scale.set(1.4, 0.65, 1.0);
        cluster.add(puff);
      }
      const ang = (i / 16) * Math.PI * 2;
      const dist = 90 + (i % 4) * 45;
      cluster.position.set(Math.cos(ang) * dist, 64 + (i % 3) * 12, Math.sin(ang) * dist);
      this.cloudsGroup.add(cluster);
    }
    this.scene.add(this.cloudsGroup);
  }

  private buildParticlePools(): void {
    // Rain InstancedMesh
    const rainGeo = new THREE.BoxGeometry(0.03, 0.95, 0.03);
    const rainMat = new THREE.MeshBasicMaterial({
      color: 0xcbe4ff,
      transparent: true,
      opacity: 0.48,
    });
    this.rainMesh = new THREE.InstancedMesh(rainGeo, rainMat, 420);
    this.rainMesh.frustumCulled = false;
    this.rainMesh.visible = false;
    for (let i = 0; i < 420; i++) {
      this.rainPositions[i * 3] = (Math.random() - 0.5) * 60;
      this.rainPositions[i * 3 + 1] = Math.random() * 28;
      this.rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    this.scene.add(this.rainMesh);

    // Pooled Dust / Mud / Splash Particle Ring Buffer (90 particles)
    const dustGeo = new THREE.DodecahedronGeometry(0.32, 0);
    const dustMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    this.dustMesh = new THREE.InstancedMesh(dustGeo, dustMat, 90);
    this.dustMesh.frustumCulled = false;
    for (let i = 0; i < 90; i++) {
      this.dustPool.push({
        active: false,
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.6,
        size: 1,
        color: 0xb59c7d,
      });
      _dummy.position.set(0, -100, 0);
      _dummy.scale.setScalar(0.001);
      _dummy.updateMatrix();
      this.dustMesh.setMatrixAt(i, _dummy.matrix);
      _color.setHex(0xb59c7d);
      this.dustMesh.setColorAt(i, _color);
    }
    this.dustMesh.instanceMatrix.needsUpdate = true;
    if (this.dustMesh.instanceColor) this.dustMesh.instanceColor.needsUpdate = true;
    this.scene.add(this.dustMesh);
  }

  private spawnDustParticle(x: number, y: number, z: number, color: number, size = 1, vy = 1.6): void {
    const slot = this.dustPool[this.dustCursor];
    this.dustCursor = (this.dustCursor + 1) % this.dustPool.length;
    slot.active = true;
    slot.x = x + (Math.random() - 0.5) * 0.7;
    slot.y = y + 0.18;
    slot.z = z + (Math.random() - 0.5) * 0.7;
    slot.vx = (Math.random() - 0.5) * 2.4;
    slot.vy = vy + Math.random() * 1.4;
    slot.vz = (Math.random() - 0.5) * 2.4;
    slot.life = 0;
    slot.maxLife = 0.45 + Math.random() * 0.35;
    slot.size = size;
    slot.color = color;
  }

  private createCheckpointBeacon(): THREE.Group {
    const g = new THREE.Group();
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(4.2, 5.2, 28), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.25;
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 4.4, 24, 16, 1, true), beamMat);
    beam.position.y = 12;
    g.add(ring, beam);
    return g;
  }

  private rebuildPlayerVehicle(): void {
    if (this.playerRig) {
      this.scene.remove(this.playerRig.root);
    }
    this.playerRig = createVehicleMesh(this.vehicleSpec, this.textures.contactShadowMap, this.isSoftwareGl);
    this.scene.add(this.playerRig.root);

    const sp = getSpawnForMode(this.mode);
    const y = groundHeightAt(sp.x, sp.z);
    this.playerState = createInitialVehicleState(sp.x, y, sp.z, sp.yaw);
    this.syncVehicleRig(this.playerRig, this.playerState, this.vehicleSpec, false);
  }

  private initWildlife(): void {
    this.wildlifeAgents = createWildlifeAgents();
    this.wildlifeAgents.forEach((w) => {
      if (this.discoveredSpecies.has(w.species)) {
        w.discovered = true;
      }
      const rig = createWildlifeMesh(w.species);
      rig.root.position.set(w.x, w.y, w.z);
      this.wildlifeRigs.set(w.id, rig);
      this.wildlifeGroup.add(rig.root);
    });
  }

  private initCityLife(): void {
    this.pedestrians = createPedestrians();
    for (const p of this.pedestrians) {
      const rig = createPersonMesh(p.shirtColor, p.pantsColor);
      rig.root.position.set(p.x, p.y, p.z);
      this.pedestrianRigs.set(p.id, rig);
      this.pedestrianGroup.add(rig.root);
    }

    this.aircraftAgents = createAircraftAgents();
    for (const a of this.aircraftAgents) {
      const rig = createAircraftMesh(a.kind);
      rig.root.position.set(a.x, a.y, a.z);
      this.aircraftRigs.set(a.id, rig);
      this.aircraftGroup.add(rig.root);
    }

    this.superheroAgents = createSuperheroAgents();
    for (const h of this.superheroAgents) {
      const rig = createSuperheroMesh(h.hero);
      rig.root.position.set(h.x, h.y, h.z);
      this.superheroRigs.set(h.id, rig);
      this.superheroGroup.add(rig.root);
    }
  }

  private setupModeEntities(mode: GameModeId): void {
    // Clear previous obstacles, rings & traffic
    while (this.obstaclesGroup.children.length > 0) {
      this.obstaclesGroup.remove(this.obstaclesGroup.children[0]);
    }
    while (this.trafficGroup.children.length > 0) {
      this.trafficGroup.remove(this.trafficGroup.children[0]);
    }
    while (this.policeGroup.children.length > 0) {
      this.policeGroup.remove(this.policeGroup.children[0]);
    }
    while (this.ringsGroup.children.length > 0) {
      this.ringsGroup.remove(this.ringsGroup.children[0]);
    }
    this.trafficRigs.clear();
    this.policeRigs.clear();
    this.ringMeshes = [];
    this.collectedRingsCount = 0;

    this.obstacles = getObstaclesForMode(mode);
    for (const obs of this.obstacles) {
      const y = obs.y ?? groundHeightAt(obs.x, obs.z);
      const mesh = createObstacleMesh(obs, y);
      this.obstaclesGroup.add(mesh);
    }

    this.collectibleRings = getCollectibleRingsForMode(mode);
    for (const r of this.collectibleRings) {
      const rm = createCityRingMesh();
      rm.position.set(r.x, r.y, r.z);
      this.ringMeshes.push(rm);
      this.ringsGroup.add(rm);
    }

    const isRace = mode === 'race';
    const trafficCount = mode === 'bridge' ? 4 : mode === 'offroad' ? 4 : 10;
    this.trafficAgents = createTrafficAgents(trafficCount, isRace);
    for (const agent of this.trafficAgents) {
      const spec = getVehicleById(agent.vehicleId);
      const rig = createVehicleMesh(spec, this.textures.contactShadowMap, this.isSoftwareGl);
      rig.root.position.set(agent.x, agent.y, agent.z);
      rig.root.rotation.y = agent.yaw;
      this.trafficRigs.set(agent.id, rig);
      this.trafficGroup.add(rig.root);
    }

    // Metro Police Squad (always patrolling city streets; active pursuit on Wanted Stars >= 1)
    const policeSpec = getVehicleById('police_car');
    const policeCount = mode === 'gta' ? 6 : 5;
    this.policeAgents = createPoliceAgents(policeCount);
    for (const cop of this.policeAgents) {
      const rig = createVehicleMesh(policeSpec, this.textures.contactShadowMap, this.isSoftwareGl);
      rig.root.position.set(cop.x, cop.y, cop.z);
      rig.root.rotation.y = cop.yaw;
      this.policeRigs.set(cop.id, rig);
      this.policeGroup.add(rig.root);
    }
    this.wantedState = createWantedState(mode === 'gta' ? 2 : 0);

    this.checkpoints = getCheckpointsForMode(mode);
    this.checkpointIdx = 0;
    if (this.checkpoints.length > 0 && this.gameState === 'playing') {
      const cp = this.checkpoints[0];
      this.checkpointBeacon.position.set(cp.x, groundHeightAt(cp.x, cp.z), cp.z);
      this.checkpointBeacon.visible = true;
    } else {
      this.checkpointBeacon.visible = false;
    }
  }

  // Public Imperative API for React UI
  public startGame(mode: GameModeId, vehicleId?: string): void {
    if (navigator.userActivation?.hasBeenActive) {
      this.audio.unlock();
    }
    this.mode = mode;
    if (vehicleId && vehicleId !== this.vehicleSpec.id) {
      this.vehicleSpec = getVehicleById(vehicleId);
    }
    this.elapsedModeSec = 0;
    this.totalDrivenMeters = 0;
    this.hitstopTimer = 0;
    this.cameraTrauma = 0;
    this.stuntBanner = mode === 'gta' ? '2★ WANTED! SHAKE THE POLICE!' : null;
    this.stuntBannerTimer = mode === 'gta' ? 3.2 : 0;
    this.keys.clear();
    this.gameState = 'playing';
    this.rebuildPlayerVehicle();
    this.setupModeEntities(mode);

    // Snap chase camera cleanly behind player facing bridge
    const fx = Math.sin(this.playerState.yaw);
    const fz = Math.cos(this.playerState.yaw);
    this.camPos.set(this.playerState.x - fx * 9.5, this.playerState.y + 4.2, this.playerState.z - fz * 9.5);
    this.camLook.set(this.playerState.x + fx * 12, this.playerState.y + 1.4, this.playerState.z + fz * 12);

    this.callbacks.onStateChange('playing');
    this.emitHud();
  }

  public setPaused(paused: boolean): void {
    if (this.gameState !== 'playing' && this.gameState !== 'paused') return;
    this.keys.clear();
    this.gameState = paused ? 'paused' : 'playing';
    if (paused) {
      this.audio.silenceLoops();
    } else {
      this.audio.unlock();
    }
    this.callbacks.onStateChange(this.gameState);
    this.emitHud();
  }

  public returnToTitle(): void {
    this.keys.clear();
    this.gameState = 'title';
    this.audio.silenceLoops();
    this.checkpointBeacon.visible = false;
    this.rebuildPlayerVehicle();
    this.callbacks.onStateChange('title');
  }

  public setExited(): void {
    this.keys.clear();
    this.gameState = 'exited';
    this.audio.silenceLoops();
    this.callbacks.onStateChange('exited');
  }

  public selectVehicle(vehicleId: string): void {
    this.vehicleSpec = getVehicleById(vehicleId);
    this.rebuildPlayerVehicle();
    if (this.gameState === 'playing') {
      this.emitHud();
    }
  }

  public cycleCamera(): CameraMode {
    const order: CameraMode[] = ['chase', 'cockpit', 'front', 'cinematic'];
    const next = order[(order.indexOf(this.cameraMode) + 1) % order.length];
    this.cameraMode = next;
    this.emitHud();
    return next;
  }

  public toggleHeadlights(): void {
    this.headlightsOn = !this.headlightsOn;
    this.emitHud();
  }

  public triggerHorn(): void {
    this.audio.unlock();
    this.hornQueued = true;
    this.audio.playHorn(Boolean(this.vehicleSpec.isEmergency));
  }

  public setTouchControls(partial: Partial<VehicleDriveInput>): void {
    Object.assign(this.touchInput, partial);
  }

  public applySettings(next: GraphicsSettings): void {
    const texQualityChanged = next.textureQuality !== this.settings.textureQuality;
    this.settings = { ...next };

    this.renderer.shadowMap.enabled = !this.isSoftwareGl && next.shadows;
    this.sunLight.castShadow = !this.isSoftwareGl && next.shadows;
    this.waterMat.envMapIntensity = next.reflections ? 1.65 : 0.35;
    this.camera.far = next.drawDistance + 140;
    this.camera.updateProjectionMatrix();
    this.updateResolutionScale();
    this.audio.setMuted(next.muted, next.volume);

    if (next.timeOfDay !== 'dynamic') {
      this.worldAI.timeOfDayNormalized =
        next.timeOfDay === 'sunrise' ? 0.25 :
        next.timeOfDay === 'sunset' ? 0.75 :
        next.timeOfDay === 'night' ? 0.04 : 0.48;
    }
    if (next.weather !== 'dynamic') {
      this.worldAI.weatherActive = next.weather;
    }
    if (texQualityChanged) {
      // Textures stay valid; next full init uses new texture quality
    }
  }

  public getVehicleSpec(): VehicleSpec {
    return this.vehicleSpec;
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    this.audio.unlock();
    const code = e.code;
    this.keys.add(code);

    if (this.gameState === 'playing') {
      if (code === 'Escape' || code === 'KeyP') {
        e.preventDefault();
        this.setPaused(true);
      } else if (code === 'KeyC') {
        this.cycleCamera();
      } else if (code === 'KeyL') {
        this.toggleHeadlights();
      } else if (code === 'KeyG' || code === 'KeyE') {
        this.triggerHorn();
      } else if (code === 'KeyR') {
        // Quick recover upright on nearest road
        const sp = getSpawnForMode(this.mode);
        if (this.playerState.y < WATER_Y + 0.1) {
          this.playerState.x = sp.x;
          this.playerState.z = sp.z;
          this.playerState.y = groundHeightAt(sp.x, sp.z);
          this.playerState.vx = 0;
          this.playerState.vz = 0;
          this.playerState.speedMs = 0;
        }
      }
    } else if (this.gameState === 'paused') {
      if (code === 'Escape' || code === 'KeyP') {
        e.preventDefault();
        this.setPaused(false);
      }
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private handleWindowBlur = (): void => {
    this.keys.clear();
    this.touchInput = { throttle: 0, brake: 0, steer: 0, handbrake: false, boost: false };
  };

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.keys.clear();
    }
  };

  private scheduleNextTick(): void {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      this.afterDraw(() => {
        if (!this.disposed) {
          this.frameId = requestAnimationFrame(this.tick);
        }
      });
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = (now: number): void => {
    if (this.disposed) return;
    const rawDt = (now - this.lastTimestamp) / 1000;
    this.lastTimestamp = now;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

    this.updateAtmosphereAndWater(dt, now * 0.001);

    if (this.gameState === 'title') {
      this.stepTitleShowcase(dt);
    } else if (this.gameState === 'playing') {
      this.stepGameplay(dt, now * 0.001);
    }

    this.renderer.render(this.scene, this.camera);
    this.scheduleNextTick();
  };

  private updateAtmosphereAndWater(dt: number, timeSec: number): void {
    if (this.gameState !== 'paused') {
      stepWorldDynamicAI(this.worldAI, this.settings.timeOfDay, this.settings.weather, dt);
    }

    // Animate flowing river texture & clouds
    this.textures.waterNormal.offset.y -= dt * 0.16;
    this.textures.waterNormal.offset.x = Math.sin(timeSec * 0.3) * 0.04;
    this.cloudsGroup.rotation.y += dt * 0.005;

    // Sun angle from normalized timeOfDay (0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset)
    const t = this.worldAI.timeOfDayNormalized;
    const sunAngle = (t - 0.25) * Math.PI * 2;
    const sunY = Math.sin(sunAngle);
    const sunX = Math.cos(sunAngle);

    this.sunLight.position.set(
      this.playerState.x + sunX * 95,
      Math.max(12, sunY * 110),
      this.playerState.z + 55,
    );
    this.sunLight.target.position.set(this.playerState.x, this.playerState.y, this.playerState.z);

    const isNight = sunY < 0.08;
    const isTwilight = sunY >= 0.08 && sunY < 0.32;
    this.nightLitFlag.value = isNight;

    // Auto headlights at night if user hasn't forced them
    const lightsActive = this.headlightsOn || isNight;

    if (isNight) {
      this.skyColor.setRGB(0.05, 0.08, 0.16);
      this.fogColor.setRGB(0.06, 0.09, 0.17);
      this.sunLight.color.setRGB(0.45, 0.55, 0.85);
      this.sunLight.intensity = 0.55 + this.worldAI.thunderFlash * 1.4;
      this.hemiLight.color.setRGB(0.18, 0.24, 0.42);
      this.hemiLight.groundColor.setRGB(0.06, 0.08, 0.07);
      this.hemiLight.intensity = 0.52;
    } else if (isTwilight) {
      this.skyColor.setRGB(0.84, 0.48, 0.34);
      this.fogColor.setRGB(0.82, 0.52, 0.38);
      this.sunLight.color.setRGB(1.0, 0.66, 0.4);
      this.sunLight.intensity = 1.05;
      this.hemiLight.color.setRGB(0.82, 0.58, 0.52);
      this.hemiLight.groundColor.setRGB(0.2, 0.18, 0.14);
      this.hemiLight.intensity = 0.46;
    } else {
      this.skyColor.setRGB(0.42, 0.72, 0.92);
      this.fogColor.setRGB(0.62, 0.8, 0.9);
      this.sunLight.color.setRGB(1.0, 0.96, 0.86);
      this.sunLight.intensity = 1.2;
      this.hemiLight.color.setRGB(0.58, 0.8, 0.96);
      this.hemiLight.groundColor.setRGB(0.18, 0.28, 0.14);
      this.hemiLight.intensity = 0.45;
    }

    // Blend fog & sky darkening during rain / heavy fog
    const weatherMute = this.worldAI.weatherActive === 'rain' ? 0.58 : this.worldAI.weatherActive === 'fog' ? 0.78 : 1.0;
    this.skyColor.multiplyScalar(weatherMute);
    this.fogColor.multiplyScalar(weatherMute);

    (this.scene.background as THREE.Color).copy(this.skyColor);
    const fog = this.scene.fog as THREE.FogExp2;
    fog.color.copy(this.fogColor);
    const baseFog = 1 / Math.max(140, this.settings.drawDistance);
    fog.density = baseFog * (0.65 + this.worldAI.fogDensityScale * 2.1);

    // Village & Skyscraper window glow
    for (const m of this.villageLitMeshes) {
      m.emissiveIntensity = isNight ? 1.1 : 0.12;
    }
    for (const m of this.cityLitMeshes) {
      m.emissiveIntensity = isNight ? 0.95 : 0.14;
    }

    // Player Headlights & Spotlights
    if (this.playerRig) {
      this.playerRig.headlightMat.emissiveIntensity = lightsActive ? 1.8 : 0.2;
      const fx = Math.sin(this.playerState.yaw);
      const fz = Math.cos(this.playerState.yaw);
      const rx = Math.cos(this.playerState.yaw);
      const rz = -Math.sin(this.playerState.yaw);
      const spread = this.vehicleSpec.width * 0.34;
      const frontDist = this.vehicleSpec.length * 0.48;
      const spotIntensity = lightsActive && this.gameState === 'playing' ? 18 : 0;

      this.headlightL.intensity = spotIntensity;
      this.headlightR.intensity = spotIntensity;
      this.headlightL.position.set(
        this.playerState.x + fx * frontDist - rx * spread,
        this.playerState.y + 0.8,
        this.playerState.z + fz * frontDist - rz * spread,
      );
      this.headlightR.position.set(
        this.playerState.x + fx * frontDist + rx * spread,
        this.playerState.y + 0.8,
        this.playerState.z + fz * frontDist + rz * spread,
      );
      this.headlightTargetL.position.set(
        this.playerState.x + fx * 26 - rx * spread,
        this.playerState.y + 0.1,
        this.playerState.z + fz * 26 - rz * spread,
      );
      this.headlightTargetR.position.set(
        this.playerState.x + fx * 26 + rx * spread,
        this.playerState.y + 0.1,
        this.playerState.z + fz * 26 + rz * spread,
      );
    }

    // Rain particle update
    const showRain = this.settings.weatherEffects && this.worldAI.rainIntensity > 0.15;
    this.rainMesh.visible = showRain;
    if (showRain) {
      const cx = this.playerState.x;
      const cz = this.playerState.z;
      const cy = this.playerState.y;
      for (let i = 0; i < 420; i++) {
        let ry = this.rainPositions[i * 3 + 1] - dt * 26;
        if (ry < -2) ry = 26;
        this.rainPositions[i * 3 + 1] = ry;
        _dummy.position.set(cx + this.rainPositions[i * 3], cy + ry, cz + this.rainPositions[i * 3 + 2]);
        _dummy.rotation.set(0.08, 0, 0.06);
        _dummy.scale.set(1, 0.7 + this.worldAI.rainIntensity * 0.5, 1);
        _dummy.updateMatrix();
        this.rainMesh.setMatrixAt(i, _dummy.matrix);
      }
      this.rainMesh.instanceMatrix.needsUpdate = true;
    }
  }

  private stepTitleShowcase(dt: number): void {
    this.titlePanTime += dt;
    // Animate AI traffic, police patrols, wildlife, pedestrians, aircraft & superheroes during live title flyover
    stepTrafficAgents(this.trafficAgents, { x: 999, z: 999, vx: 0, vz: 0, yaw: 0 }, this.obstacles, dt);
    this.syncTrafficRigs(dt);
    stepPoliceAgents(this.policeAgents, { x: 999, z: 999, yaw: 0, speedMs: 0 }, 0, this.cityBuildings, dt);
    this.syncPoliceRigs(this.titlePanTime);
    stepWildlifeAgents(this.wildlifeAgents, { x: 999, z: 999, speedMs: 0 }, false, dt);
    this.syncWildlifeRigs();
    stepPedestrians(this.pedestrians, { x: 999, z: 999, speedMs: 0 }, false, dt);
    this.syncPedestrianRigs();
    stepAircraftAgents(this.aircraftAgents, dt);
    this.syncAircraftRigs();
    stepSuperheroAgents(this.superheroAgents, dt);
    this.syncSuperheroRigs(dt);
    this.updateDustPool(dt);

    // Scenic smooth camera orbit showcasing Lambo/Ferrari in right foreground, skyscrapers, bridge & skyline
    const angle = this.titlePanTime * 0.14;
    const focusX = -56 + Math.sin(angle * 0.7) * 5;
    const focusZ = -18 + Math.cos(angle * 0.6) * 4;
    const camX = -82 + Math.cos(angle) * 3.5;
    const camY = 7.8 + Math.sin(angle * 0.7) * 1.1;
    const camZ = 15 + Math.sin(angle) * 3.5;

    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(focusX, 3.8, focusZ);
  }

  private stepGameplay(dt: number, timeSec: number): void {
    this.cameraTrauma = Math.max(0, this.cameraTrauma - dt * 1.9);
    if (this.collisionCooldown > 0) this.collisionCooldown -= dt;
    if (this.animalHintTimer > 0) {
      this.animalHintTimer -= dt;
      if (this.animalHintTimer <= 0) this.lastAnimalHint = null;
    }
    if (this.stuntBannerTimer > 0) {
      this.stuntBannerTimer -= dt;
      if (this.stuntBannerTimer <= 0) this.stuntBanner = null;
    }

    // Hitstop freeze frame on heavy collision
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.updatePlayerCamera(dt);
      return;
    }

    this.elapsedModeSec += dt;

    // 1. Read unified controls (WASD + Arrows + Space handbrake + Shift Nitro + Touch)
    const throttle =
      this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : this.touchInput.throttle;
    const brake =
      this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : this.touchInput.brake;
    let steer = this.touchInput.steer;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) steer += 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) steer -= 1;
    steer = Math.max(-1, Math.min(1, steer));
    const handbrake = this.keys.has('Space') || this.touchInput.handbrake;
    const boost =
      this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || Boolean(this.touchInput.boost);

    // 2. Surface & pothole bump check
    const surf = surfaceAt(this.playerState.x, this.playerState.z, this.obstacles);
    let bumpImpulse = 0;
    for (const obs of this.obstacles) {
      if (!obs.solid && Math.hypot(this.playerState.x - obs.x, this.playerState.z - obs.z) <= obs.radius) {
        bumpImpulse = Math.max(bumpImpulse, obs.bumpIntensity * Math.min(1, Math.abs(this.playerState.speedMs) / 14));
      }
    }

    // 3. Step Vehicle Physics (with Nitro Boost + Stunt Ramps)
    const prevX = this.playerState.x;
    const prevZ = this.playerState.z;
    stepVehiclePhysics(
      this.playerState,
      { throttle, brake, steer, handbrake, boost },
      this.vehicleSpec,
      surf,
      dt,
      {
        worldRadius: WORLD_RADIUS,
        groundHeightAt,
        getRampSupportAt,
        bumpImpulse,
        infiniteFuel: this.mode === 'free' || this.mode === 'stunt',
      },
    );
    this.totalDrivenMeters += Math.hypot(this.playerState.x - prevX, this.playerState.z - prevZ);

    // Detect stunt ramp jump & landing rewards
    if (this.playerState.airborne && !this.wasAirborne) {
      this.wasAirborne = true;
      this.airStartTime = this.elapsedModeSec;
    } else if (!this.playerState.airborne && this.wasAirborne) {
      this.wasAirborne = false;
      const airTime = this.elapsedModeSec - this.airStartTime;
      if (airTime >= 0.45) {
        this.credits += 100;
        this.playerState.nitro = Math.min(100, this.playerState.nitro + 30);
        this.stuntBanner = `MEGA AIR ${airTime.toFixed(1)}s! +100 CR`;
        this.stuntBannerTimer = 2.8;
        this.audio.playCheckpoint();
      }
    }

    // 4. Solid Obstacle, Building & Traffic Collisions
    this.resolveCollisions();

    // 5. Pay 'n' Spray / Fuel & Repair Stations
    let inRepairBay = false;
    for (const st of FUEL_STATIONS) {
      if (Math.hypot(this.playerState.x - st.x, this.playerState.z - st.z) <= st.radius) {
        inRepairBay = true;
        this.playerState.fuel = Math.min(100, this.playerState.fuel + dt * 28);
        this.playerState.damage = Math.max(0, this.playerState.damage - dt * 24);
      }
    }

    // 5b. Collectible Golden Stunt Rings
    for (let i = 0; i < this.collectibleRings.length; i++) {
      const r = this.collectibleRings[i];
      const rm = this.ringMeshes[i];
      if (!r.collected && rm) {
        rm.rotation.y += dt * 1.8;
        if (
          Math.hypot(this.playerState.x - r.x, this.playerState.z - r.z) < 4.5 &&
          Math.abs(this.playerState.y - r.y) < 4.8
        ) {
          r.collected = true;
          rm.visible = false;
          this.collectedRingsCount++;
          this.credits += 50;
          this.playerState.nitro = Math.min(100, this.playerState.nitro + 40);
          this.stuntBanner = `RING ${this.collectedRingsCount}/${this.collectibleRings.length} · +$50`;
          this.stuntBannerTimer = 2.5;
          this.audio.playCheckpoint();
          if (this.mode === 'stunt' && this.collectedRingsCount >= this.collectibleRings.length) {
            this.finishMode(true, 'City Stunt Rings Cleared!', `Collected all ${this.collectibleRings.length} skyline rings in ${this.elapsedModeSec.toFixed(1)}s`, 550);
          }
        }
      }
    }

    // 6. Sync Player Rig + Emergency Lights + Brake Lights
    this.syncVehicleRig(this.playerRig, this.playerState, this.vehicleSpec, brake > 0 || handbrake, timeSec);

    // Nitro exhaust flames OR Tire dust / water splash particles
    if (this.playerState.isBoosting && Math.random() < 0.85) {
      const fx = Math.sin(this.playerState.yaw);
      const fz = Math.cos(this.playerState.yaw);
      this.spawnDustParticle(
        this.playerState.x - fx * (this.vehicleSpec.length * 0.5),
        this.playerState.y + 0.35,
        this.playerState.z - fz * (this.vehicleSpec.length * 0.5),
        Math.random() < 0.5 ? 0x38bdf8 : 0xf97316,
        0.75,
        0.6,
      );
    } else if (
      !this.playerState.airborne &&
      Math.abs(this.playerState.speedMs) > 4 &&
      (surf === 'dirt' || surf === 'mud' || surf === 'water' || this.playerState.slipRatio > 0.35)
    ) {
      if (Math.random() < 0.65) {
        const pColor = surf === 'water' ? 0xbae6fd : surf === 'mud' ? 0x5c4028 : 0xc2b29b;
        const fx = Math.sin(this.playerState.yaw);
        const fz = Math.cos(this.playerState.yaw);
        this.spawnDustParticle(
          this.playerState.x - fx * (this.vehicleSpec.length * 0.45),
          this.playerState.y,
          this.playerState.z - fz * (this.vehicleSpec.length * 0.45),
          pColor,
          surf === 'water' ? 1.3 : 1.0,
        );
      }
    }
    this.updateDustPool(dt);

    // 7. Step AI Traffic, Police Patrols/Pursuit, Wildlife, Pedestrians, Aircraft & Superheroes
    stepTrafficAgents(this.trafficAgents, this.playerState, this.obstacles, dt);
    this.syncTrafficRigs(dt, timeSec);

    stepPoliceAgents(this.policeAgents, this.playerState, this.wantedState.stars, this.cityBuildings, dt);
    this.syncPoliceRigs(timeSec);

    // Compute nearest police distance & step GTA Wanted State Machine
    let nearestPoliceDist = 999;
    for (const cop of this.policeAgents) {
      const d = Math.hypot(cop.x - this.playerState.x, cop.z - this.playerState.z);
      if (d < nearestPoliceDist) nearestPoliceDist = d;
    }
    const playerKmh = Math.abs(this.playerState.speedMs) * 3.6;
    const prevStars = this.wantedState.stars;
    const wantedOutcome = stepWantedSystem(this.wantedState, nearestPoliceDist, playerKmh, inRepairBay, dt);
    if (this.wantedState.stars > prevStars) {
      this.stuntBanner = `WANTED ${'★'.repeat(this.wantedState.stars)}`;
      this.stuntBannerTimer = 2.6;
    } else if (wantedOutcome.evaded) {
      this.credits += 250;
      this.stuntBanner = 'PURSUIT EVADED! +$250';
      this.stuntBannerTimer = 2.8;
      this.audio.playCheckpoint();
    } else if (wantedOutcome.busted) {
      this.finishMode(false, 'BUSTED!', 'Metro Police boxed in and impounded your supercar.', 0);
      return;
    }

    stepWildlifeAgents(this.wildlifeAgents, this.playerState, this.hornQueued, dt);
    this.syncWildlifeRigs();

    stepPedestrians(this.pedestrians, this.playerState, this.hornQueued, dt);
    this.syncPedestrianRigs();
    this.hornQueued = false;

    stepAircraftAgents(this.aircraftAgents, dt);
    this.syncAircraftRigs();

    stepSuperheroAgents(this.superheroAgents, dt);
    this.syncSuperheroRigs(dt);

    // Wildlife discovery check
    for (const w of this.wildlifeAgents) {
      const dist = Math.hypot(w.x - this.playerState.x, w.z - this.playerState.z);
      if (dist < 17) {
        if (!this.discoveredSpecies.has(w.species)) {
          this.discoveredSpecies.add(w.species);
          w.discovered = true;
          this.lastAnimalHint = `Observed ${w.label}! (+$50)`;
          this.animalHintTimer = 3.2;
          this.credits += 50;
          this.audio.playAnimalChime(w.species);
          this.callbacks.onSpeciesDiscovered(w.species);
          if (this.mode === 'wildlife' && this.discoveredSpecies.size >= 10) {
            this.finishMode(true, 'All Valley Wildlife Observed!', 'Every species documented across forests, rivers, and city parks.', 450);
          }
        }
      }
    }

    // 8. Checkpoints & Game Mode Completion / Loss
    if (this.checkpoints.length > 0 && this.checkpointIdx < this.checkpoints.length) {
      const cp = this.checkpoints[this.checkpointIdx];
      this.checkpointBeacon.rotation.y += dt * 1.4;
      const distCp = Math.hypot(this.playerState.x - cp.x, this.playerState.z - cp.z);
      if (distCp <= cp.radius) {
        this.audio.playCheckpoint();
        this.checkpointIdx++;
        if (this.checkpointIdx >= this.checkpoints.length) {
          this.checkpointBeacon.visible = false;
          this.handleModeFinish();
        } else {
          const nextCp = this.checkpoints[this.checkpointIdx];
          this.checkpointBeacon.position.set(nextCp.x, groundHeightAt(nextCp.x, nextCp.z), nextCp.z);
        }
      }
    }

    if (this.playerState.damage >= 100) {
      this.finishMode(false, 'WASTED!', 'Heavy collision damage wrecked your vehicle.', 25);
      return;
    }

    // 9. Update Camera & Biome + Siren Audio
    this.updatePlayerCamera(dt);

    const biome = biomeAt(this.playerState.x, this.playerState.z);
    const rDist = Math.abs(this.playerState.x - riverCenterX(this.playerState.z));
    const riverProx = Math.max(0, 1 - Math.max(0, rDist - riverHalfWidth(this.playerState.z)) / 42);
    this.audio.update({
      active: true,
      rpmRatio: this.playerState.rpmRatio,
      enginePitch: this.vehicleSpec.enginePitch * (this.playerState.isBoosting ? 1.18 : 1.0),
      speedMs: this.playerState.speedMs,
      slipRatio: this.playerState.slipRatio,
      surface: surf,
      biome,
      riverProximity: riverProx,
      rainIntensity: this.worldAI.rainIntensity,
      isNight: this.nightLitFlag.value,
      dt,
    });
    this.audio.updatePoliceSiren(this.wantedState.stars > 0 && nearestPoliceDist < 95, dt);

    // 10. Throttled HUD updates (<= 10Hz)
    this.hudEmitAccum += dt;
    if (this.hudEmitAccum >= 0.1) {
      this.hudEmitAccum = 0;
      this.emitHud();
    }
  }

  private resolveCollisions(): void {
    const carRadius = Math.max(1.2, this.vehicleSpec.width * 0.56);

    // 1. Static world props: instanced trees (pines, oaks), rocks/boulders, village houses
    const gx = Math.floor(this.playerState.x / 20);
    const gz = Math.floor(this.playerState.z / 20);
    for (let dxCell = -1; dxCell <= 1; dxCell++) {
      for (let dzCell = -1; dzCell <= 1; dzCell++) {
        const key = ((gx + dxCell + 100) << 12) + (gz + dzCell + 100);
        const bucket = this.staticColliderGrid.get(key);
        if (!bucket) continue;

        for (const prop of bucket) {
          const groundY = rawTerrainHeightAt(prop.x, prop.z);
          if (prop.kind === 'building') {
            if (this.playerState.y > groundY + (prop.height ?? 24)) continue;
            const hw = prop.halfW ?? 5.5;
            const hd = prop.halfD ?? 5.5;
            const cx = Math.max(prop.x - hw, Math.min(prop.x + hw, this.playerState.x));
            const cz = Math.max(prop.z - hd, Math.min(prop.z + hd, this.playerState.z));
            const dx = this.playerState.x - cx;
            const dz = this.playerState.z - cz;
            const dist = Math.hypot(dx, dz);
            if (dist < carRadius) {
              const nx = dist > 0.001 ? dx / dist : 1;
              const nz = dist > 0.001 ? dz / dist : 0;
              this.playerState.x = cx + nx * carRadius;
              this.playerState.z = cz + nz * carRadius;
              this.applyImpact(nx, nz, 1.25, 'house');
            }
            continue;
          }

          if (this.playerState.y > groundY + 2.5) continue;

          const dx = this.playerState.x - prop.x;
          const dz = this.playerState.z - prop.z;
          const dist = Math.hypot(dx, dz);
          const minDist = carRadius + prop.radius;
          if (dist < minDist) {
            const nx = dist > 0.001 ? dx / dist : 1;
            const nz = dist > 0.001 ? dz / dist : 0;
            this.playerState.x = prop.x + nx * minDist;
            this.playerState.z = prop.z + nz * minDist;
            const weight = prop.kind === 'rock' || prop.kind === 'house' ? 1.15 : 1.0;
            this.applyImpact(nx, nz, weight, prop.kind);
          }
        }
      }
    }

    // 2. Bridge side guardrails & trusses
    if (this.playerState.y > 1.2) {
      if (isOnMainBridgeDeck(this.playerState.x, this.playerState.z) && Math.abs(this.playerState.z) > 4.2) {
        const signZ = this.playerState.z >= 0 ? 1 : -1;
        this.playerState.z = signZ * 4.2;
        this.applyImpact(0, -signZ, 0.7, 'rail');
      } else if (
        isOnNorthBridgeDeck(this.playerState.x, this.playerState.z) &&
        Math.abs(this.playerState.x) <= 40 &&
        Math.abs(this.playerState.z + 115) > 3.2
      ) {
        const dz = this.playerState.z + 115;
        const signZ = dz >= 0 ? 1 : -1;
        this.playerState.z = -115 + signZ * 3.2;
        this.applyImpact(0, -signZ, 0.7, 'rail');
      } else if (
        isOnSouthBridgeDeck(this.playerState.x, this.playerState.z) &&
        Math.abs(this.playerState.x) <= 40 &&
        Math.abs(this.playerState.z - 86) > 3.6
      ) {
        const dz = this.playerState.z - 86;
        const signZ = dz >= 0 ? 1 : -1;
        this.playerState.z = 86 + signZ * 3.6;
        this.applyImpact(0, -signZ, 0.7, 'rail');
      }
    }

    // 3. Dynamic road & bridge obstacles
    for (const obs of this.obstacles) {
      if (!obs.solid) continue;
      // Ignore bridge-level obstacles if driving below bridge
      const obsY = obs.y ?? groundHeightAt(obs.x, obs.z);
      if (Math.abs(this.playerState.y - obsY) > 2.0) continue;

      const dx = this.playerState.x - obs.x;
      const dz = this.playerState.z - obs.z;
      const dist = Math.hypot(dx, dz);
      const minDist = carRadius + obs.radius;
      if (dist < minDist && dist > 0.001) {
        const nx = dx / dist;
        const nz = dz / dist;
        this.playerState.x = obs.x + nx * minDist;
        this.playerState.z = obs.z + nz * minDist;
        this.applyImpact(nx, nz, obs.kind === 'boulder' ? 1.15 : 1.0, obs.kind === 'boulder' ? 'rock' : 'obstacle');
      }
    }

    // 4. Traffic & Racer collisions (triggers GTA Wanted Heat!)
    for (const agent of this.trafficAgents) {
      if (Math.abs(this.playerState.y - agent.y) > 2.0) continue;
      const dx = this.playerState.x - agent.x;
      const dz = this.playerState.z - agent.z;
      const dist = Math.hypot(dx, dz);
      const minDist = carRadius + 1.35;
      if (dist < minDist && dist > 0.001) {
        const nx = dx / dist;
        const nz = dz / dist;
        this.playerState.x = agent.x + nx * minDist;
        this.playerState.z = agent.z + nz * minDist;
        agent.speedMs *= 0.4;
        if (Math.abs(this.playerState.speedMs) > 7) {
          const res = addWantedHeat(this.wantedState, 24);
          if (res.starIncreased) {
            this.stuntBanner = `WANTED ${'★'.repeat(res.newStars)}`;
            this.stuntBannerTimer = 2.6;
          }
        }
        this.applyImpact(nx, nz, 0.85, 'vehicle');
      }
    }

    // 5. Police Cruiser collisions (escalates GTA Wanted Level!)
    for (const cop of this.policeAgents) {
      if (Math.abs(this.playerState.y - cop.y) > 2.0) continue;
      const dx = this.playerState.x - cop.x;
      const dz = this.playerState.z - cop.z;
      const dist = Math.hypot(dx, dz);
      const minDist = carRadius + 1.4;
      if (dist < minDist && dist > 0.001) {
        const nx = dx / dist;
        const nz = dz / dist;
        this.playerState.x = cop.x + nx * minDist;
        this.playerState.z = cop.z + nz * minDist;
        if (cop.ramCooldown <= 0) {
          cop.ramCooldown = 1.6;
          const res = addWantedHeat(this.wantedState, 32);
          if (res.starIncreased) {
            this.stuntBanner = `WANTED ${'★'.repeat(res.newStars)}`;
            this.stuntBannerTimer = 2.6;
          }
        }
        this.applyImpact(nx, nz, 0.95, 'vehicle');
      }
    }
  }

  private applyImpact(
    nx: number,
    nz: number,
    weight: number,
    surfaceKind: 'pine' | 'oak' | 'rock' | 'house' | 'rail' | 'obstacle' | 'vehicle' = 'obstacle',
  ): void {
    const impactSpeed = Math.max(
      Math.abs(this.playerState.speedMs),
      Math.hypot(this.playerState.vx, this.playerState.vz),
    );
    this.playerState.vx = nx * Math.max(3, impactSpeed * 0.35);
    this.playerState.vz = nz * Math.max(3, impactSpeed * 0.35);
    this.playerState.speedMs *= -0.25;

    const dmg = computeCollisionImpactDamage(impactSpeed, weight);
    if (this.collisionCooldown <= 0 && dmg > 0) {
      this.collisionCooldown = 0.42;
      this.playerState.damage = Math.min(100, this.playerState.damage + dmg);
      this.hudEmitAccum = 0.1;

      const intensity = Math.min(1, impactSpeed / 28) * weight;
      this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.35 + intensity * 0.5);
      this.hitstopTimer = intensity > 0.45 ? 0.045 : 0;
      this.audio.playCollision(intensity);

      const debrisPrimary =
        surfaceKind === 'pine' || surfaceKind === 'oak'
          ? 0x6b4423
          : surfaceKind === 'rock' || surfaceKind === 'house'
            ? 0x94a3b8
            : 0xd4d4d8;
      const debrisSecondary =
        surfaceKind === 'pine' || surfaceKind === 'oak' ? 0x2d5a27 : debrisPrimary;

      for (let i = 0; i < 10; i++) {
        this.spawnDustParticle(
          this.playerState.x,
          this.playerState.y + 0.5,
          this.playerState.z,
          i % 2 === 0 ? debrisPrimary : debrisSecondary,
          0.8,
          2.5,
        );
      }
    }
  }

  private handleModeFinish(): void {
    if (this.mode === 'race') {
      const pos = this.computeRacePosition();
      const reward = pos === 1 ? 650 : pos === 2 ? 400 : 250;
      this.finishMode(
        pos <= 2,
        pos === 1 ? '1st Place Victory!' : `Finished #${pos} of 4`,
        `Crossed the City Circuit in ${this.elapsedModeSec.toFixed(1)}s`,
        reward,
      );
    } else if (this.mode === 'gta') {
      this.finishMode(true, 'MISSION PASSED!', `Shook the police heat across Metro City in ${this.elapsedModeSec.toFixed(1)}s`, 750);
    } else if (this.mode === 'stunt') {
      this.finishMode(true, 'City Stunt & Hero Run Complete!', `Cleared all stunt ramps and hero checkpoints in ${this.elapsedModeSec.toFixed(1)}s`, 550);
    } else if (this.mode === 'bridge') {
      this.finishMode(true, 'Bridges Conquered!', `Cleared all river crossings in ${this.elapsedModeSec.toFixed(1)}s`, 450);
    } else if (this.mode === 'offroad') {
      this.finishMode(true, 'Off-Road Trail Mastered!', `Conquered river ford and highland pass in ${this.elapsedModeSec.toFixed(1)}s`, 400);
    } else {
      this.finishMode(true, 'City Delivery Complete!', `All checkpoints reached in ${this.elapsedModeSec.toFixed(1)}s`, 500);
    }
  }

  private finishMode(victory: boolean, title: string, subtitle: string, reward: number): void {
    this.credits += reward;
    this.gameState = 'gameover';
    this.audio.silenceLoops();
    if (victory) {
      this.audio.playCheckpoint();
      this.callbacks.onModeCompleted(this.mode, this.elapsedModeSec, reward);
    }
    this.callbacks.onStateChange('gameover');
    this.emitHud({ outcomeTitle: title, outcomeSubtitle: subtitle, outcomeVictory: victory, rewardCredits: reward });
  }

  private computeRacePosition(): number {
    if (this.mode !== 'race') return 1;
    let rank = 1;
    const playerScore = this.checkpointIdx * 1000 - (
      this.checkpointIdx < this.checkpoints.length
        ? Math.hypot(
            this.playerState.x - this.checkpoints[this.checkpointIdx].x,
            this.playerState.z - this.checkpoints[this.checkpointIdx].z,
          )
        : 0
    );
    for (const r of this.trafficAgents) {
      const rScore = (r.raceLapProgress ?? 0) * 320;
      if (rScore > playerScore) rank++;
    }
    return rank;
  }

  private syncVehicleRig(
    rig: VehicleRig,
    st: { x: number; y: number; z: number; yaw: number; wheelRotation: number; steerAngle: number; pitch: number; roll: number; heave: number },
    spec: VehicleSpec,
    braking: boolean,
    timeSec = 0,
  ): void {
    rig.root.position.set(st.x, st.y, st.z);
    rig.root.rotation.y = st.yaw;

    rig.bodyGroup.position.y = st.heave;
    rig.bodyGroup.rotation.x = st.pitch;
    rig.bodyGroup.rotation.z = st.roll;

    for (const w of rig.wheels) {
      w.rotation.x = st.wheelRotation;
    }
    for (const p of rig.frontSteerPivots) {
      p.rotation.y = st.steerAngle;
    }
    if (rig.steeringWheel) {
      rig.steeringWheel.rotation.z = st.steerAngle * 3.2;
    }

    rig.brakeLightMat.emissiveIntensity = braking ? 2.2 : 0.35;

    if (spec.isEmergency && rig.emergencyRedMat && rig.emergencyBlueMat) {
      const flash = Math.sin(timeSec * 14) > 0;
      rig.emergencyRedMat.emissiveIntensity = flash ? 2.6 : 0.25;
      rig.emergencyBlueMat.emissiveIntensity = flash ? 0.25 : 2.6;
    }
  }

  private syncTrafficRigs(dt: number, timeSec = 0): void {
    for (const agent of this.trafficAgents) {
      const rig = this.trafficRigs.get(agent.id);
      if (!rig) continue;
      const spec = getVehicleById(agent.vehicleId);
      this.syncVehicleRig(
        rig,
        {
          x: agent.x,
          y: agent.y,
          z: agent.z,
          yaw: agent.yaw,
          wheelRotation: agent.wheelRotation,
          steerAngle: 0,
          pitch: 0,
          roll: 0,
          heave: 0,
        },
        spec,
        agent.braking,
        timeSec,
      );
    }
    void dt;
  }

  private syncPoliceRigs(timeSec = 0): void {
    const policeSpec = getVehicleById('police_car');
    for (const cop of this.policeAgents) {
      const rig = this.policeRigs.get(cop.id);
      if (!rig) continue;
      this.syncVehicleRig(
        rig,
        {
          x: cop.x,
          y: cop.y,
          z: cop.z,
          yaw: cop.yaw,
          wheelRotation: cop.wheelRotation,
          steerAngle: 0,
          pitch: 0,
          roll: 0,
          heave: 0,
        },
        policeSpec,
        false,
        timeSec,
      );
    }
  }

  private syncWildlifeRigs(): void {
    for (const w of this.wildlifeAgents) {
      const rig = this.wildlifeRigs.get(w.id);
      if (!rig) continue;
      rig.root.position.set(w.x, w.y, w.z);
      rig.root.rotation.y = w.yaw;

      if (rig.wingL && rig.wingR) {
        const flap = w.state === 'idle' ? 0.1 : Math.sin(w.animPhase * 2.2) * 0.65;
        rig.wingL.rotation.z = flap;
        rig.wingR.rotation.z = -flap;
      }
      if (rig.legs) {
        const swing = w.state === 'idle' ? 0 : Math.sin(w.animPhase) * (w.state === 'flee' ? 0.55 : 0.25);
        rig.legs.forEach((leg, idx) => {
          leg.rotation.x = idx % 2 === 0 ? swing : -swing;
        });
      }
    }
  }

  private syncPedestrianRigs(): void {
    for (const p of this.pedestrians) {
      const rig = this.pedestrianRigs.get(p.id);
      if (!rig) continue;
      rig.root.position.set(p.x, p.y, p.z);
      rig.root.rotation.y = p.yaw;
      const swing = Math.sin(p.walkPhase) * 0.55;
      rig.legL.rotation.x = swing;
      rig.legR.rotation.x = -swing;
      rig.armL.rotation.x = -swing * 0.7;
      rig.armR.rotation.x = swing * 0.7;
    }
  }

  private syncAircraftRigs(): void {
    for (const a of this.aircraftAgents) {
      const rig = this.aircraftRigs.get(a.id);
      if (!rig) continue;
      rig.root.position.set(a.x, a.y, a.z);
      rig.root.rotation.set(0, a.yaw, a.bank, 'YXZ');
      if (rig.mainRotor) {
        rig.mainRotor.rotation.y = a.rotorAngle;
      }
      if (rig.tailRotor) {
        rig.tailRotor.rotation.x = a.rotorAngle * 1.5;
      }
    }
  }

  private syncSuperheroRigs(dt: number): void {
    for (const h of this.superheroAgents) {
      const rig = this.superheroRigs.get(h.id);
      if (!rig) continue;
      rig.root.position.set(h.x, h.y, h.z);
      rig.root.rotation.y = h.yaw;
      if (h.hero === 'flash') {
        rig.bodyPivot.rotation.x = h.pitch;
        const swing = Math.sin(h.animPhase) * 0.9;
        rig.legL.rotation.x = swing;
        rig.legR.rotation.x = -swing;
        rig.armL.rotation.x = -swing * 0.85;
        rig.armR.rotation.x = swing * 0.85;
        if (Math.random() < 0.75 + dt * 2) {
          this.spawnDustParticle(h.x, h.y + 0.9, h.z, 0xfacc15, 0.72, 1.1);
        }
      } else {
        // Superman flight pose + glowing sky contrail
        rig.bodyPivot.rotation.x = h.pitch;
        rig.armL.rotation.x = -Math.PI * 0.9;
        rig.armR.rotation.x = -Math.PI * 0.12;
        rig.legL.rotation.x = 0.08;
        rig.legR.rotation.x = -0.05;
        if (rig.cape) {
          rig.cape.rotation.x = 0.45 + Math.sin(h.animPhase * 1.4) * 0.16;
        }
        if (Math.random() < 0.65) {
          this.spawnDustParticle(h.x, h.y + 0.4, h.z, Math.random() < 0.6 ? 0x38bdf8 : 0xef4444, 0.95, 0.35);
        }
      }
    }
  }

  private updateDustPool(dt: number): void {
    let anyChanged = false;
    for (let i = 0; i < this.dustPool.length; i++) {
      const p = this.dustPool[i];
      if (!p.active) continue;
      anyChanged = true;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        _dummy.position.set(0, -100, 0);
        _dummy.scale.setScalar(0.001);
        _dummy.updateMatrix();
        this.dustMesh.setMatrixAt(i, _dummy.matrix);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vy -= 3.5 * dt;
      const ratio = 1 - p.life / p.maxLife;
      _dummy.position.set(p.x, p.y, p.z);
      _dummy.scale.setScalar(p.size * (0.6 + (1 - ratio) * 1.1) * ratio);
      _dummy.updateMatrix();
      this.dustMesh.setMatrixAt(i, _dummy.matrix);
      _color.setHex(p.color);
      this.dustMesh.setColorAt(i, _color);
    }
    if (anyChanged) {
      this.dustMesh.instanceMatrix.needsUpdate = true;
      if (this.dustMesh.instanceColor) this.dustMesh.instanceColor.needsUpdate = true;
    }
  }

  private updatePlayerCamera(dt: number): void {
    const fx = Math.sin(this.playerState.yaw);
    const fz = Math.cos(this.playerState.yaw);
    const rx = Math.cos(this.playerState.yaw);
    const rz = -Math.sin(this.playerState.yaw);

    const shake = this.cameraTrauma * this.cameraTrauma;
    const shakeX = (Math.random() - 0.5) * shake * 0.7;
    const shakeY = (Math.random() - 0.5) * shake * 0.5;

    const speedKmh = Math.abs(this.playerState.speedMs) * 3.6;
    const targetFov = this.cameraMode === 'cockpit' ? 68 : 60 + Math.min(14, speedKmh * 0.06);
    this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 6);
    this.camera.updateProjectionMatrix();

    if (this.playerRig) {
      const showExteriorCabin = this.cameraMode !== 'cockpit';
      for (const part of this.playerRig.exteriorCabinParts) {
        part.visible = showExteriorCabin;
      }
    }

    if (this.cameraMode === 'cockpit') {
      const wr = this.vehicleSpec.wheelRadius;
      const isForwardCab =
        this.vehicleSpec.bodyStyle === 'bus' ||
        this.vehicleSpec.bodyStyle === 'boxtruck' ||
        this.vehicleSpec.bodyStyle === 'ambulance';
      const seatY = this.playerState.y + wr * 0.65 + (isForwardCab ? 1.45 : 1.14) + this.playerState.heave;
      const seatF = isForwardCab ? this.vehicleSpec.length * 0.34 : -this.vehicleSpec.length * 0.02;
      const seatSide = -this.vehicleSpec.width * 0.2;
      this.camera.position.set(
        this.playerState.x + fx * seatF + rx * seatSide + shakeX * 0.25,
        seatY + shakeY * 0.25,
        this.playerState.z + fz * seatF + rz * seatSide,
      );
      this.camera.lookAt(
        this.playerState.x + fx * 24 + rx * seatSide,
        seatY - 1.3 + this.playerState.pitch * 4,
        this.playerState.z + fz * 24 + rz * seatSide,
      );
      return;
    }

    if (this.cameraMode === 'front') {
      const hoodY = this.playerState.y + this.vehicleSpec.height * 0.55;
      const frontDist = this.vehicleSpec.length * 0.52;
      this.camera.position.set(
        this.playerState.x + fx * frontDist + shakeX * 0.4,
        hoodY + shakeY * 0.4,
        this.playerState.z + fz * frontDist,
      );
      this.camera.lookAt(
        this.playerState.x + fx * 35,
        hoodY - 0.3,
        this.playerState.z + fz * 35,
      );
      return;
    }

    if (this.cameraMode === 'cinematic') {
      _v1.set(
        this.playerState.x - fx * 11 + rx * 6.5,
        this.playerState.y + 5.6,
        this.playerState.z - fz * 11 + rz * 6.5,
      );
      _v2.set(this.playerState.x + fx * 6, this.playerState.y + 1.4, this.playerState.z + fz * 6);
    } else {
      // Third-person chase camera with terrain clearance clamp
      const dist = 7.4 + this.vehicleSpec.length * 0.65;
      const height = 3.1 + this.vehicleSpec.height * 0.65;
      _v1.set(
        this.playerState.x - fx * dist,
        this.playerState.y + height,
        this.playerState.z - fz * dist,
      );
      const minCamGround = groundHeightAt(_v1.x, _v1.z) + 1.4;
      if (_v1.y < minCamGround) _v1.y = minCamGround;
      _v2.set(this.playerState.x + fx * 10, this.playerState.y + 1.35, this.playerState.z + fz * 10);
    }

    const dampAlpha = 1 - Math.exp(-8.5 * dt);
    this.camPos.lerp(_v1, dampAlpha);
    this.camLook.lerp(_v2, 1 - Math.exp(-12 * dt));

    this.camera.position.set(this.camPos.x + shakeX, this.camPos.y + shakeY, this.camPos.z);
    this.camera.lookAt(this.camLook);
  }

  private emitHud(extra: Partial<HudSnapshot> = {}): void {
    const speedKmh = Math.round(Math.abs(this.playerState.speedMs) * 3.6);
    const surf = surfaceAt(this.playerState.x, this.playerState.z, this.obstacles);
    const biome = biomeAt(this.playerState.x, this.playerState.z);
    const cp = this.checkpointIdx < this.checkpoints.length ? this.checkpoints[this.checkpointIdx] : null;

    let nearbyStationHint: string | null = null;
    for (const st of FUEL_STATIONS) {
      if (Math.hypot(this.playerState.x - st.x, this.playerState.z - st.z) <= st.radius + 2) {
        nearbyStationHint = `${st.name} · Refueling & Repairing`;
      }
    }

    const minimapActors: MinimapActor[] = [];
    for (const t of this.trafficAgents) {
      minimapActors.push({ x: t.x, z: t.z, kind: t.isRacer ? 'racer' : 'traffic' });
    }
    for (const w of this.wildlifeAgents) {
      if (Math.hypot(w.x - this.playerState.x, w.z - this.playerState.z) < 70) {
        minimapActors.push({ x: w.x, z: w.z, kind: 'wildlife' });
      }
    }
    for (const st of FUEL_STATIONS) {
      minimapActors.push({ x: st.x, z: st.z, kind: 'fuel' });
    }
    for (const h of this.superheroAgents) {
      minimapActors.push({
        x: h.x,
        z: h.z,
        kind: 'hero',
        color: h.hero === 'flash' ? '#facc15' : '#38bdf8',
      });
    }
    for (const a of this.aircraftAgents) {
      minimapActors.push({ x: a.x, z: a.z, kind: 'aircraft' });
    }
    for (const cop of this.policeAgents) {
      minimapActors.push({ x: cop.x, z: cop.z, kind: 'police' });
    }
    for (const r of this.collectibleRings) {
      if (!r.collected) {
        minimapActors.push({ x: r.x, z: r.z, kind: 'ring' });
      }
    }
    if (cp) {
      minimapActors.push({ x: cp.x, z: cp.z, kind: 'checkpoint' });
    }

    const objectiveTitle =
      this.mode === 'free'
        ? 'Metro City Free Roam'
        : this.mode === 'wildlife'
          ? 'City Park Wildlife Tour'
          : cp
            ? cp.label
            : 'Completed';

    const objectiveProgress =
      this.mode === 'free'
        ? `${(this.totalDrivenMeters / 1000).toFixed(2)} km · ${this.collectedRingsCount}/${this.collectibleRings.length} Rings`
        : this.mode === 'wildlife'
          ? `${this.discoveredSpecies.size} / 10 Species`
          : `Checkpoint ${Math.min(this.checkpointIdx + 1, this.checkpoints.length)} / ${this.checkpoints.length}`;

    this.callbacks.onHudUpdate({
      speedKmh,
      gear: this.playerState.gear,
      rpmRatio: this.playerState.rpmRatio,
      fuel: Math.round(this.playerState.fuel),
      damage: Math.round(this.playerState.damage),
      nitro: Math.round(this.playerState.nitro),
      isBoosting: this.playerState.isBoosting,
      airborne: this.playerState.airborne,
      headlightsOn: this.headlightsOn || this.nightLitFlag.value,
      cameraMode: this.cameraMode,
      surface: surf,
      biome,
      weatherActive: this.worldAI.weatherActive,
      timeLabel: getTimeLabel(this.worldAI.timeOfDayNormalized),
      mode: this.mode,
      objectiveTitle,
      objectiveProgress,
      objectiveIndex: this.checkpointIdx,
      objectiveTotal: this.checkpoints.length,
      elapsedSec: this.elapsedModeSec,
      racePosition: this.computeRacePosition(),
      raceTotalRacers: this.mode === 'race' ? 4 : 1,
      wildlifeDiscoveredCount: this.discoveredSpecies.size,
      wildlifeTotalSpecies: 10,
      nearbyAnimalHint: this.lastAnimalHint,
      nearbyStationHint,
      stuntBanner: this.stuntBanner,
      wantedStars: this.wantedState.stars,
      bustedProgress: Math.round((this.wantedState.bustedTimer / 2.8) * 100),
      districtName: getDistrictName(this.playerState.x, this.playerState.z),
      credits: this.credits,
      playerX: this.playerState.x,
      playerZ: this.playerState.z,
      playerYaw: this.playerState.yaw,
      minimapActors,
      ...extra,
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleWindowBlur);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.resizeObserver.disconnect();

    this.audio.dispose();
    this.textures.dispose();

    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else if (mesh.material) {
          mesh.material.dispose();
        }
      }
    });

    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
