import { AnimalSpecies, BiomeType, ObstacleSpec, WeatherPreset, TimeOfDayPreset } from './types';
import { MAIN_HIGHWAY_LOOP, Point2D, groundHeightAt, riverCenterX, riverHalfWidth } from './worldMath';

export interface TrafficAgent {
  id: string;
  vehicleId: string;
  waypointIdx: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  speedMs: number;
  targetSpeedMs: number;
  laneOffset: number; // +2.8 right lane, -2.8 overtake lane
  desiredLaneOffset: number;
  overtakeTimer: number;
  braking: boolean;
  wheelRotation: number;
  isRacer?: boolean;
  raceLapProgress?: number;
}

export interface WildlifeAgent {
  id: string;
  species: AnimalSpecies;
  label: string;
  x: number;
  y: number;
  z: number;
  homeX: number;
  homeZ: number;
  yaw: number;
  speedMs: number;
  state: 'idle' | 'wander' | 'flee' | 'fly' | 'cross_road';
  animPhase: number;
  fleeTimer: number;
  perchHeight: number;
  targetX: number;
  targetZ: number;
  discovered: boolean;
}

export const SPECIES_LABELS: Record<AnimalSpecies, string> = {
  bird_flying: 'Soaring Forest Hawk',
  bird_perched: 'Valley Songbird',
  butterfly: 'Meadow Monarch Butterfly',
  rabbit: 'Cottontail Rabbit',
  deer: 'Wild Forest Deer',
  monkey: 'Highland Macaque',
  goat: 'Mountain Goat',
  cow: 'Valley Dairy Cow',
  dog: 'Village Shepherd Dog',
  cat: 'Cottage Tabby Cat',
};

function wrapAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function createTrafficAgents(count: number, isRaceMode: boolean): TrafficAgent[] {
  const trafficPool = ['toyota_camry', 'toyota_corolla', 'pickup_4x4', 'delivery_truck', 'city_bus', 'alpine_suv', 'bmw_m4', 'mercedes_amg'];
  const racerPool = ['ferrari_f8', 'lamborghini_aventador', 'mercedes_amg'];
  const agents: TrafficAgent[] = [];

  if (isRaceMode) {
    // 3 AI racers starting ahead/alongside player on main highway straight
    for (let i = 0; i < 3; i++) {
      const startX = -80 + (i % 2) * 5;
      const startZ = i === 1 ? -2.2 : 2.2 - (i === 2 ? 4.4 : 0);
      agents.push({
        id: `racer_${i}`,
        vehicleId: racerPool[i % racerPool.length],
        waypointIdx: 1,
        x: startX,
        y: groundHeightAt(startX, startZ),
        z: startZ,
        yaw: Math.PI / 2,
        speedMs: 0,
        targetSpeedMs: 36 + i * 2.2,
        laneOffset: i === 1 ? -2.4 : 2.4,
        desiredLaneOffset: i === 1 ? -2.4 : 2.4,
        overtakeTimer: 0,
        braking: false,
        wheelRotation: 0,
        isRacer: true,
        raceLapProgress: 0,
      });
    }
    return agents;
  }

  for (let i = 0; i < count; i++) {
    const wpIdx = (i * 2) % MAIN_HIGHWAY_LOOP.length;
    const nextWp = MAIN_HIGHWAY_LOOP[(wpIdx + 1) % MAIN_HIGHWAY_LOOP.length];
    const currWp = MAIN_HIGHWAY_LOOP[wpIdx];
    const t = ((i * 0.37) % 0.7) + 0.15;
    const dx = nextWp.x - currWp.x;
    const dz = nextWp.z - currWp.z;
    const yaw = Math.atan2(dx, dz);
    const rx = Math.cos(yaw);
    const rz = -Math.sin(yaw);
    const lane = 2.8;
    const x = currWp.x + dx * t + rx * lane;
    const z = currWp.z + dz * t + rz * lane;

    agents.push({
      id: `traffic_${i}`,
      vehicleId: trafficPool[i % trafficPool.length],
      waypointIdx: (wpIdx + 1) % MAIN_HIGHWAY_LOOP.length,
      x,
      y: groundHeightAt(x, z),
      z,
      yaw,
      speedMs: 12 + (i % 3) * 2.5,
      targetSpeedMs: 14 + (i % 4) * 2.2,
      laneOffset: lane,
      desiredLaneOffset: lane,
      overtakeTimer: 0,
      braking: false,
      wheelRotation: 0,
    });
  }
  return agents;
}

