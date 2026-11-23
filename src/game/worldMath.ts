import { BiomeType, CollectibleRingSpec, GameModeId, ObstacleSpec, StuntRampSpec, SurfaceType } from './types';

export const WORLD_RADIUS = 250;
export const WATER_Y = -1.6;
export const MAIN_BRIDGE_Y = 2.85;
export const NORTH_BRIDGE_Y = 2.45;
export const SOUTH_BRIDGE_Y = 2.35;

export interface Point2D {
  x: number;
  z: number;
}

export interface RoadPolyline {
  id: string;
  surface: 'asphalt' | 'dirt';
  halfWidth: number;
  closed: boolean;
  points: Point2D[];
}

export const MAIN_HIGHWAY_LOOP: Point2D[] = [
  { x: -108, z: 0 },
  { x: -42, z: 0 },
  { x: 42, z: 0 },
  { x: 108, z: 0 },
  { x: 132, z: -38 },
  { x: 130, z: -84 },
  { x: 108, z: -115 },
  { x: 38, z: -115 },
  { x: -38, z: -115 },
  { x: -108, z: -115 },
  { x: -132, z: -84 },
  { x: -134, z: -38 },
];

// Full dense GTA-style city street grid across West & East Banks
export const CITY_WEST_WATERFRONT_AVE: Point2D[] = [
  { x: -48, z: -140 },
  { x: -48, z: 115 },
];

export const CITY_WEST_MID_AVE: Point2D[] = [
  { x: -72, z: -140 },
  { x: -72, z: 115 },
];

export const WEST_AVENUE: Point2D[] = [
  { x: -96, z: -140 },
  { x: -96, z: 0 },
  { x: -96, z: 115 },
];

export const CITY_WEST_OUTER_AVE: Point2D[] = [
  { x: -122, z: -140 },
  { x: -122, z: 115 },
];

export const CITY_WEST_RING_AVE: Point2D[] = [
  { x: -148, z: -120 },
  { x: -148, z: 96 },
];

export const CITY_EAST_WATERFRONT_AVE: Point2D[] = [
  { x: 48, z: -140 },
  { x: 48, z: 115 },
];

export const CITY_EAST_MID_AVE: Point2D[] = [
  { x: 72, z: -140 },
  { x: 72, z: 115 },
];

export const EAST_AVENUE: Point2D[] = [
  { x: 96, z: -140 },
  { x: 96, z: 0 },
  { x: 96, z: 115 },
];

export const CITY_EAST_OUTER_AVE: Point2D[] = [
  { x: 122, z: -140 },
  { x: 122, z: 115 },
];

export const CITY_EAST_RING_AVE: Point2D[] = [
  { x: 148, z: -120 },
  { x: 148, z: 96 },
];

// East-West City Cross Streets (every ~28m across Downtown)
export const CITY_NORTH_BLVD: Point2D[] = [
  { x: -135, z: -140 },
  { x: -48, z: -140 },
];
export const CITY_EAST_NORTH_BLVD: Point2D[] = [
  { x: 48, z: -140 },
  { x: 135, z: -140 },
];

export const CITY_WEST_86_ST: Point2D[] = [
  { x: -148, z: -86 },
  { x: -48, z: -86 },
];
export const CITY_EAST_86_ST: Point2D[] = [
  { x: 48, z: -86 },
  { x: 148, z: -86 },
];

export const WEST_CROSS_NORTH: Point2D[] = [
  { x: -148, z: -58 },
  { x: -48, z: -58 },
];
export const EAST_CROSS_NORTH: Point2D[] = [
  { x: 48, z: -58 },
  { x: 148, z: -58 },
];

export const CITY_WEST_28_ST: Point2D[] = [
  { x: -148, z: -28 },
  { x: -48, z: -28 },
];
export const CITY_EAST_28_ST: Point2D[] = [
  { x: 48, z: -28 },
  { x: 148, z: -28 },
];

export const CITY_WEST_28_SOUTH_ST: Point2D[] = [
  { x: -148, z: 28 },
  { x: -48, z: 28 },
];
export const CITY_EAST_28_SOUTH_ST: Point2D[] = [
  { x: 48, z: 28 },
  { x: 148, z: 28 },
];

export const WEST_CROSS_SOUTH: Point2D[] = [
  { x: -148, z: 56 },
  { x: -48, z: 56 },
];
export const EAST_CROSS_SOUTH: Point2D[] = [
  { x: 48, z: 56 },
  { x: 148, z: 56 },
];

// 3rd Cross-River Metro Boulevard & South Metro Bridge (z = 86)
export const SOUTH_METRO_CROSS_BOULEVARD: Point2D[] = [
  { x: -148, z: 86 },
  { x: -42, z: 86 },
  { x: 42, z: 86 },
  { x: 148, z: 86 },
];

export const CITY_SOUTH_WEST_115_ST: Point2D[] = [
  { x: -130, z: 115 },
  { x: -48, z: 115 },
];
export const CITY_SOUTH_EAST_115_ST: Point2D[] = [
  { x: 48, z: 115 },
  { x: 130, z: 115 },
];

