import { GraphicsQuality, GraphicsSettings, SaveData } from './types';

const STORAGE_KEY = 'wildroad_3d_offline_save_v1';

export const GRAPHICS_PRESETS: Record<GraphicsQuality, Partial<GraphicsSettings>> = {
  low: {
    quality: 'low',
    resolutionScale: 0.75,
    shadows: false,
    reflections: false,
    textureQuality: 'low',
    drawDistance: 165,
    antialiasing: false,
    weatherEffects: false,
  },
  medium: {
    quality: 'medium',
    resolutionScale: 0.9,
    shadows: true,
    reflections: true,
    textureQuality: 'medium',
    drawDistance: 230,
    antialiasing: true,
    weatherEffects: true,
  },
  high: {
    quality: 'high',
    resolutionScale: 1.0,
    shadows: true,
    reflections: true,
    textureQuality: 'high',
    drawDistance: 310,
    antialiasing: true,
    weatherEffects: true,
  },
  ultra: {
    quality: 'ultra',
    resolutionScale: 1.25,
    shadows: true,
    reflections: true,
    textureQuality: 'high',
    drawDistance: 400,
    antialiasing: true,
    weatherEffects: true,
  },
};

export const DEFAULT_SETTINGS: GraphicsSettings = {
  quality: 'medium',
  resolutionScale: 1.0,
  shadows: true,
  reflections: true,
  textureQuality: 'medium',
  drawDistance: 260,
  antialiasing: true,
  weatherEffects: true,
  timeOfDay: 'dynamic',
  weather: 'dynamic',
  muted: false,
  volume: 0.65,
};

export function createDefaultSave(): SaveData {
  return {
    credits: 600,
    unlockedVehicleIds: ['lamborghini_aventador', 'ferrari_f8', 'toyota_camry', 'toyota_corolla', 'pickup_4x4'],
    selectedVehicleId: 'lamborghini_aventador',
    lastMode: 'free',
    completedModes: {},
    bestRaceTimeSec: null,
    bestBridgeTimeSec: null,
    totalDistanceKm: 0,
    discoveredSpecies: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

export function loadSaveData(): SaveData {
  const fallback = createDefaultSave();
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return {
      ...fallback,
      ...parsed,
      unlockedVehicleIds:
        Array.isArray(parsed.unlockedVehicleIds) && parsed.unlockedVehicleIds.length > 0
          ? Array.from(
              new Set([
                'lamborghini_aventador',
                'ferrari_f8',
                'toyota_camry',
                'toyota_corolla',
                'pickup_4x4',
                ...parsed.unlockedVehicleIds,
              ]),
            )
          : fallback.unlockedVehicleIds,
      discoveredSpecies: Array.isArray(parsed.discoveredSpecies) ? parsed.discoveredSpecies : [],
      completedModes: parsed.completedModes && typeof parsed.completedModes === 'object' ? parsed.completedModes : {},
      settings: {
        ...DEFAULT_SETTINGS,
        ...(parsed.settings ?? {}),
      },
    };
  } catch {
    return fallback;
  }
}

export function saveGameData(data: SaveData): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors in restricted sandboxes
  }
}

export function unlockVehicleInSave(
  save: SaveData,
  vehicleId: string,
  cost: number,
): { save: SaveData; unlocked: boolean; reason?: string } {
  if (save.unlockedVehicleIds.includes(vehicleId)) {
    return {
      save: { ...save, selectedVehicleId: vehicleId },
      unlocked: true,
    };
  }
  if (save.credits < cost) {
    return {
      save,
      unlocked: false,
      reason: `Need ${cost - save.credits} more CR to unlock`,
    };
  }
  const updated: SaveData = {
    ...save,
    credits: save.credits - cost,
    unlockedVehicleIds: [...save.unlockedVehicleIds, vehicleId],
    selectedVehicleId: vehicleId,
  };
  saveGameData(updated);
  return { save: updated, unlocked: true };
}