export function stepTrafficAgents(
  agents: TrafficAgent[],
  player: { x: number; z: number; vx: number; vz: number; yaw: number },
  obstacles: ObstacleSpec[],
  dt: number,
  waypoints: Point2D[] = MAIN_HIGHWAY_LOOP,
): void {
  const clampedDt = Math.min(dt, 0.05);

  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    const wp = waypoints[a.waypointIdx];
    const prevWp = waypoints[(a.waypointIdx - 1 + waypoints.length) % waypoints.length];
    const segDx = wp.x - prevWp.x;
    const segDz = wp.z - prevWp.z;
    const segYaw = Math.atan2(segDx, segDz);
    const segRx = Math.cos(segYaw);
    const segRz = -Math.sin(segYaw);

    // Target point with lane offset
    const tx = wp.x + segRx * a.laneOffset;
    const tz = wp.z + segRz * a.laneOffset;

    const toTx = tx - a.x;
    const toTz = tz - a.z;
    const distToWp = Math.hypot(toTx, toTz);

    if (distToWp < 11) {
      a.waypointIdx = (a.waypointIdx + 1) % waypoints.length;
      if (a.isRacer) {
        a.raceLapProgress = (a.raceLapProgress ?? 0) + 1;
      }
    }

    // Forward sensing: check player, other AI traffic, and obstacles ahead
    const fx = Math.sin(a.yaw);
    const fz = Math.cos(a.yaw);
    let obstacleAhead = false;
    let slowerVehicleAhead = false;
    let safeToOvertake = true;
    let avoidSteerBias = 0;

    // Check obstacles
    for (const obs of obstacles) {
      if (!obs.solid) continue;
      const ox = obs.x - a.x;
      const oz = obs.z - a.z;
      const forwardDist = ox * fx + oz * fz;
      const latDist = ox * Math.cos(a.yaw) - oz * Math.sin(a.yaw);
      if (forwardDist > 0 && forwardDist < 16 && Math.abs(latDist) < obs.radius + 2.2) {
        obstacleAhead = true;
        avoidSteerBias = latDist >= 0 ? -0.35 : 0.35;
      }
    }

    // Check player car ahead
    const px = player.x - a.x;
    const pz = player.z - a.z;
    const pForward = px * fx + pz * fz;
    const pLat = px * Math.cos(a.yaw) - pz * Math.sin(a.yaw);
    if (pForward > 0 && pForward < 18 && Math.abs(pLat) < 3.0) {
      slowerVehicleAhead = true;
      if (pForward < 9.5) obstacleAhead = true;
    }

    // Check other traffic agents
    for (let j = 0; j < agents.length; j++) {
      if (i === j) continue;
      const b = agents[j];
      const bx = b.x - a.x;
      const bz = b.z - a.z;
      const bForward = bx * fx + bz * fz;
      const bLat = bx * Math.cos(a.yaw) - bz * Math.sin(a.yaw);
      if (bForward > 0 && bForward < 20 && Math.abs(bLat) < 3.0) {
        if (bForward < 10) {
          obstacleAhead = true;
        } else if (b.speedMs < a.targetSpeedMs * 0.92) {
          slowerVehicleAhead = true;
        }
      }
      // Check if left/overtake lane is occupied
      if (bForward > -8 && bForward < 24 && bLat < -1.5 && bLat > -6.5) {
        safeToOvertake = false;
      }
    }

    // Overtake state machine
    if (a.overtakeTimer > 0) {
      a.overtakeTimer -= clampedDt;
      if (a.overtakeTimer <= 0) {
        a.desiredLaneOffset = 2.8;
      }
    } else if (slowerVehicleAhead && safeToOvertake && !obstacleAhead) {
      a.desiredLaneOffset = -2.2;
      a.overtakeTimer = 3.2;
    }

    a.laneOffset += (a.desiredLaneOffset - a.laneOffset) * Math.min(1, clampedDt * 2.5);

    // Speed & braking
    let desiredSpeed = a.targetSpeedMs;
    if (obstacleAhead) {
      desiredSpeed = a.isRacer ? a.targetSpeedMs * 0.45 : 0;
      a.braking = true;
    } else if (slowerVehicleAhead && !safeToOvertake) {
      desiredSpeed = a.targetSpeedMs * 0.55;
      a.braking = true;
    } else {
      a.braking = false;
    }

    const accel = desiredSpeed > a.speedMs ? 7.5 : 14.0;
    a.speedMs += Math.sign(desiredSpeed - a.speedMs) * Math.min(Math.abs(desiredSpeed - a.speedMs), accel * clampedDt);

    // Smooth steering toward waypoint + obstacle avoidance bias
    const targetYaw = Math.atan2(toTx, toTz) + avoidSteerBias;
    const diff = wrapAngle(targetYaw - a.yaw);
    const maxTurn = (a.isRacer ? 2.6 : 1.9) * clampedDt;
    a.yaw += Math.max(-maxTurn, Math.min(maxTurn, diff));

    a.x += Math.sin(a.yaw) * a.speedMs * clampedDt;
    a.z += Math.cos(a.yaw) * a.speedMs * clampedDt;
    a.y = groundHeightAt(a.x, a.z);
    a.wheelRotation += (a.speedMs / 0.36) * clampedDt;
  }
}

