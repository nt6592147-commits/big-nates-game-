export type GameState = 'title' | 'playing' | 'paused' | 'gameover' | 'exited';

export type GameModeId =
  | 'free'
  | 'gta'
  | 'mission'
  | 'race'
  | 'offroad'
  | 'bridge'
  | 'wildlife'
  | 'stunt';

export type CameraMode = 'chase' | 'cockpit' | 'front' | 'cinematic';

export type GraphicsQuality = 'low' | 'medium' | 'high' | 'ultra';

export type TimeOfDayPreset = 'sunrise' | 'day' | 'sunset' | 'night' | 'dynamic';

export type WeatherPreset = 'clear' | 'fog' | 'rain' | 'dynamic';

export type SurfaceType = 'asphalt' | 'bridge' | 'dirt' | 'mud' | 'grass' | 'water';

export type BiomeType = 'city' | 'highway' | 'forest' | 'river' | 'bridge' | 'village' | 'mountain' | 'grassland';

export type VehicleCategory = 'cars' | 'trucks' | 'other';

export type VehicleBodyStyle =
  | 'sedan'
  | 'coupe'
  | 'supercar'
  | 'suv'
  | 'pickup'
  | 'boxtruck'
  | 'flatbed'
  | 'semi'
  | 'bus'
  | 'police'
  | 'ambulance'
  | 'buggy';

export interface VehicleSpec {
  id: string;
  name: string;
  brand: string;
  category: VehicleCategory;
  bodyStyle: VehicleBodyStyle;
  color: string;
  accentColor: string;
  maxSpeedKmh: number;
  accelForce: number;
  brakeForce: number;
  handling: number;
  offroadGrip: number;
  suspensionStiffness: number;
  suspensionDamping: number;
  mass: number;
  wheelRadius: number;
  wheelBase: number;
  trackWidth: number;
  length: number;
  width: number;
  height: number;
  cost: number;
  enginePitch: number;
  isEmergency?: boolean;
  description: string;
}

export interface GraphicsSettings {
  quality: GraphicsQuality;
  resolutionScale: number; // 0.6 to 1.5
  shadows: boolean;
  reflections: boolean;
  textureQuality: 'low' | 'medium' | 'high';
  drawDistance: number; // 140 to 420
  antialiasing: boolean;
  weatherEffects: boolean;
  timeOfDay: TimeOfDayPreset;
  weather: WeatherPreset;
  muted: boolean;
  volume: number; // 0 to 1
}

export interface SaveData {
  credits: number;
  unlockedVehicleIds: string[];
  selectedVehicleId: string;
  lastMode: GameModeId;
  completedModes: Partial<Record<GameModeId, number>>;
  bestRaceTimeSec: number | null;
  bestBridgeTimeSec: number | null;
  totalDistanceKm: number;
  discoveredSpecies: string[];
  settings: GraphicsSettings;
}

export type AnimalSpecies =
  | 'bird_flying'
  | 'bird_perched'
  | 'butterfly'
  | 'rabbit'
  | 'deer'
  | 'monkey'
  | 'goat'
  | 'cow'
  | 'dog'
  | 'cat';

export type ObstacleKind =
  | 'fallen_tree'
  | 'boulder'
  | 'barrier'
  | 'construction'
  | 'abandoned_car'
  | 'flood_zone'
  | 'mud_pit'
  | 'pothole'
  | 'broken_bridge_gap';

export interface ObstacleSpec {
  id: string;
  kind: ObstacleKind;
  x: number;
  z: number;
  y?: number;
  radius: number;
  rotation: number;
  solid: boolean;
  slowFactor: number; // 1 = no slow, 0.45 = heavy mud/water drag
  bumpIntensity: number;
  bridgeOnly?: boolean;
}

export interface StuntRampSpec {
  id: string;
  x: number;
  z: number;
  yaw: number;
  width: number;
  length: number;
  height: number;
}

export interface CollectibleRingSpec {
  id: string;
  x: number;
  y: number;
  z: number;
  collected: boolean;
}

export interface MinimapActor {
  x: number;
  z: number;
  kind: 'traffic' | 'racer' | 'wildlife' | 'checkpoint' | 'fuel' | 'hero' | 'aircraft' | 'ring' | 'police';
  color?: string;
}

export interface HudSnapshot {
  speedKmh: number;
  gear: string;
  rpmRatio: number;
  fuel: number; // 0..100
  damage: number; // 0..100 (0 = pristine, 100 = wrecked)
  nitro: number; // 0..100
  isBoosting: boolean;
  airborne: boolean;
  headlightsOn: boolean;
  cameraMode: CameraMode;
  surface: SurfaceType;
  biome: BiomeType;
  weatherActive: 'clear' | 'fog' | 'rain';
  timeLabel: string;
  mode: GameModeId;
  objectiveTitle: string;
  objectiveProgress: string;
  objectiveIndex: number;
  objectiveTotal: number;
  elapsedSec: number;
  racePosition: number;
  raceTotalRacers: number;
  wildlifeDiscoveredCount: number;
  wildlifeTotalSpecies: number;
  nearbyAnimalHint: string | null;
  nearbyStationHint: string | null;
  stuntBanner: string | null;
  wantedStars: number; // 0..5 GTA Wanted Level
  bustedProgress: number; // 0..100 when boxed in by police
  districtName: string;
  credits: number;
  playerX: number;
  playerZ: number;
  playerYaw: number;
  minimapActors: MinimapActor[];
  outcomeTitle?: string;
  outcomeSubtitle?: string;
  outcomeVictory?: boolean;
  rewardCredits?: number;
}
