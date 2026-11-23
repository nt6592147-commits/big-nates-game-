import React from 'react';
import { HudSnapshot } from '../game/types';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onOpenGarage: () => void;
  onOpenModes: () => void;
  onOpenSettings: () => void;
  onReturnToTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onOpenGarage,
  onOpenModes,
  onOpenSettings,
  onReturnToTitle,
}) => {
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(7, 12, 10, 0.72)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Game Paused"
    >
      <div
        className="w-full max-w-sm rounded-xl border p-6 shadow-2xl flex flex-col gap-3"
        style={{
          backgroundColor: '#101a16',
          borderColor: 'rgba(254, 243, 199, 0.22)',
        }}
      >
        <div className="text-center mb-1">
          <div className="text-[11px] uppercase tracking-widest text-amber-300 font-bold">
            Wildroad 3D
          </div>
          <h2 className="text-2xl font-black text-stone-100 uppercase tracking-wide">
            Paused
          </h2>
        </div>

        <button
          type="button"
          onClick={onResume}
          className="w-full py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-black uppercase text-sm cursor-pointer"
        >
          Resume Driving
        </button>

        <button
          type="button"
          onClick={onRestart}
          className="w-full py-2.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-100 font-bold text-sm cursor-pointer"
        >
          Restart Mode
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onOpenGarage}
            className="py-2.5 rounded-lg bg-stone-900 border border-stone-700 hover:border-amber-400/60 text-stone-200 font-semibold text-xs cursor-pointer"
          >
            Select Vehicle
          </button>
          <button
            type="button"
            onClick={onOpenModes}
            className="py-2.5 rounded-lg bg-stone-900 border border-stone-700 hover:border-amber-400/60 text-stone-200 font-semibold text-xs cursor-pointer"
          >
            Game Modes
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenSettings}
          className="w-full py-2.5 rounded-lg bg-stone-900 border border-stone-700 hover:border-amber-400/60 text-stone-200 font-semibold text-xs cursor-pointer"
        >
          Graphics &amp; Weather Settings
        </button>

        <button
          type="button"
          onClick={onReturnToTitle}
          className="w-full py-2.5 rounded-lg bg-stone-950 border border-stone-800 hover:text-amber-300 text-stone-400 font-semibold text-xs cursor-pointer"
        >
          Return to Main Menu
        </button>
      </div>
    </div>
  );
};

interface OutcomeModalProps {
  hud: HudSnapshot;
  onPlayAgain: () => void;
  onReturnToTitle: () => void;
}

export const OutcomeModal: React.FC<OutcomeModalProps> = ({
  hud,
  onPlayAgain,
  onReturnToTitle,
}) => {
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(7, 12, 10, 0.78)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Run Summary"
    >
      <div
        className="w-full max-w-md rounded-xl border p-6 shadow-2xl flex flex-col gap-4"
        style={{
          backgroundColor: '#101a16',
          borderColor: hud.outcomeVictory
            ? 'rgba(251, 191, 36, 0.45)'
            : 'rgba(239, 68, 68, 0.45)',
        }}
      >
        <div className="text-center">
          <div
            className={`text-xs uppercase tracking-widest font-bold ${
              hud.outcomeVictory ? 'text-amber-300' : 'text-red-400'
            }`}
          >
            {hud.outcomeVictory ? 'Challenge Complete' : 'Run Ended'}
          </div>
          <h2 className="text-2xl font-black text-stone-100 mt-1">
            {hud.outcomeTitle ?? 'Session Finished'}
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            {hud.outcomeSubtitle ?? ''}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2.5 text-center">
          <div className="p-3 rounded-lg bg-stone-900 border border-stone-800">
            <div className="text-[10px] uppercase text-stone-400 font-bold">Time</div>
            <div className="text-lg font-black text-stone-100 tabular-nums mt-0.5">
              {hud.elapsedSec.toFixed(1)}s
            </div>
          </div>
          <div className="p-3 rounded-lg bg-stone-900 border border-stone-800">
            <div className="text-[10px] uppercase text-stone-400 font-bold">Reward</div>
            <div className="text-lg font-black text-amber-400 tabular-nums mt-0.5">
              +{hud.rewardCredits ?? 0} CR
            </div>
          </div>
          <div className="p-3 rounded-lg bg-stone-900 border border-stone-800">
            <div className="text-[10px] uppercase text-stone-400 font-bold">Wildlife</div>
            <div className="text-lg font-black text-emerald-400 tabular-nums mt-0.5">
              {hud.wildlifeDiscoveredCount}/10
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            data-start="true"
            onClick={onPlayAgain}
            className="w-full py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-black uppercase text-sm cursor-pointer"
          >
            Play Again
          </button>
          <button
            type="button"
            onClick={onReturnToTitle}
            className="w-full py-2.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-sm cursor-pointer"
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};