// Connect West & East Bank outer avenues to bridge approaches
export const CITY_WEST_GRAND_APPROACH: Point2D[] = [
  { x: -148, z: 0 },
  { x: -108, z: 0 },
];
export const CITY_EAST_GRAND_APPROACH: Point2D[] = [
  { x: 108, z: 0 },
  { x: 148, z: 0 },
];

export const SOUTH_VILLAGE_LOOP: Point2D[] = [
  { x: -108, z: 0 },
  { x: -118, z: 48 },
  { x: -96, z: 95 },
  { x: -56, z: 115 },
  { x: -24, z: 106 },
];

export const EAST_VILLAGE_LOOP: Point2D[] = [
  { x: 108, z: 0 },
  { x: 118, z: 48 },
  { x: 96, z: 95 },
  { x: 56, z: 115 },
  { x: 24, z: 106 },
];

export const OFFROAD_SOUTH_TRAIL: Point2D[] = [
  { x: -56, z: 115 },
  { x: -30, z: 142 },
  { x: 0, z: 148 },
  { x: 32, z: 140 },
  { x: 56, z: 115 },
];

export const OFFROAD_NORTH_RIDGE: Point2D[] = [
  { x: -108, z: -115 },
  { x: -148, z: -158 },
  { x: -85, z: -182 },
  { x: 0, z: -176 },
  { x: 85, z: -182 },
  { x: 148, z: -158 },
  { x: 108, z: -115 },
];

export const ROAD_NETWORK: RoadPolyline[] = [
  { id: 'main_highway', surface: 'asphalt', halfWidth: 6.2, closed: true, points: MAIN_HIGHWAY_LOOP },
  { id: 'south_metro_blvd', surface: 'asphalt', halfWidth: 5.4, closed: false, points: SOUTH_METRO_CROSS_BOULEVARD },
  { id: 'west_waterfront_ave', surface: 'asphalt', halfWidth: 4.8, closed: false, points: CITY_WEST_WATERFRONT_AVE },
  { id: 'west_mid_ave', surface: 'asphalt', halfWidth: 4.8, closed: false, points: CITY_WEST_MID_AVE },
  { id: 'west_avenue', surface: 'asphalt', halfWidth: 5.2, closed: false, points: WEST_AVENUE },
  { id: 'west_outer_ave', surface: 'asphalt', halfWidth: 4.8, closed: false, points: CITY_WEST_OUTER_AVE },
  { id: 'west_ring_ave', surface: 'asphalt', halfWidth: 4.6, closed: false, points: CITY_WEST_RING_AVE },
  { id: 'east_waterfront_ave', surface: 'asphalt', halfWidth: 4.8, closed: false, points: CITY_EAST_WATERFRONT_AVE },
  { id: 'east_mid_ave', surface: 'asphalt', halfWidth: 4.8, closed: false, points: CITY_EAST_MID_AVE },
  { id: 'east_avenue', surface: 'asphalt', halfWidth: 5.2, closed: false, points: EAST_AVENUE },
  { id: 'east_outer_ave', surface: 'asphalt', halfWidth: 4.8, closed: false, points: CITY_EAST_OUTER_AVE },
  { id: 'east_ring_ave', surface: 'asphalt', halfWidth: 4.6, closed: false, points: CITY_EAST_RING_AVE },
  { id: 'west_north_blvd', surface: 'asphalt', halfWidth: 4.6, closed: false, points: CITY_NORTH_BLVD },
  { id: 'east_north_blvd', surface: 'asphalt', halfWidth: 4.6, closed: false, points: CITY_EAST_NORTH_BLVD },
  { id: 'west_86_st', surface: 'asphalt', halfWidth: 4.5, closed: false, points: CITY_WEST_86_ST },
  { id: 'east_86_st', surface: 'asphalt', halfWidth: 4.5, closed: false, points: CITY_EAST_86_ST },
  { id: 'west_cross_north', surface: 'asphalt', halfWidth: 4.8, closed: false, points: WEST_CROSS_NORTH },
  { id: 'east_cross_north', surface: 'asphalt', halfWidth: 4.8, closed: false, points: EAST_CROSS_NORTH },
  { id: 'west_28_st', surface: 'asphalt', halfWidth: 4.5, closed: false, points: CITY_WEST_28_ST },
  { id: 'east_28_st', surface: 'asphalt', halfWidth: 4.5, closed: false, points: CITY_EAST_28_ST },
  { id: 'west_28_south_st', surface: 'asphalt', halfWidth: 4.5, closed: false, points: CITY_WEST_28_SOUTH_ST },
  { id: 'east_28_south_st', surface: 'asphalt', halfWidth: 4.5, closed: false, points: CITY_EAST_28_SOUTH_ST },
  { id: 'west_cross_south', surface: 'asphalt', halfWidth: 4.8, closed: false, points: WEST_CROSS_SOUTH },
  { id: 'east_cross_south', surface: 'asphalt', halfWidth: 4.8, closed: false, points: EAST_CROSS_SOUTH },
  { id: 'west_115_st', surface: 'asphalt', halfWidth: 4.5, closed: false, points: CITY_SOUTH_WEST_115_ST },
  { id: 'east_115_st', surface: 'asphalt', halfWidth: 4.5, closed: false, points: CITY_SOUTH_EAST_115_ST },
  { id: 'west_grand_approach', surface: 'asphalt', halfWidth: 5.2, closed: false, points: CITY_WEST_GRAND_APPROACH },
  { id: 'east_grand_approach', surface: 'asphalt', halfWidth: 5.2, closed: false, points: CITY_EAST_GRAND_APPROACH },
  { id: 'south_village', surface: 'asphalt', halfWidth: 4.6, closed: false, points: SOUTH_VILLAGE_LOOP },
  { id: 'east_village', surface: 'asphalt', halfWidth: 4.6, closed: false, points: EAST_VILLAGE_LOOP },
  { id: 'offroad_south', surface: 'dirt', halfWidth: 4.4, closed: false, points: OFFROAD_SOUTH_TRAIL },
  { id: 'offroad_north', surface: 'dirt', halfWidth: 4.4, closed: false, points: OFFROAD_NORTH_RIDGE },
];

