import { useCallback, useEffect, useRef, useState } from 'react';
import { WildroadEngine } from './game/WildroadEngine';
import { GameModeId, GameState, GraphicsSettings, HudSnapshot, SaveData } from './game/types';
import { loadSaveData, saveGameData, unlockVehicleInSave } from './game/storage';
import { TitleScreen } from './components/TitleScreen';
import { GarageModal } from './components/GarageModal';
import { ModesModal } from './components/ModesModal';
import { SettingsModal } from './components/SettingsModal';
import { GameplayHud } from './components/GameplayHud';
import { OutcomeModal, PauseModal } from './components/PauseAndOutcomeModals';

type ActiveModal = 'none' | 'garage' | 'modes' | 'settings';

const INITIAL_HUD: HudSnapshot = {
  speedKmh: 0,
  gear: 'N',
  rpmRatio: 0.14,
  fuel: 100,
  damage: 0,
  nitro: 100,
  isBoosting: false,
  airborne: false,
  headlightsOn: false,
  cameraMode: 'chase',
  surface: 'asphalt',
  biome: 'city',
  weatherActive: 'clear',
  timeLabel: '11:30 AM',
  mode: 'free',
  objectiveTitle: 'Metro City Free Drive',
  objectiveProgress: '0.00 km · 0/8 Rings',
  objectiveIndex: 0,
  objectiveTotal: 0,
  elapsedSec: 0,
  racePosition: 1,
  raceTotalRacers: 1,
  wildlifeDiscoveredCount: 0,
  wildlifeTotalSpecies: 10,
  nearbyAnimalHint: null,
  nearbyStationHint: null,
  stuntBanner: null,
  wantedStars: 0,
  bustedProgress: 0,
  districtName: 'WEST MIDTOWN PLAZA',
  credits: 600,
  playerX: -68,
  playerZ: 2.2,
  playerYaw: Math.PI / 2,
  minimapActors: [],
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<WildroadEngine | null>(null);

  const [saveData, setSaveData] = useState<SaveData>(() => loadSaveData());
  const saveRef = useRef<SaveData>(saveData);
  saveRef.current = saveData;

  const [gameState, setGameState] = useState<GameState>('title');
  const gameStateRef = useRef<GameState>('title');
  gameStateRef.current = gameState;

  const [selectedMode, setSelectedMode] = useState<GameModeId>(saveData.lastMode);
  const selectedModeRef = useRef<GameModeId>(selectedMode);
  selectedModeRef.current = selectedMode;

  const [activeModal, setActiveModal] = useState<ActiveModal>('none');
  const activeModalRef = useRef<ActiveModal>('none');
  activeModalRef.current = activeModal;

  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);

  // Sync game state to body dataset for deterministic inspection
  useEffect(() => {
    document.body.dataset.state = gameState === 'exited' ? 'title' : gameState;
  }, [gameState]);

  const persistSave = useCallback((updater: (prev: SaveData) => SaveData) => {
    setSaveData((prev) => {
      const next = updater(prev);
      saveGameData(next);
      return next;
    });
  }, []);

  // Initialize Three.js WildroadEngine once in isolated container
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const initialSave = saveRef.current;
    const engine = new WildroadEngine(
      container,
      initialSave.selectedVehicleId,
      initialSave.lastMode,
      initialSave.settings,
      initialSave.credits,
      initialSave.discoveredSpecies,
      {
        onHudUpdate: (snapshot) => {
          setHud(snapshot);
        },
        onStateChange: (nextState) => {
          document.body.dataset.state = nextState === 'exited' ? 'title' : nextState;
          setGameState(nextState);
        },
        onSpeciesDiscovered: (species) => {
          persistSave((prev) => ({
            ...prev,
            credits: prev.credits + 50,
            discoveredSpecies: prev.discoveredSpecies.includes(species)
              ? prev.discoveredSpecies
              : [...prev.discoveredSpecies, species],
          }));
        },
        onModeCompleted: (mode, elapsedSec, rewardCredits) => {
          persistSave((prev) => ({
            ...prev,
            credits: prev.credits + rewardCredits,
            completedModes: {
              ...prev.completedModes,
              [mode]: (prev.completedModes[mode] ?? 0) + 1,
            },
            bestRaceTimeSec:
              mode === 'race' && (prev.bestRaceTimeSec === null || elapsedSec < prev.bestRaceTimeSec)
                ? elapsedSec
                : prev.bestRaceTimeSec,
            bestBridgeTimeSec:
              mode === 'bridge' && (prev.bestBridgeTimeSec === null || elapsedSec < prev.bestBridgeTimeSec)
                ? elapsedSec
                : prev.bestBridgeTimeSec,
          }));
        },
      },
    );
    engineRef.current = engine;

    // Support ?autostart=1 to jump directly into gameplay
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      document.body.dataset.state = 'playing';
      setGameState('playing');
      engine.startGame(initialSave.lastMode, initialSave.selectedVehicleId);
    }

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [persistSave]);

  const startGameplay = useCallback(
    (modeOverride?: GameModeId) => {
      (document.activeElement as HTMLElement | null)?.blur?.();
      const targetMode = modeOverride ?? selectedModeRef.current;
      setSelectedMode(targetMode);
      persistSave((prev) => ({ ...prev, lastMode: targetMode }));
      setActiveModal('none');
      document.body.dataset.state = 'playing';
      setGameState('playing');
      engineRef.current?.startGame(targetMode, saveRef.current.selectedVehicleId);
    },
    [persistSave],
  );

  // Title-to-start Enter/Space + Mute [M] global shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (gameStateRef.current === 'title' && activeModalRef.current === 'none') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          startGameplay();
        }
      }
      if (e.code === 'KeyM' && activeModalRef.current === 'none') {
        persistSave((prev) => {
          const nextSettings = { ...prev.settings, muted: !prev.settings.muted };
          engineRef.current?.applySettings(nextSettings);
          return { ...prev, settings: nextSettings };
        });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [startGameplay, persistSave]);

  const handleSelectOrUnlockVehicle = (vehicleId: string, cost: number) => {
    const res = unlockVehicleInSave(saveRef.current, vehicleId, cost);
    if (res.unlocked) {
      setSaveData(res.save);
      engineRef.current?.selectVehicle(vehicleId);
    }
  };

  const handleSettingsChange = (nextSettings: GraphicsSettings) => {
    persistSave((prev) => ({ ...prev, settings: nextSettings }));
    engineRef.current?.applySettings(nextSettings);
  };

  return (
    <main className="relative w-full h-full overflow-hidden bg-[#0b1310]">
      {/* Isolated WebGL Canvas Container */}
      <div
        ref={canvasMountRef}
        data-testid="wildroad-canvas-container"
        className="absolute inset-0 w-full h-full"
      />

      {/* Title Screen */}
      {gameState === 'title' && activeModal === 'none' && (
        <TitleScreen
          saveData={saveData}
          selectedMode={selectedMode}
          onStart={() => startGameplay()}
          onContinue={() => startGameplay(saveData.lastMode)}
          onQuickSwapSupercar={() => {
            const nextId =
              saveRef.current.selectedVehicleId === 'lamborghini_aventador'
                ? 'ferrari_f8'
                : 'lamborghini_aventador';
            handleSelectOrUnlockVehicle(nextId, 0);
          }}
          onOpenGarage={() => setActiveModal('garage')}
          onOpenModes={() => setActiveModal('modes')}
          onOpenSettings={() => setActiveModal('settings')}
          onExit={() => {
            saveGameData(saveData);
            engineRef.current?.setExited();
          }}
        />
      )}

      {/* Active Playing HUD */}
      {gameState === 'playing' && activeModal === 'none' && (
        <GameplayHud
          hud={hud}
          muted={saveData.settings.muted}
          onToggleMute={() =>
            handleSettingsChange({ ...saveData.settings, muted: !saveData.settings.muted })
          }
          onCycleCamera={() => engineRef.current?.cycleCamera()}
          onToggleLights={() => engineRef.current?.toggleHeadlights()}
          onHorn={() => engineRef.current?.triggerHorn()}
          onPause={() => engineRef.current?.setPaused(true)}
          onTouchInput={(input) => engineRef.current?.setTouchControls(input)}
        />
      )}

      {/* Pause Modal */}
      {gameState === 'paused' && activeModal === 'none' && (
        <PauseModal
          onResume={() => engineRef.current?.setPaused(false)}
          onRestart={() => startGameplay(selectedMode)}
          onOpenGarage={() => setActiveModal('garage')}
          onOpenModes={() => setActiveModal('modes')}
          onOpenSettings={() => setActiveModal('settings')}
          onReturnToTitle={() => engineRef.current?.returnToTitle()}
        />
      )}

      {/* Outcome / Mission / Race Finish Modal */}
      {gameState === 'gameover' && activeModal === 'none' && (
        <OutcomeModal
          hud={hud}
          onPlayAgain={() => startGameplay(selectedMode)}
          onReturnToTitle={() => engineRef.current?.returnToTitle()}
        />
      )}

      {/* Offline Standby / Exited Screen */}
      {gameState === 'exited' && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-6"
          style={{ backgroundColor: 'rgba(8, 13, 11, 0.94)' }}
        >
          <div className="max-w-md w-full p-6 rounded-xl border border-stone-700 bg-stone-900 text-center space-y-4">
            <h2 className="text-2xl font-black text-stone-100 uppercase tracking-wide">
              Session Saved Offline
            </h2>
            <p className="text-sm text-stone-400">
              All unlocked vehicles, credits, wildlife discoveries, and graphics settings are stored locally. You may safely close this window or return to the valley.
            </p>
            <button
              type="button"
              onClick={() => engineRef.current?.returnToTitle()}
              className="px-6 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-black uppercase text-sm cursor-pointer"
            >
              Return to Main Menu
            </button>
          </div>
        </div>
      )}

      {/* Sub-Modals */}
      {activeModal === 'garage' && (
        <GarageModal
          saveData={saveData}
          onSelectOrUnlock={handleSelectOrUnlockVehicle}
          onClose={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'modes' && (
        <ModesModal
          selectedMode={selectedMode}
          saveData={saveData}
          onSelectMode={(mode, launchNow) => {
            setSelectedMode(mode);
            persistSave((prev) => ({ ...prev, lastMode: mode }));
            if (launchNow) {
              startGameplay(mode);
            }
          }}
          onClose={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'settings' && (
        <SettingsModal
          settings={saveData.settings}
          onChange={handleSettingsChange}
          onClose={() => setActiveModal('none')}
        />
      )}
    </main>
  );
}
