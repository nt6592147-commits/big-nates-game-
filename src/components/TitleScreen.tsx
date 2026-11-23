import React from 'react';
import { GameModeId, SaveData } from '../game/types';
import { getVehicleById } from '../game/vehiclesData';

interface TitleScreenProps {
  saveData: SaveData;
  selectedMode: GameModeId;
  onStart: () => void;
  onContinue: () => void;
  onQuickSwapSupercar: () => void;
  onOpenGarage: () => void;
  onOpenModes: () => void;
  onOpenSettings: () => void;
  onExit: () => void;
}

const MODE_LABELS: Record<GameModeId, string> = {
  free: 'Free Drive',
  gta: 'GTA Wanted Chase',
  mission: 'Mission Mode',
  race: 'Racing Mode',
  stunt: 'City Stunt & Hero Run',
  offroad: 'Off-Road Mode',
  bridge: 'Bridge Challenge',
  wildlife: 'Wildlife Exploration',
};

export const TitleScreen: React.FC<TitleScreenProps> = ({
  saveData,
  selectedMode,
  onStart,
  onContinue,
  onQuickSwapSupercar,
  onOpenGarage,
  onOpenModes,
  onOpenSettings,
  onExit,
}) => {
  const currentVehicle = getVehicleById(saveData.selectedVehicleId);
  const isLambo = currentVehicle.id === 'lamborghini_aventador';
  const hasProgress =
    saveData.totalDistanceKm > 0.05 ||
    Object.keys(saveData.completedModes).length > 0 ||
    saveData.discoveredSpecies.length > 0;

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 sm:p-8 overflow-y-auto">
      {/* Left column lockup & menu over calm sky/horizon negative space */}
      <div className="max-w-md pointer-events-auto flex flex-col gap-3 sm:gap-4 my-auto sm:my-0">
        {/* Bespoke inline SVG Title Emblem Lockup */}
        <div
          className="select-none rounded-xl px-3.5 py-2.5 sm:px-4 sm:py-3 border"
          style={{
            backgroundColor: 'rgba(11, 19, 16, 0.80)',
            borderColor: 'rgba(254, 243, 199, 0.16)',
          }}
        >
          <svg
            viewBox="0 0 420 106"
            className="w-64 sm:w-96 h-auto"
            aria-label="WILDROAD 3D"
            role="img"
          >
            {/* Skyline & Winding Road Emblem */}
            <path
              d="M10 52 L24 20 L34 20 L34 52 Z M38 52 L38 12 L52 12 L52 52 Z M56 52 L56 26 L70 26 L70 52 Z M74 52 L74 18 L92 18 L92 52 Z"
              fill="#d97706"
              stroke="#fef3c7"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M20 52 C38 40, 54 42, 72 52"
              fill="none"
              stroke="#1c1917"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M24 52 C40 43, 54 44, 69 52"
              fill="none"
              stroke="#fef08a"
              strokeWidth="1.6"
              strokeDasharray="4 4"
            />
            {/* Wordmark */}
            <text
              x="108"
              y="44"
              fill="#faf7f0"
              fontSize="38"
              fontWeight="900"
              letterSpacing="3"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
              WILDROAD
            </text>
            <rect x="332" y="16" width="54" height="28" rx="4" fill="#f59e0b" stroke="#fef3c7" strokeWidth="1.5" />
            <text
              x="359"
              y="36"
              textAnchor="middle"
              fill="#111827"
              fontSize="18"
              fontWeight="900"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
              3D
            </text>
            <text
              x="110"
              y="66"
              fill="#fde68a"
              fontSize="11.5"
              fontWeight="700"
              letterSpacing="2.4"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
              METRO CITY SUPERCAR SIMULATOR
            </text>
            <line x1="10" y1="79" x2="394" y2="79" stroke="rgba(254, 243, 199, 0.24)" strokeWidth="1.2" />
            <text
              x="10"
              y="96"
              fill="#e7e5e4"
              fontSize="10.8"
              fontWeight="600"
              letterSpacing="1.1"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
              100% OFFLINE · GTA POLICE CHASE · SUPERMAN · CITY STREETS
            </text>
          </svg>
        </div>

        {/* Active Setup Summary + Instant Lambo/Ferrari Swap */}
        <div
          className="px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-lg border text-sm flex items-center justify-between gap-3"
          style={{
            backgroundColor: 'rgba(13, 21, 18, 0.86)',
            borderColor: 'rgba(254, 243, 199, 0.18)',
          }}
        >
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-amber-300 font-semibold truncate">
              {MODE_LABELS[selectedMode]}
            </div>
            <div data-testid="active-vehicle-name" className="text-stone-100 font-bold truncate">
              {currentVehicle.name}
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              data-testid="quick-swap-supercar"
              onClick={onQuickSwapSupercar}
              className="px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 border border-amber-400/40 text-amber-300 text-[11px] font-bold uppercase cursor-pointer"
              title="Instant swap between Lamborghini and Ferrari"
            >
              {isLambo ? '→ Ferrari' : '→ Lambo'}
            </button>
            <div className="text-right tabular-nums">
              <div className="text-[10px] uppercase tracking-wider text-stone-400">Credits</div>
              <div className="text-amber-400 font-bold text-xs sm:text-sm">{saveData.credits} CR</div>
            </div>
          </div>
        </div>

        {/* Primary Menu Stack */}
        <nav aria-label="Main Menu" className="flex flex-col gap-2 w-full max-w-xs">
          <button
            type="button"
            data-start="true"
            onClick={onStart}
            className="w-full py-3 sm:py-3.5 px-5 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-black text-base tracking-wide uppercase shadow-lg transition-colors cursor-pointer text-left flex items-center justify-between"
          >
            <span>Start Game</span>
            <span className="text-xs font-bold opacity-80">ENTER</span>
          </button>

          {hasProgress && (
            <button
              type="button"
              onClick={onContinue}
              className="w-full py-2 sm:py-2.5 px-5 rounded-lg border text-stone-100 hover:bg-emerald-950/90 font-bold text-sm tracking-wide uppercase transition-colors cursor-pointer text-left flex items-center justify-between"
              style={{
                backgroundColor: 'rgba(13, 21, 18, 0.84)',
                borderColor: 'rgba(254, 243, 199, 0.2)',
              }}
            >
              <span>Continue</span>
              <span className="text-xs text-amber-300 truncate ml-2">{MODE_LABELS[saveData.lastMode]}</span>
            </button>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onOpenGarage}
              className="py-2 sm:py-2.5 px-4 rounded-lg border text-stone-100 hover:border-amber-400/70 font-semibold text-sm transition-colors cursor-pointer text-left"
              style={{
                backgroundColor: 'rgba(13, 21, 18, 0.84)',
                borderColor: 'rgba(254, 243, 199, 0.18)',
              }}
            >
              Select Vehicle
            </button>
            <button
              type="button"
              onClick={onOpenModes}
              className="py-2 sm:py-2.5 px-4 rounded-lg border text-stone-100 hover:border-amber-400/70 font-semibold text-sm transition-colors cursor-pointer text-left"
              style={{
                backgroundColor: 'rgba(13, 21, 18, 0.84)',
                borderColor: 'rgba(254, 243, 199, 0.18)',
              }}
            >
              Game Modes
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onOpenSettings}
              className="py-2 sm:py-2.5 px-4 rounded-lg border text-stone-200 hover:border-amber-400/70 font-semibold text-sm transition-colors cursor-pointer text-left"
              style={{
                backgroundColor: 'rgba(13, 21, 18, 0.84)',
                borderColor: 'rgba(254, 243, 199, 0.16)',
              }}
            >
              Settings
            </button>
            <button
              type="button"
              onClick={onExit}
              className="py-2 sm:py-2.5 px-4 rounded-lg border text-stone-300 hover:text-red-300 hover:border-red-400/50 font-semibold text-sm transition-colors cursor-pointer text-left"
              style={{
                backgroundColor: 'rgba(13, 21, 18, 0.84)',
                borderColor: 'rgba(254, 243, 199, 0.14)',
              }}
            >
              Exit
            </button>
          </div>
        </nav>
      </div>

      {/* Single flat control-hint line in bottom safe margin */}
      <div className="hidden sm:block">
        <span
          className="inline-block px-3 py-1 rounded-md border text-xs sm:text-sm text-stone-100 font-medium tracking-wide"
          style={{
            backgroundColor: 'rgba(11, 19, 16, 0.80)',
            borderColor: 'rgba(254, 243, 199, 0.16)',
          }}
        >
          WASD / Arrows Drive · Shift Nitro Boost · Space Handbrake · C Camera · L Lights · G Horn · Esc Pause
        </span>
      </div>
    </div>
  );
};