export function createWildlifeAgents(): WildlifeAgent[] {
  const list: WildlifeAgent[] = [];
  const add = (
    id: string,
    species: AnimalSpecies,
    x: number,
    z: number,
    perchHeight = 0,
    speedMs = 2.5,
  ) => {
    list.push({
      id,
      species,
      label: SPECIES_LABELS[species],
      x,
      y: groundHeightAt(x, z) + perchHeight,
      z,
      homeX: x,
      homeZ: z,
      yaw: (list.length * 1.7) % (Math.PI * 2),
      speedMs,
      state: species === 'bird_flying' ? 'fly' : 'wander',
      animPhase: list.length * 0.9,
      fleeTimer: 0,
      perchHeight,
      targetX: x,
      targetZ: z,
      discovered: false,
    });
  };

  // Flying birds circling valley & river
  for (let i = 0; i < 10; i++) {
    add(`bird_fly_${i}`, 'bird_flying', -60 + (i % 5) * 32, -75 + Math.floor(i / 5) * 110, 12 + (i % 3) * 4, 9.5);
  }
  // Perched birds on forest trees near roads
  const perchCoords = [
    [-55, -24], [-92, -36], [56, -28], [88, -42], [-66, 26], [62, 30],
  ];
  perchCoords.forEach(([px, pz], i) => add(`bird_perch_${i}`, 'bird_perched', px, pz, 4.8, 7.5));

  // Butterflies in meadows
  for (let i = 0; i < 8; i++) {
    add(`butterfly_${i}`, 'butterfly', -44 + i * 13, 34 + (i % 3) * 16, 1.3, 1.8);
  }

  // Deer in forest groves (some near forest edge)
  const deerCoords = [
    [-82, -26], [-98, -55], [-68, -62], [74, -36], [95, -72], [-75, 22],
  ];
  deerCoords.forEach(([dx, dz], i) => add(`deer_${i}`, 'deer', dx, dz, 0, 3.2));

  // Rabbits along forest edges & grasslands
  const rabbitCoords = [
    [-54, 18], [-48, -16], [54, 14], [46, -18], [-74, 40], [64, 42],
  ];
  rabbitCoords.forEach(([rx, rz], i) => add(`rabbit_${i}`, 'rabbit', rx, rz, 0, 2.8));

  // Monkeys in dense north-west & north-east forest
  const monkeyCoords = [
    [-108, -74], [-96, -92], [96, -86], [112, -68],
  ];
  monkeyCoords.forEach(([mx, mz], i) => add(`monkey_${i}`, 'monkey', mx, mz, 0, 3.5));

  // Goats near mountain hills & bridge approaches
  const goatCoords = [
    [-40, -148], [38, -152], [-145, -125], [140, -130],
  ];
  goatCoords.forEach(([gx, gz], i) => add(`goat_${i}`, 'goat', gx, gz, 0, 2.4));

  // Cows grazing in village pastures (plus one road-crosser)
  const cowCoords = [
    [-64, 82], [-70, 96], [68, 86], [76, 72],
  ];
  cowCoords.forEach(([cx, cz], i) => add(`cow_${i}`, 'cow', cx, cz, 0, 1.4));

  // Village dogs & cats
  add('dog_0', 'dog', -86, 84, 0, 3.4);
  add('dog_1', 'dog', 82, 88, 0, 3.4);
  add('cat_0', 'cat', -76, 92, 0, 2.2);
  add('cat_1', 'cat', 90, 78, 0, 2.2);

  return list;
}