export const CITY_INTERSECTIONS: Point2D[] = (() => {
  const xs = [-148, -122, -96, -72, -48, 48, 72, 96, 122, 148];
  const zs = [-115, -86, -58, -28, 0, 28, 56, 86, 115];
  const pts: Point2D[] = [];
  for (const x of xs) {
    for (const z of zs) {
      if (Math.abs(x) === 148 && (z === -115 || z === 115)) continue;
      pts.push({ x, z });
    }
  }
  return pts;
})();

export const VILLAGE_CENTERS = [
  { name: 'West Metro Commons', x: -84, z: 100, radius: 22 },
  { name: 'East Harbor Commons', x: 84, z: 100, radius: 22 },
];

export const FUEL_STATIONS = [
  { name: "Pay 'n' Spray · East Harbor", x: 84, z: 14, radius: 8.5 },
  { name: "Pay 'n' Spray · West Midtown", x: -84, z: 42, radius: 8.5 },
];

export function riverCenterX(z: number): number {
  return Math.sin(z * 0.014) * 20;
}

export function riverHalfWidth(z: number): number {
  return 16.5 + Math.sin(z * 0.032 + 0.8) * 2.8;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export function distToSegmentSq(px: number, pz: number, ax: number, az: number, bx: number, bz: number): { distSq: number; t: number } {
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  if (lenSq < 1e-6) {
    const ex = px - ax;
    const ez = pz - az;
    return { distSq: ex * ex + ez * ez, t: 0 };
  }
  const t = clamp01(((px - ax) * dx + (pz - az) * dz) / lenSq);
  const cx = ax + dx * t;
  const cz = az + dz * t;
  const ex = px - cx;
  const ez = pz - cz;
  return { distSq: ex * ex + ez * ez, t };
}

export function distanceToRoad(x: number, z: number): { dist: number; surface: 'asphalt' | 'dirt'; roadId: string } {
  let minDistSq = Infinity;
  let bestSurface: 'asphalt' | 'dirt' = 'asphalt';
  let bestId = 'main_highway';

  for (const road of ROAD_NETWORK) {
    const pts = road.points;
    const count = road.closed ? pts.length : pts.length - 1;
    for (let i = 0; i < count; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const { distSq } = distToSegmentSq(x, z, a.x, a.z, b.x, b.z);
      const normalized = distSq / (road.halfWidth * road.halfWidth);
      const bestNorm = minDistSq === Infinity ? Infinity : minDistSq;
      if (normalized < 1 && distSq < bestNorm) {
        minDistSq = distSq;
        bestSurface = road.surface;
        bestId = road.id;
      } else if (minDistSq === Infinity || (distSq < minDistSq && normalized >= 1)) {
        if (bestNorm >= 1 || distSq < minDistSq) {
          if (bestSurface === road.surface || distSq < minDistSq) {
            minDistSq = distSq;
            bestSurface = road.surface;
            bestId = road.id;
          }
        }
      }
    }
  }

  return { dist: Math.sqrt(minDistSq), surface: bestSurface, roadId: bestId };
}

export function isOnMainBridgeDeck(x: number, z: number): boolean {
  return Math.abs(z) <= 5.8 && Math.abs(x) <= 74;
}

export function isOnNorthBridgeDeck(x: number, z: number): boolean {
  return Math.abs(z + 115) <= 4.8 && Math.abs(x) <= 64;
}

export function isOnSouthBridgeDeck(x: number, z: number): boolean {
  return Math.abs(z - 86) <= 5.2 && Math.abs(x) <= 64;
}

function bridgeElevationAt(x: number, spanHalf: number, rampEnd: number, deckY: number, baseGroundY: number): number {
  const ax = Math.abs(x);
  if (ax <= spanHalf) {
    const arch = Math.cos((ax / spanHalf) * (Math.PI * 0.5)) * 0.45;
    return deckY + arch;
  }
  const t = 1 - smoothstep(spanHalf, rampEnd, ax);
  return baseGroundY + (deckY - baseGroundY) * t;
}

export function rawTerrainHeightAt(x: number, z: number): number {
  // Base rolling meadows & hills
  const n1 = Math.sin(x * 0.022) * Math.cos(z * 0.021) * 2.1;
  const n2 = Math.sin(x * 0.055 + 1.4) * Math.sin(z * 0.048 - 0.7) * 0.65;
  let h = 0.4 + n1 + n2;

  // Northern highland ridge elevation
  if (z < -148) {
    const ridgeFactor = smoothstep(-148, -205, z);
    h += ridgeFactor * (5.5 + Math.sin(x * 0.04) * 2.2);
  }

  // Outer mountain ring
  const distFromCenter = Math.hypot(x, z);
  if (distFromCenter > 180) {
    const mFactor = smoothstep(180, 258, distFromCenter);
    const ridgeNoise = 0.65 + 0.35 * Math.sin(Math.atan2(z, x) * 7.0 + distFromCenter * 0.04);
    h += mFactor * mFactor * 38.0 * ridgeNoise;
  }

  // Flatten the urban city basin smoothly so all streets & blocks sit flush
  if (Math.abs(x) >= 24 && Math.abs(x) <= 165 && z >= -146 && z <= 122) {
    const edgeX = 1 - smoothstep(150, 165, Math.abs(x));
    const edgeZ = z < -130 ? 1 - smoothstep(-130, -146, z) : z > 106 ? 1 - smoothstep(106, 122, z) : 1;
    const urbanFactor = edgeX * edgeZ;
    h = h * (1 - urbanFactor * 0.92) + 0.45 * (urbanFactor * 0.92);
  }

  // Flatten highway & village zones smoothly
  const roadInfo = distanceToRoad(x, z);
  const roadHalf = roadInfo.surface === 'asphalt' ? 7.5 : 5.5;
  const roadFlatten = 1 - smoothstep(roadHalf, roadHalf + 11, roadInfo.dist);
  const targetRoadY = z < -145 ? 2.8 + smoothstep(-145, -185, z) * 3.5 : 0.45;
  h = h * (1 - roadFlatten * 0.88) + targetRoadY * (roadFlatten * 0.88);

  // Carve river channel
  const rDist = Math.abs(x - riverCenterX(z));
  const rHalf = riverHalfWidth(z);
  if (rDist < rHalf + 14) {
    const bankFactor = 1 - smoothstep(rHalf - 4, rHalf + 14, rDist);
    const isSouthFord = Math.abs(z - 148) < 9;
    const bedDepth = isSouthFord ? WATER_Y - 0.18 : WATER_Y - 2.3;
    h = h * (1 - bankFactor) + bedDepth * bankFactor;
  }

  return h;
}

export function groundHeightAt(x: number, z: number): number {
  const base = rawTerrainHeightAt(x, z);
  if (isOnMainBridgeDeck(x, z)) {
    const deck = bridgeElevationAt(x, 42, 74, MAIN_BRIDGE_Y, Math.max(0.45, base));
    return Math.max(base, deck);
  }
  if (isOnNorthBridgeDeck(x, z)) {
    const deck = bridgeElevationAt(x, 38, 64, NORTH_BRIDGE_Y, Math.max(0.45, base));
    return Math.max(base, deck);
  }
  if (isOnSouthBridgeDeck(x, z)) {
    const deck = bridgeElevationAt(x, 38, 64, SOUTH_BRIDGE_Y, Math.max(0.45, base));
    return Math.max(base, deck);
  }
  return base;
}

export function surfaceAt(x: number, z: number, obstacles: ObstacleSpec[] = []): SurfaceType {
  if (isOnMainBridgeDeck(x, z) && Math.abs(x) <= 44) return 'bridge';
  if (isOnNorthBridgeDeck(x, z) && Math.abs(x) <= 40) return 'bridge';
  if (isOnSouthBridgeDeck(x, z) && Math.abs(x) <= 40) return 'bridge';

  for (const obs of obstacles) {
    if (obs.kind === 'mud_pit' && Math.hypot(x - obs.x, z - obs.z) <= obs.radius) {
      return 'mud';
    }
    if (obs.kind === 'flood_zone' && Math.hypot(x - obs.x, z - obs.z) <= obs.radius) {
      return 'water';
    }
  }

  const gh = groundHeightAt(x, z);
  if (gh < WATER_Y + 0.08) {
    return 'water';
  }

  const roadInfo = distanceToRoad(x, z);
  const threshold = roadInfo.surface === 'asphalt' ? 6.4 : 4.8;
  if (roadInfo.dist <= threshold) {
    return roadInfo.surface;
  }

  return 'grass';
}

export function biomeAt(x: number, z: number): BiomeType {
  if (
    (isOnMainBridgeDeck(x, z) && Math.abs(x) <= 44) ||
    (isOnNorthBridgeDeck(x, z) && Math.abs(x) <= 40) ||
    (isOnSouthBridgeDeck(x, z) && Math.abs(x) <= 40)
  ) {
    return 'bridge';
  }
  const rDist = Math.abs(x - riverCenterX(z));
  if (rDist < riverHalfWidth(z) + 16) return 'river';
  if (Math.hypot(x, z) > 180) return 'mountain';
  const roadInfo = distanceToRoad(x, z);
  if (roadInfo.dist < 8 && roadInfo.surface === 'asphalt' && Math.abs(z) <= 5) return 'highway';
  if (Math.abs(x) >= 34 && Math.abs(x) <= 165 && z >= -150 && z <= 130) {
    return 'city';
  }
  if ((x < -45 && z < -20) || (x > 45 && z < -20)) {
    return 'forest';
  }
  return 'grassland';
}

export function getDistrictName(x: number, z: number): string {
  if (isOnMainBridgeDeck(x, z) && Math.abs(x) < 42) return 'GRAND BAY BRIDGE';
  if (isOnNorthBridgeDeck(x, z) && Math.abs(x) < 40) return 'NORTH SKYLINE BRIDGE';
  if (isOnSouthBridgeDeck(x, z) && Math.abs(x) < 40) return 'SOUTH HARBOR BRIDGE';
  if (Math.hypot(x, z) > 180) return 'VINEWOOD HIGHLANDS';
  if (x < -40 && z < -30) return 'WEST FINANCIAL DISTRICT';
  if (x < -40 && z <= 55) return 'WEST MIDTOWN PLAZA';
  if (x < -40) return 'WEST HARBOR QUARTER';
  if (x > 40 && z < -30) return 'EAST DOWNTOWN CORE';
  if (x > 40 && z <= 55) return 'EAST GRAND AVENUE';
  if (x > 40) return 'EAST BAYFRONT';
  return 'RIVERSIDE EXPRESSWAY';
}

export function getObstaclesForMode(mode: GameModeId): ObstacleSpec[] {
  const base: ObstacleSpec[] = [
    { id: 'ft_1', kind: 'fallen_tree', x: -136, z: -158, radius: 2.3, rotation: 0.4, solid: true, slowFactor: 0.6, bumpIntensity: 0.5 },
    { id: 'ft_2', kind: 'fallen_tree', x: 136, z: -158, radius: 2.3, rotation: -0.5, solid: true, slowFactor: 0.6, bumpIntensity: 0.5 },
    { id: 'rk_1', kind: 'boulder', x: -18, z: -172, radius: 2.0, rotation: 0.2, solid: true, slowFactor: 0.5, bumpIntensity: 0.7 },
    { id: 'rk_2', kind: 'boulder', x: 52, z: -176, radius: 2.2, rotation: 1.1, solid: true, slowFactor: 0.5, bumpIntensity: 0.7 },
    { id: 'cn_1', kind: 'construction', x: 108, z: -115, radius: 2.0, rotation: 0.15, solid: true, slowFactor: 0.7, bumpIntensity: 0.4 },
    { id: 'ab_1', kind: 'abandoned_car', x: -108, z: -115, radius: 2.1, rotation: 0.3, solid: true, slowFactor: 0.7, bumpIntensity: 0.5 },
    { id: 'md_1', kind: 'mud_pit', x: -32, z: 138, radius: 6.2, rotation: 0, solid: false, slowFactor: 0.52, bumpIntensity: 0.35 },
    { id: 'md_2', kind: 'mud_pit', x: 35, z: 136, radius: 5.8, rotation: 0.4, solid: false, slowFactor: 0.52, bumpIntensity: 0.35 },
    { id: 'fl_1', kind: 'flood_zone', x: 0, z: 148, radius: 9.5, rotation: 0, solid: false, slowFactor: 0.58, bumpIntensity: 0.25 },
    { id: 'ph_1', kind: 'pothole', x: 128, z: -14, radius: 2.4, rotation: 0, solid: false, slowFactor: 0.85, bumpIntensity: 0.9 },
    { id: 'ph_2', kind: 'pothole', x: -130, z: -14, radius: 2.4, rotation: 0, solid: false, slowFactor: 0.85, bumpIntensity: 0.9 },
  ];

  if (mode === 'bridge') {
    base.push(
      { id: 'br_1', kind: 'barrier', x: -24, z: -2.2, y: MAIN_BRIDGE_Y + 0.3, radius: 1.7, rotation: 0, solid: true, slowFactor: 0.7, bumpIntensity: 0.5, bridgeOnly: true },
      { id: 'br_2', kind: 'construction', x: -4, z: 2.4, y: MAIN_BRIDGE_Y + 0.45, radius: 1.8, rotation: 0.2, solid: true, slowFactor: 0.7, bumpIntensity: 0.5, bridgeOnly: true },
      { id: 'br_3', kind: 'abandoned_car', x: 18, z: -2.0, y: MAIN_BRIDGE_Y + 0.3, radius: 2.1, rotation: -0.15, solid: true, slowFactor: 0.7, bumpIntensity: 0.5, bridgeOnly: true },
      { id: 'br_4', kind: 'barrier', x: 20, z: -113.0, y: NORTH_BRIDGE_Y + 0.3, radius: 1.7, rotation: 0, solid: true, slowFactor: 0.7, bumpIntensity: 0.5, bridgeOnly: true },
      { id: 'br_5', kind: 'boulder', x: -4, z: -116.8, y: NORTH_BRIDGE_Y + 0.45, radius: 1.6, rotation: 0.5, solid: true, slowFactor: 0.7, bumpIntensity: 0.6, bridgeOnly: true },
      { id: 'br_6', kind: 'construction', x: -24, z: -113.2, y: NORTH_BRIDGE_Y + 0.3, radius: 1.7, rotation: -0.2, solid: true, slowFactor: 0.7, bumpIntensity: 0.5, bridgeOnly: true },
    );
  }

  return base;
}

export function getSpawnForMode(mode: GameModeId): { x: number; z: number; yaw: number } {
  switch (mode) {
    case 'bridge':
      return { x: -72, z: 1.5, yaw: Math.PI / 2 };
    case 'offroad':
      return { x: -56, z: 115, yaw: Math.PI * 0.32 };
    case 'race':
      return { x: -86, z: 2.2, yaw: Math.PI / 2 };
    case 'wildlife':
      return { x: -96, z: -146, yaw: 0.1 };
    case 'stunt':
      return { x: -48, z: -46, yaw: 0 };
    case 'gta':
      return { x: -72, z: 0, yaw: Math.PI / 2 };
    case 'mission':
      return { x: -78, z: 1.8, yaw: Math.PI / 2 };
    case 'free':
    default:
      return { x: -68, z: 2.2, yaw: Math.PI / 2 };
  }
}

export interface CheckpointGoal {
  x: number;
  z: number;
  label: string;
  radius: number;
}

export function getCheckpointsForMode(mode: GameModeId): CheckpointGoal[] {
  if (mode === 'mission') {
    return [
      { x: 48, z: 0, label: 'Cross Grand Bay Bridge', radius: 11 },
      { x: 96, z: 86, label: 'Deliver Package · South East Harbor', radius: 13 },
      { x: 96, z: -115, label: 'Ascend East Downtown Boulevard', radius: 11 },
      { x: -48, z: -115, label: 'Cross North Skyline Bridge', radius: 11 },
      { x: -72, z: 86, label: 'Return to West Harbor Plaza', radius: 14 },
    ];
  }
  if (mode === 'gta') {
    return [
      { x: 0, z: 0, label: 'Break Roadblock on Grand Bay Bridge', radius: 12 },
      { x: 96, z: -58, label: 'Shake Pursuit in East Downtown', radius: 13 },
      { x: 96, z: 86, label: 'Cross South Harbor Metro Bridge', radius: 13 },
      { x: -84, z: 42, label: "Reach West Pay 'n' Spray to Lose Heat", radius: 12 },
    ];
  }
  if (mode === 'bridge') {
    return [
      { x: 48, z: 0, label: 'Clear Grand Bay Bridge', radius: 10 },
      { x: 96, z: -115, label: 'Approach North Skyline Bridge', radius: 11 },
      { x: -48, z: -115, label: 'Clear North Skyline Bridge', radius: 10 },
      { x: -48, z: 86, label: 'Enter South Metro Bridge', radius: 11 },
      { x: 48, z: 86, label: 'Clear South Metro Bridge', radius: 11 },
    ];
  }
  if (mode === 'offroad') {
    return [
      { x: 0, z: 148, label: 'Ford the South River Crossing', radius: 11 },
      { x: 56, z: 115, label: 'Exit Muddy Parkland Trail', radius: 11 },
      { x: 108, z: -115, label: 'Reach North Ridge Trailhead', radius: 12 },
      { x: 0, z: -176, label: 'Summit Highland Ridge Pass', radius: 13 },
      { x: -108, z: -115, label: 'Descend to West Timber Road', radius: 13 },
    ];
  }
  if (mode === 'race') {
    return [
      { x: 48, z: 0, label: 'Gate 1 · Metro Bridge Straight', radius: 12 },
      { x: 122, z: -86, label: 'Gate 2 · East Downtown Sweep', radius: 13 },
      { x: 0, z: -115, label: 'Gate 3 · North Bridge Dash', radius: 12 },
      { x: -122, z: -86, label: 'Gate 4 · West Financial Hairpin', radius: 13 },
      { x: -64, z: 0, label: 'Finish Line · Grand Avenue', radius: 13 },
    ];
  }
  if (mode === 'stunt') {
    return [
      { x: -48, z: -20, label: 'West Waterfront Mega Ramp', radius: 11 },
      { x: 0, z: 0, label: 'Bridge Air Boost Checkpoint', radius: 12 },
      { x: 48, z: 16, label: 'East Harbor Stunt Launch', radius: 11 },
      { x: 96, z: -58, label: 'East Downtown Flash Intersection', radius: 12 },
      { x: -96, z: -58, label: 'West Skyline Hero Finish', radius: 13 },
    ];
  }
  return [];
}

export const CITY_STUNT_RAMPS: StuntRampSpec[] = [
  { id: 'ramp_west_waterfront', x: -48, z: -28, yaw: 0, width: 7.2, length: 12, height: 3.3 },
  { id: 'ramp_east_waterfront', x: 48, z: 26, yaw: Math.PI, width: 7.2, length: 12, height: 3.3 },
  { id: 'ramp_west_midtown', x: -96, z: -28, yaw: 0, width: 6.8, length: 11, height: 2.9 },
  { id: 'ramp_east_midtown', x: 96, z: 28, yaw: Math.PI, width: 6.8, length: 11, height: 2.9 },
];

export function getRampSupportAt(
  x: number,
  z: number,
): { onRamp: boolean; rampY: number; atLaunchLip: boolean; rampYaw: number } {
  for (const r of CITY_STUNT_RAMPS) {
    const dx = x - r.x;
    const dz = z - r.z;
    const cos = Math.cos(r.yaw);
    const sin = Math.sin(r.yaw);
    const localF = dx * sin + dz * cos;
    const localR = dx * cos - dz * sin;
    const halfW = r.width * 0.5;
    const halfL = r.length * 0.5;
    if (Math.abs(localR) <= halfW && localF >= -halfL && localF <= halfL) {
      const t = (localF + halfL) / r.length;
      const base = rawTerrainHeightAt(x, z);
      return {
        onRamp: true,
        rampY: base + t * r.height,
        atLaunchLip: t >= 0.78,
        rampYaw: r.yaw,
      };
    }
  }
  return { onRamp: false, rampY: 0, atLaunchLip: false, rampYaw: 0 };
}

export function getCollectibleRingsForMode(mode: GameModeId): CollectibleRingSpec[] {
  const rings: CollectibleRingSpec[] = [
    { id: 'ring_1', x: -48, y: rawTerrainHeightAt(-48, -18) + 4.2, z: -18, collected: false },
    { id: 'ring_2', x: 0, y: MAIN_BRIDGE_Y + 2.2, z: 0, collected: false },
    { id: 'ring_3', x: 48, y: rawTerrainHeightAt(48, 16) + 4.2, z: 16, collected: false },
    { id: 'ring_4', x: 96, y: rawTerrainHeightAt(96, -58) + 2.0, z: -58, collected: false },
    { id: 'ring_5', x: 0, y: NORTH_BRIDGE_Y + 2.2, z: -115, collected: false },
    { id: 'ring_6', x: -96, y: rawTerrainHeightAt(-96, -58) + 2.0, z: -58, collected: false },
    { id: 'ring_7', x: 0, y: SOUTH_BRIDGE_Y + 2.2, z: 86, collected: false },
    { id: 'ring_8', x: 96, y: rawTerrainHeightAt(96, 18) + 3.8, z: 18, collected: false },
  ];
  if (mode === 'stunt' || mode === 'free' || mode === 'gta') return rings;
  return rings.slice(0, 6);
}

export interface StaticWorldProp {
  kind: 'pine' | 'oak' | 'rock' | 'house' | 'building';
  x: number;
  z: number;
  scale: number;
  yaw: number;
  radius: number;
  halfW?: number;
  halfD?: number;
  height?: number;
  style?: 'glass_tower' | 'stepped_tower' | 'apartment' | 'neon_plaza';
  color?: string;
  accent?: string;
}

export const VILLAGE_HOUSE_SPOTS: Array<{ x: number; z: number; rot: number }> = [
  { x: -110, z: 100, rot: 0.4 },
  { x: -84, z: 102, rot: -0.3 },
  { x: 84, z: 102, rot: 0.5 },
  { x: 110, z: 100, rot: -0.4 },
];

const BUILDING_PALETTES: Array<{
  style: 'glass_tower' | 'stepped_tower' | 'apartment' | 'neon_plaza';
  color: string;
  accent: string;
}> = [
  { style: 'glass_tower', color: '#334155', accent: '#38bdf8' },
  { style: 'stepped_tower', color: '#475569', accent: '#f59e0b' },
  { style: 'neon_plaza', color: '#1e293b', accent: '#ec4899' },
  { style: 'apartment', color: '#64748b', accent: '#e2e8f0' },
  { style: 'glass_tower', color: '#1e3a5f', accent: '#22d3ee' },
  { style: 'stepped_tower', color: '#52525b', accent: '#fbbf24' },
];

let cachedCityBuildings: StaticWorldProp[] | null = null;

export function generateCityBuildings(): StaticWorldProp[] {
  if (cachedCityBuildings) return cachedCityBuildings;

  let seed = 4242;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const buildings: StaticWorldProp[] = [];
  const modes = ['free', 'gta', 'mission', 'race', 'offroad', 'bridge', 'wildlife', 'stunt'] as const;
  const spawns = modes.map((m) => getSpawnForMode(m));

  // Place buildings inside exact city blocks centered between avenues and cross-streets
  const blockCentersX = [-135, -109, -84, -60, 60, 84, 109, 135];
  const blockCentersZ = [-127, -100, -72, -43, -14, 14, 42, 71, 100];

  for (const bx of blockCentersX) {
    for (const bz of blockCentersZ) {
      const x = bx + (rand() - 0.5) * 1.4;
      const z = bz + (rand() - 0.5) * 1.4;

      if (Math.hypot(x, z) > WORLD_RADIUS - 24) continue;

      const w = 8.4 + rand() * 2.2;
      const d = 9.4 + rand() * 2.8;
      const halfW = w * 0.5;
      const halfD = d * 0.5;
      const footprintRadius = Math.hypot(halfW, halfD);

      const rDist = Math.abs(x - riverCenterX(z));
      if (rDist < riverHalfWidth(z) + footprintRadius + 5.0) continue;

      // Guarantee every building clears every street, avenue, and diagonal loop cleanly
      const roadInfo = distanceToRoad(x, z);
      const roadHalf = roadInfo.surface === 'asphalt' ? 4.9 : 4.4;
      const roadClear = roadHalf + Math.min(halfW, halfD) + 1.05;
      if (roadInfo.dist < roadClear) continue;

      let blocked = false;
      for (const sp of spawns) {
        if (Math.hypot(x - sp.x, z - sp.z) < footprintRadius + 6.5) blocked = true;
      }
      for (const fs of FUEL_STATIONS) {
        if (Math.hypot(x - fs.x, z - fs.z) < footprintRadius + fs.radius + 4.0) blocked = true;
      }
      for (const hs of VILLAGE_HOUSE_SPOTS) {
        if (Math.hypot(x - hs.x, z - hs.z) < footprintRadius + 6.5) blocked = true;
      }
      for (const rm of CITY_STUNT_RAMPS) {
        if (Math.hypot(x - rm.x, z - rm.z) < footprintRadius + 9.5) blocked = true;
      }
      if (blocked) continue;

      const distCenter = Math.hypot(x, z);
      const tallBias = distCenter < 115 ? 1.05 : 0.72;
      const height = Math.round((16 + rand() * 42) * tallBias);
      const palette = BUILDING_PALETTES[buildings.length % BUILDING_PALETTES.length];

      buildings.push({
        kind: 'building',
        x,
        z,
        scale: 1,
        yaw: 0,
        radius: footprintRadius,
        halfW,
        halfD,
        height,
        style: palette.style,
        color: palette.color,
        accent: palette.accent,
      });
    }
  }

  cachedCityBuildings = buildings;
  return buildings;
}

export function isTreePlacementValid(x: number, z: number): boolean {
  if (Math.hypot(x, z) > WORLD_RADIUS - 12) return false;
  const rDist = Math.abs(x - riverCenterX(z));
  if (rDist < riverHalfWidth(z) + 5.5) return false;
  const roadInfo = distanceToRoad(x, z);
  const clearMargin = roadInfo.surface === 'asphalt' ? 8.8 : 7.5;
  if (roadInfo.dist < clearMargin) return false;
  for (const s of FUEL_STATIONS) {
    if (Math.hypot(x - s.x, z - s.z) < s.radius + 5) return false;
  }
  for (const m of ['free', 'gta', 'mission', 'race', 'offroad', 'bridge', 'wildlife', 'stunt'] as const) {
    const sp = getSpawnForMode(m);
    if (Math.hypot(x - sp.x, z - sp.z) < 7.0) return false;
  }
  for (const rm of CITY_STUNT_RAMPS) {
    if (Math.hypot(x - rm.x, z - rm.z) < 11.0) return false;
  }
  for (const b of generateCityBuildings()) {
    if (
      Math.abs(x - b.x) < (b.halfW ?? b.radius) + 2.6 &&
      Math.abs(z - b.z) < (b.halfD ?? b.radius) + 2.6
    ) {
      return false;
    }
  }
  return true;
}

export function generateWorldProps(): {
  pines: StaticWorldProp[];
  oaks: StaticWorldProp[];
  rocks: StaticWorldProp[];
  buildings: StaticWorldProp[];
  colliders: StaticWorldProp[];
} {
  let seed = 1337;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const buildings = generateCityBuildings();
  const pines: StaticWorldProp[] = [];
  const oaks: StaticWorldProp[] = [];
  const rocks: StaticWorldProp[] = [];
  const colliders: StaticWorldProp[] = [...buildings];

  for (let i = 0; i < 820; i++) {
    const ang = rand() * Math.PI * 2;
    const dist = 28 + rand() * (WORLD_RADIUS - 38);
    const x = Math.cos(ang) * dist;
    const z = Math.sin(ang) * dist;
    if (!isTreePlacementValid(x, z)) continue;

    // Keep dense urban core crisp; place trees primarily in outer parks, waterfronts, and mountains
    const inCoreCity = Math.abs(x) > 46 && Math.abs(x) < 146 && z > -135 && z < 110;
    if (inCoreCity && i % 3 !== 0) continue;

    if (i % 5 === 0) {
      const scale = 0.7 + rand() * 1.4;
      const prop: StaticWorldProp = { kind: 'rock', x, z, scale, yaw: rand() * Math.PI * 2, radius: 1.05 * scale };
      rocks.push(prop);
      colliders.push(prop);
    } else if (i % 3 === 0) {
      const scale = 0.85 + rand() * 0.35;
      const prop: StaticWorldProp = { kind: 'oak', x, z, scale, yaw: rand() * Math.PI * 2, radius: 0.65 * scale };
      oaks.push(prop);
      colliders.push(prop);
    } else {
      const scale = 0.85 + rand() * 0.45;
      const prop: StaticWorldProp = { kind: 'pine', x, z, scale, yaw: rand() * Math.PI * 2, radius: 0.58 * scale };
      pines.push(prop);
      colliders.push(prop);
    }
  }

  for (const h of VILLAGE_HOUSE_SPOTS) {
    colliders.push({ kind: 'house', x: h.x, z: h.z, scale: 1, yaw: h.rot, radius: 3.7 });
  }

  return { pines, oaks, rocks, buildings, colliders };
}

export function computeCollisionImpactDamage(impactSpeedMs: number, weight = 1.0): number {
  if (impactSpeedMs <= 2.2) return 0;
  const normalized = Math.min(1, impactSpeedMs / 28);
  return Math.max(4, Math.min(30, Math.round(normalized * 26 * weight)));
}