export function stepWildlifeAgents(
  animals: WildlifeAgent[],
  player: { x: number; z: number; speedMs: number },
  hornTriggered: boolean,
  dt: number,
): void {
  const clampedDt = Math.min(dt, 0.05);

  for (let i = 0; i < animals.length; i++) {
    const a = animals[i];
    a.animPhase += clampedDt * (a.state === 'flee' ? 12 : 4.5);

    const dxP = a.x - player.x;
    const dzP = a.z - player.z;
    const distPlayer = Math.hypot(dxP, dzP);
    const alertRadius = hornTriggered ? 34 : Math.abs(player.speedMs) > 6 ? 20 : 12;

    if (a.species === 'bird_flying') {
      const orbitAngle = a.animPhase * 0.14 + i * 0.8;
      const radius = 26 + (i % 3) * 10;
      const tx = a.homeX + Math.cos(orbitAngle) * radius;
      const tz = a.homeZ + Math.sin(orbitAngle) * radius;
      a.yaw = Math.atan2(tx - a.x, tz - a.z);
      a.x = tx;
      a.z = tz;
      a.y = groundHeightAt(a.x, a.z) + a.perchHeight + Math.sin(a.animPhase * 0.6) * 1.6;
      continue;
    }

    if (a.species === 'butterfly') {
      const angle = a.animPhase * 0.45 + i;
      a.x = a.homeX + Math.cos(angle) * 5.5;
      a.z = a.homeZ + Math.sin(angle * 1.3) * 5.5;
      a.yaw = angle + Math.PI * 0.5;
      a.y = groundHeightAt(a.x, a.z) + 1.2 + Math.sin(a.animPhase * 2.2) * 0.45;
      continue;
    }

    // Perched birds take flight when a car approaches
    if (a.species === 'bird_perched') {
      if (distPlayer < alertRadius && a.state !== 'fly') {
        a.state = 'fly';
        a.fleeTimer = 5.5;
        a.yaw = Math.atan2(dxP, dzP);
      }
      if (a.state === 'fly') {
        a.fleeTimer -= clampedDt;
        a.x += Math.sin(a.yaw) * 8.5 * clampedDt;
        a.z += Math.cos(a.yaw) * 8.5 * clampedDt;
        a.y += (groundHeightAt(a.x, a.z) + 14 - a.y) * Math.min(1, clampedDt * 2.5);
        if (a.fleeTimer <= 0) {
          // Glide back to home tree
          a.x = a.homeX;
          a.z = a.homeZ;
          a.y = groundHeightAt(a.x, a.z) + a.perchHeight;
          a.state = 'idle';
        }
      } else {
        a.y = groundHeightAt(a.x, a.z) + a.perchHeight;
      }
      continue;
    }

    // Ground wildlife AI: react to approaching vehicle or horn
    if (distPlayer < alertRadius && a.species !== 'cow') {
      a.state = 'flee';
      a.fleeTimer = 3.0;
      const fleeYaw = Math.atan2(dxP, dzP);
      a.yaw = fleeYaw;
    } else if (a.fleeTimer > 0) {
      a.fleeTimer -= clampedDt;
      if (a.fleeTimer <= 0) {
        a.state = 'wander';
      }
    }

    if (a.state === 'flee') {
      const fleeSpeed = a.speedMs * 2.6;
      a.x += Math.sin(a.yaw) * fleeSpeed * clampedDt;
      a.z += Math.cos(a.yaw) * fleeSpeed * clampedDt;
    } else {
      // Gentle wander around home territory (with occasional road crossing for deer/cows)
      const distHome = Math.hypot(a.x - a.homeX, a.z - a.homeZ);
      const maxRoam = a.species === 'deer' ? 22 : 12;
      if (distHome > maxRoam) {
        const backYaw = Math.atan2(a.homeX - a.x, a.homeZ - a.z);
        a.yaw += wrapAngle(backYaw - a.yaw) * Math.min(1, clampedDt * 3);
      } else {
        a.yaw += Math.sin(a.animPhase * 0.25 + i) * 0.45 * clampedDt;
      }
      const wanderSpeed = a.speedMs * 0.45 * (0.5 + 0.5 * Math.sin(a.animPhase * 0.3));
      a.x += Math.sin(a.yaw) * wanderSpeed * clampedDt;
      a.z += Math.cos(a.yaw) * wanderSpeed * clampedDt;
    }

    const rc = riverCenterX(a.z);
    const rw = riverHalfWidth(a.z) + 2.5;
    if (Math.abs(a.x - rc) < rw) {
      const bankSide = a.homeX >= rc ? 1 : -1;
      a.x = rc + bankSide * rw;
      a.yaw = Math.atan2(a.homeX - a.x, a.homeZ - a.z);
    }

    const groundY = groundHeightAt(a.x, a.z);
    const hop = a.species === 'rabbit' || a.species === 'monkey' ? Math.abs(Math.sin(a.animPhase)) * 0.35 : 0;
    a.y = groundY + hop;
  }
}

export interface WorldDynamicState {
  timeOfDayNormalized: number; // 0..1 (0.25 sunrise, 0.5 noon, 0.75 sunset, 0.0 midnight)
  weatherActive: 'clear' | 'fog' | 'rain';
  weatherTimer: number;
  rainIntensity: number; // 0..1
  fogDensityScale: number; // 0..1
  thunderFlash: number; // 0..1
}

export function createWorldDynamicState(timePreset: TimeOfDayPreset, weatherPreset: WeatherPreset): WorldDynamicState {
  const initialTime =
    timePreset === 'sunrise' ? 0.25 :
    timePreset === 'sunset' ? 0.75 :
    timePreset === 'night' ? 0.04 : 0.48;
  const initialWeather: 'clear' | 'fog' | 'rain' =
    weatherPreset === 'rain' ? 'rain' :
    weatherPreset === 'fog' ? 'fog' : 'clear';

  return {
    timeOfDayNormalized: initialTime,
    weatherActive: initialWeather,
    weatherTimer: 45,
    rainIntensity: initialWeather === 'rain' ? 1 : 0,
    fogDensityScale: initialWeather === 'fog' ? 1 : initialWeather === 'rain' ? 0.55 : 0,
    thunderFlash: 0,
  };
}

export function stepWorldDynamicAI(
  world: WorldDynamicState,
  timePreset: TimeOfDayPreset,
  weatherPreset: WeatherPreset,
  dt: number,
): void {
  const clampedDt = Math.min(dt, 0.05);

  if (timePreset === 'dynamic') {
    // Full day-night cycle every ~240 seconds
    world.timeOfDayNormalized = (world.timeOfDayNormalized + clampedDt / 240) % 1;
  } else {
    const target =
      timePreset === 'sunrise' ? 0.25 :
      timePreset === 'sunset' ? 0.75 :
      timePreset === 'night' ? 0.04 : 0.48;
    world.timeOfDayNormalized = target;
  }

  if (weatherPreset === 'dynamic') {
    world.weatherTimer -= clampedDt;
    if (world.weatherTimer <= 0) {
      const nextMap: Record<'clear' | 'fog' | 'rain', 'clear' | 'fog' | 'rain'> = {
        clear: 'fog',
        fog: 'rain',
        rain: 'clear',
      };
      world.weatherActive = nextMap[world.weatherActive];
      world.weatherTimer = world.weatherActive === 'clear' ? 48 : 30;
    }
  } else {
    world.weatherActive = weatherPreset;
  }

  const targetRain = world.weatherActive === 'rain' ? 1 : 0;
  const targetFog = world.weatherActive === 'fog' ? 1 : world.weatherActive === 'rain' ? 0.55 : 0;
  world.rainIntensity += (targetRain - world.rainIntensity) * Math.min(1, clampedDt * 0.9);
  world.fogDensityScale += (targetFog - world.fogDensityScale) * Math.min(1, clampedDt * 0.9);
  world.thunderFlash = Math.max(0, world.thunderFlash - clampedDt * 2.5);
}

export function getTimeLabel(t: number): string {
  const hours24 = Math.floor(((t * 24) + 0) % 24);
  const mins = Math.floor(((t * 24) % 1) * 60);
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const h12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${h12}:${String(mins).padStart(2, '0')} ${period}`;
}

export function getWeatherDensityForBiome(biome: BiomeType): number {
  return biome === 'forest' || biome === 'mountain' ? 1.2 : 1.0;
}

export interface PedestrianAgent {
  id: string;
  x: number;
  y: number;
  z: number;
  homeX: number;
  homeZ: number;
  yaw: number;
  speedMs: number;
  walkPhase: number;
  shirtColor: number;
  pantsColor: number;
  dodgeTimer: number;
}

const PEDESTRIAN_COORDS: Array<[number, number]> = [
  [-74, 8], [-62, -9], [-88, -14], [-96, 12], [-56, -48], [-104, -48],
  [-86, 40], [-74, 66], [-94, 84], [-64, 92], [-108, 16], [-112, -74],
  [-76, -98], [72, 10], [60, -10], [86, -16], [96, 14], [56, -48],
  [104, -48], [86, 40], [74, 68], [94, 84], [64, 92], [112, -74],
  [78, -98], [108, 28],
];

const SHIRT_PALETTE = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0xec4899, 0xf8fafc, 0x8b5cf6];
const PANTS_PALETTE = [0x1e293b, 0x334155, 0x475569, 0x292524];

export function createPedestrians(): PedestrianAgent[] {
  return PEDESTRIAN_COORDS.map(([x, z], idx) => ({
    id: `ped_${idx}`,
    x,
    y: groundHeightAt(x, z),
    z,
    homeX: x,
    homeZ: z,
    yaw: (idx * 1.3) % (Math.PI * 2),
    speedMs: 1.5 + (idx % 3) * 0.35,
    walkPhase: idx * 0.8,
    shirtColor: SHIRT_PALETTE[idx % SHIRT_PALETTE.length],
    pantsColor: PANTS_PALETTE[idx % PANTS_PALETTE.length],
    dodgeTimer: 0,
  }));
}

export function stepPedestrians(
  peds: PedestrianAgent[],
  player: { x: number; z: number; speedMs: number },
  hornTriggered: boolean,
  dt: number,
): void {
  const clampedDt = Math.min(dt, 0.05);
  for (let i = 0; i < peds.length; i++) {
    const p = peds[i];
    const dx = p.x - player.x;
    const dz = p.z - player.z;
    const dist = Math.hypot(dx, dz);

    if (dist < (hornTriggered ? 24 : 11) && Math.abs(player.speedMs) > 2) {
      p.dodgeTimer = 1.8;
      p.yaw = Math.atan2(dx, dz);
    } else if (p.dodgeTimer > 0) {
      p.dodgeTimer -= clampedDt;
    }

    const activeSpeed = p.dodgeTimer > 0 ? p.speedMs * 2.7 : p.speedMs;
    p.walkPhase += clampedDt * activeSpeed * 4.2;

    if (p.dodgeTimer <= 0) {
      const homeDist = Math.hypot(p.x - p.homeX, p.z - p.homeZ);
      if (homeDist > 12) {
        const backYaw = Math.atan2(p.homeX - p.x, p.homeZ - p.z);
        p.yaw += wrapAngle(backYaw - p.yaw) * Math.min(1, clampedDt * 3);
      } else {
        p.yaw += Math.sin(p.walkPhase * 0.08 + i) * 0.5 * clampedDt;
      }
    }

    p.x += Math.sin(p.yaw) * activeSpeed * clampedDt;
    p.z += Math.cos(p.yaw) * activeSpeed * clampedDt;
    const rc = riverCenterX(p.z);
    const rw = riverHalfWidth(p.z) + 3.0;
    const onBridgeStrip = Math.abs(p.z) < 4.5 || Math.abs(p.z + 115) < 4.5;
    if (!onBridgeStrip && Math.abs(p.x - rc) < rw) {
      const bankSide = p.homeX >= rc ? 1 : -1;
      p.x = rc + bankSide * rw;
      p.yaw = Math.atan2(p.homeX - p.x, p.homeZ - p.z);
    }
    p.y = groundHeightAt(p.x, p.z);
  }
}

export interface AircraftAgent {
  id: string;
  kind: 'jet' | 'helicopter';
  x: number;
  y: number;
  z: number;
  yaw: number;
  bank: number;
  rotorAngle: number;
  orbitAngle: number;
  orbitRadiusX: number;
  orbitRadiusZ: number;
  altitude: number;
  angularSpeed: number;
  centerX: number;
  centerZ: number;
}

export function createAircraftAgents(): AircraftAgent[] {
  return [
    {
      id: 'jet_1',
      kind: 'jet',
      x: 0,
      y: 72,
      z: 0,
      yaw: 0,
      bank: 0.25,
      rotorAngle: 0,
      orbitAngle: 0.2,
      orbitRadiusX: 155,
      orbitRadiusZ: 120,
      altitude: 72,
      angularSpeed: 0.24,
      centerX: 0,
      centerZ: -20,
    },
    {
      id: 'jet_2',
      kind: 'jet',
      x: 0,
      y: 86,
      z: 0,
      yaw: 0,
      bank: -0.22,
      rotorAngle: 0,
      orbitAngle: 3.3,
      orbitRadiusX: 130,
      orbitRadiusZ: 160,
      altitude: 86,
      angularSpeed: -0.2,
      centerX: 10,
      centerZ: -10,
    },
    {
      id: 'jet_3',
      kind: 'jet',
      x: 0,
      y: 66,
      z: 0,
      yaw: 0,
      bank: 0.2,
      rotorAngle: 0,
      orbitAngle: 1.8,
      orbitRadiusX: 175,
      orbitRadiusZ: 95,
      altitude: 66,
      angularSpeed: 0.27,
      centerX: 0,
      centerZ: 10,
    },
    {
      id: 'heli_1',
      kind: 'helicopter',
      x: -75,
      y: 44,
      z: -25,
      yaw: 0,
      bank: 0.08,
      rotorAngle: 0,
      orbitAngle: 0.5,
      orbitRadiusX: 72,
      orbitRadiusZ: 55,
      altitude: 44,
      angularSpeed: 0.32,
      centerX: -68,
      centerZ: -18,
    },
    {
      id: 'heli_2',
      kind: 'helicopter',
      x: 75,
      y: 48,
      z: -30,
      yaw: 0,
      bank: -0.08,
      rotorAngle: 0,
      orbitAngle: 2.6,
      orbitRadiusX: 76,
      orbitRadiusZ: 58,
      altitude: 48,
      angularSpeed: -0.28,
      centerX: 72,
      centerZ: -22,
    },
  ];
}

export function stepAircraftAgents(aircraft: AircraftAgent[], dt: number): void {
  const clampedDt = Math.min(dt, 0.05);
  for (const a of aircraft) {
    a.orbitAngle += a.angularSpeed * clampedDt;
    const prevX = a.x;
    const prevZ = a.z;
    a.x = a.centerX + Math.cos(a.orbitAngle) * a.orbitRadiusX;
    a.z = a.centerZ + Math.sin(a.orbitAngle) * a.orbitRadiusZ;
    a.y = a.altitude + Math.sin(a.orbitAngle * 2) * (a.kind === 'jet' ? 4.5 : 2.2);

    const dx = a.x - prevX;
    const dz = a.z - prevZ;
    if (Math.hypot(dx, dz) > 0.001) {
      a.yaw = Math.atan2(dx, dz);
    }
    a.bank = a.angularSpeed > 0 ? -0.28 : 0.28;
    if (a.kind === 'helicopter') {
      a.bank *= 0.45;
      a.rotorAngle += 22 * clampedDt;
    }
  }
}

export interface SuperheroAgent {
  id: string;
  hero: 'flash' | 'superman';
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  speedMs: number;
  animPhase: number;
  waypointIdx: number;
  orbitTime: number;
}

const FLASH_ROUTE: Point2D[] = [
  { x: -90, z: 0 },
  { x: 0, z: 0 },
  { x: 90, z: 0 },
  { x: 90, z: -58 },
  { x: 108, z: -115 },
  { x: 0, z: -115 },
  { x: -90, z: -115 },
  { x: -90, z: -58 },
];

export function createSuperheroAgents(): SuperheroAgent[] {
  return [
    {
      id: 'hero_flash',
      hero: 'flash',
      x: -55,
      y: groundHeightAt(-55, 0),
      z: 0,
      yaw: Math.PI / 2,
      pitch: 0,
      speedMs: 52,
      animPhase: 0,
      waypointIdx: 1,
      orbitTime: 0,
    },
    {
      id: 'hero_superman',
      hero: 'superman',
      x: 15,
      y: 26,
      z: -12,
      yaw: 0,
      pitch: -1.1,
      speedMs: 36,
      animPhase: 0,
      waypointIdx: 0,
      orbitTime: 0,
    },
  ];
}

export function stepSuperheroAgents(heroes: SuperheroAgent[], dt: number): void {
  const clampedDt = Math.min(dt, 0.05);
  for (const h of heroes) {
    h.orbitTime += clampedDt;
    if (h.hero === 'flash') {
      const wp = FLASH_ROUTE[h.waypointIdx];
      const dx = wp.x - h.x;
      const dz = wp.z - h.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 6) {
        h.waypointIdx = (h.waypointIdx + 1) % FLASH_ROUTE.length;
      }
      const targetYaw = Math.atan2(dx, dz);
      h.yaw += wrapAngle(targetYaw - h.yaw) * Math.min(1, clampedDt * 12);
      h.x += Math.sin(h.yaw) * h.speedMs * clampedDt;
      h.z += Math.cos(h.yaw) * h.speedMs * clampedDt;
      h.y = groundHeightAt(h.x, h.z);
      h.animPhase += clampedDt * 24;
      h.pitch = 0.25; // Forward sprint lean
    } else {
      // Superman dramatic low-skyline flight sweeping over bridges, avenues & skyscrapers
      const t = h.orbitTime * 0.48;
      const nextX = Math.sin(t) * 98;
      const nextZ = Math.sin(t * 2) * 52 - 14;
      const nextY = 14 + Math.cos(t * 2) * 7.5;
      const dx = nextX - h.x;
      const dy = nextY - h.y;
      const dz = nextZ - h.z;
      h.yaw = Math.atan2(dx, dz);
      h.pitch = -Math.PI * 0.42 + Math.atan2(dy, Math.max(1, Math.hypot(dx, dz))) * 0.65;
      h.x = nextX;
      h.y = nextY;
      h.z = nextZ;
      h.animPhase += clampedDt * 8;
    }
  }
}

export interface PoliceAgent {
  id: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  speedMs: number;
  waypointIdx: number;
  chasing: boolean;
  sirenActive: boolean;
  wheelRotation: number;
  ramCooldown: number;
}

const POLICE_PATROL_ROUTE: Point2D[] = [
  { x: -96, z: 0 },
  { x: -48, z: 0 },
  { x: 48, z: 0 },
  { x: 96, z: 0 },
  { x: 96, z: 86 },
  { x: 48, z: 86 },
  { x: -48, z: 86 },
  { x: -96, z: 86 },
  { x: -96, z: -58 },
  { x: -48, z: -115 },
  { x: 48, z: -115 },
  { x: 96, z: -58 },
];

export function createPoliceAgents(count = 5): PoliceAgent[] {
  const agents: PoliceAgent[] = [];
  for (let i = 0; i < count; i++) {
    const wpIdx = (i * 2 + 2) % POLICE_PATROL_ROUTE.length;
    const wp = POLICE_PATROL_ROUTE[wpIdx];
    const next = POLICE_PATROL_ROUTE[(wpIdx + 1) % POLICE_PATROL_ROUTE.length];
    agents.push({
      id: `police_${i}`,
      x: wp.x,
      y: groundHeightAt(wp.x, wp.z),
      z: wp.z,
      yaw: Math.atan2(next.x - wp.x, next.z - wp.z),
      speedMs: 14,
      waypointIdx: (wpIdx + 1) % POLICE_PATROL_ROUTE.length,
      chasing: false,
      sirenActive: false,
      wheelRotation: 0,
      ramCooldown: 0,
    });
  }
  return agents;
}

export function stepPoliceAgents(
  police: PoliceAgent[],
  player: { x: number; z: number; yaw: number; speedMs: number },
  wantedStars: number,
  buildings: Array<{ x: number; z: number; halfW?: number; halfD?: number; radius: number }>,
  dt: number,
): void {
  const clampedDt = Math.min(dt, 0.05);
  const chaseLimit = wantedStars <= 0 ? 0 : Math.min(police.length, wantedStars + 1);

  // Sort indices by distance to player so closest cruisers engage first
  const order = police
    .map((p, idx) => ({ idx, dist: Math.hypot(p.x - player.x, p.z - player.z) }))
    .sort((a, b) => a.dist - b.dist);

  const chasingSet = new Set<number>();
  for (let k = 0; k < chaseLimit; k++) {
    chasingSet.add(order[k].idx);
  }

  for (let i = 0; i < police.length; i++) {
    const p = police[i];
    if (p.ramCooldown > 0) p.ramCooldown -= clampedDt;
    p.chasing = chasingSet.has(i);
    p.sirenActive = p.chasing;

    let tx: number;
    let tz: number;
    let targetSpeed: number;

    if (p.chasing) {
      // Intercept ahead of player slightly for dramatic GTA pit/block behavior
      const lead = Math.min(12, Math.abs(player.speedMs) * 0.45);
      tx = player.x + Math.sin(player.yaw) * lead;
      tz = player.z + Math.cos(player.yaw) * lead;
      targetSpeed = 24 + wantedStars * 4.2;

      // Stay on river crossings if on opposite bank from player
      const pBank = Math.sign(p.x - riverCenterX(p.z));
      const plBank = Math.sign(player.x - riverCenterX(player.z));
      if (pBank !== plBank && Math.abs(p.x - riverCenterX(p.z)) > 22 && Math.abs(player.x - riverCenterX(player.z)) > 22) {
        // Route to nearest bridge Z (-115, 0, or 86)
        const bridges = [-115, 0, 86];
        let bestBz = 0;
        let bestDist = Infinity;
        for (const bz of bridges) {
          const d = Math.abs(p.z - bz) + Math.abs(player.z - bz) * 0.35;
          if (d < bestDist) {
            bestDist = d;
            bestBz = bz;
          }
        }
        if (Math.abs(p.z - bestBz) > 9) {
          tx = pBank * 46;
          tz = bestBz;
        } else {
          tx = -pBank * 46;
          tz = bestBz;
        }
      }
    } else {
      const wp = POLICE_PATROL_ROUTE[p.waypointIdx];
      tx = wp.x;
      tz = wp.z;
      if (Math.hypot(tx - p.x, tz - p.z) < 9) {
        p.waypointIdx = (p.waypointIdx + 1) % POLICE_PATROL_ROUTE.length;
      }
      targetSpeed = 14.5;
    }

    // Gentle building avoidance steering + separation from river outside bridges
    let avoidX = 0;
    let avoidZ = 0;
    for (const b of buildings) {
      const dx = p.x - b.x;
      const dz = p.z - b.z;
      const dist = Math.hypot(dx, dz);
      const safeR = b.radius + 3.2;
      if (dist < safeR && dist > 0.01) {
        const push = (safeR - dist) / safeR;
        avoidX += (dx / dist) * push * 18;
        avoidZ += (dz / dist) * push * 18;
      }
    }

    const desiredYaw = Math.atan2(tx - p.x + avoidX, tz - p.z + avoidZ);
    const diff = wrapAngle(desiredYaw - p.yaw);
    const maxTurn = (p.chasing ? 3.2 : 2.1) * clampedDt;
    p.yaw += Math.max(-maxTurn, Math.min(maxTurn, diff));

    const distToPlayer = Math.hypot(player.x - p.x, player.z - p.z);
    if (p.chasing && distToPlayer < 7.5 && Math.abs(player.speedMs) < 5) {
      targetSpeed = 10; // Hold close to box player in
    }

    const accel = targetSpeed > p.speedMs ? 11.5 : 15.0;
    p.speedMs += Math.sign(targetSpeed - p.speedMs) * Math.min(Math.abs(targetSpeed - p.speedMs), accel * clampedDt);

    p.x += Math.sin(p.yaw) * p.speedMs * clampedDt;
    p.z += Math.cos(p.yaw) * p.speedMs * clampedDt;

    // Keep police out of deep river outside bridge decks
    const rc = riverCenterX(p.z);
    const rw = riverHalfWidth(p.z) + 2.5;
    const onBridgeStrip = Math.abs(p.z) < 5.5 || Math.abs(p.z + 115) < 4.5 || Math.abs(p.z - 86) < 4.8;
    if (!onBridgeStrip && Math.abs(p.x - rc) < rw) {
      p.x = rc + (p.x >= rc ? 1 : -1) * rw;
    }

    p.y = groundHeightAt(p.x, p.z);
    p.wheelRotation += (p.speedMs / 0.36) * clampedDt;
  }
}

export interface WantedState {
  stars: number; // 0..5
  heat: number; // 0..100
  evadeTimer: number;
  bustedTimer: number; // 0..2.8s
  speedingCooldown: number;
}

export function createWantedState(initialStars = 0): WantedState {
  return {
    stars: Math.max(0, Math.min(5, initialStars)),
    heat: initialStars * 20,
    evadeTimer: initialStars > 0 ? 10 : 0,
    bustedTimer: 0,
    speedingCooldown: 0,
  };
}

export function addWantedHeat(wanted: WantedState, amount: number): { starIncreased: boolean; newStars: number } {
  const prevStars = wanted.stars;
  wanted.heat = Math.min(100, wanted.heat + amount);
  const computed = wanted.heat <= 0 ? 0 : Math.min(5, Math.max(1, Math.ceil(wanted.heat / 20)));
  if (computed > wanted.stars) {
    wanted.stars = computed;
  }
  wanted.evadeTimer = 10.5;
  return { starIncreased: wanted.stars > prevStars, newStars: wanted.stars };
}

export function stepWantedSystem(
  wanted: WantedState,
  nearestPoliceDist: number,
  playerSpeedKmh: number,
  inRepairBay: boolean,
  dt: number,
): { evaded: boolean; busted: boolean } {
  const clampedDt = Math.min(dt, 0.05);
  if (wanted.speedingCooldown > 0) wanted.speedingCooldown -= clampedDt;

  // Pay 'n' Spray instantly clears wanted level
  if (inRepairBay && wanted.stars > 0) {
    wanted.stars = 0;
    wanted.heat = 0;
    wanted.evadeTimer = 0;
    wanted.bustedTimer = 0;
    return { evaded: true, busted: false };
  }

  // Trigger 1★ if blasting past a police cruiser above 115 km/h
  if (nearestPoliceDist < 22 && playerSpeedKmh > 115 && wanted.speedingCooldown <= 0) {
    wanted.speedingCooldown = 3.5;
    addWantedHeat(wanted, 22);
  }

  if (wanted.stars <= 0) {
    wanted.bustedTimer = 0;
    return { evaded: false, busted: false };
  }

  // Check if boxed in / arrested by police
  if (nearestPoliceDist < 10.5 && playerSpeedKmh < 9) {
    wanted.bustedTimer += clampedDt;
    wanted.evadeTimer = 10.5;
    if (wanted.bustedTimer >= 2.8) {
      return { evaded: false, busted: true };
    }
  } else {
    wanted.bustedTimer = Math.max(0, wanted.bustedTimer - clampedDt * 1.8);
  }

  // Cool down wanted level if out of police radius
  if (nearestPoliceDist > 46) {
    wanted.evadeTimer -= clampedDt;
    if (wanted.evadeTimer <= 0) {
      wanted.stars = 0;
      wanted.heat = 0;
      wanted.bustedTimer = 0;
      return { evaded: true, busted: false };
    }
  } else {
    wanted.evadeTimer = Math.min(10.5, wanted.evadeTimer + clampedDt * 0.6);
  }

  return { evaded: false, busted: false };
}

