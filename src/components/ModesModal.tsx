import React from 'react';
import { GameModeId, SaveData } from '../game/types';

interface ModesModalProps {
  selectedMode: GameModeId;
  saveData: SaveData;
  onSelectMode: (mode: GameModeId, launchImmediately?: boolean) => void;
  onClose: () => void;
}

const MODES: Array<{
  id: GameModeId;
  title: string;
  tagline: string;
  description: string;
  reward: string;
}> = [
  {
    id: 'free',
    title: 'Free Drive',
    tagline: 'Metro City & Open-World Grid',
    description:
      'Cruise interconnected city avenues, 3 river bridges, parks, and mountain passes alongside police patrols, pedestrians, jets, Flash, and Superman.',
    reward: 'Rings (+50 CR) · Stunts (+100 CR) · Evade Cops (+250 CR)',
  },
  {
    id: 'gta',
    title: 'GTA Wanted Chase',
    tagline: '2★ Police Pursuit · Pay \'n\' Spray · Supercars',
    description:
      'Start hot at 2 Wanted Stars! Outrun pursuing police cruisers across downtown intersections, dodge roadblocks, evade heat or hit Pay \'n\' Spray while Superman patrols overhead.',
    reward: '+$250 per Evasion + $600 Mode Bonus',
  },
  {
    id: 'stunt',
    title: 'City Stunt & Hero Run',
    tagline: 'Neon Ramps, Sky Rings & Superheroes',
    description:
      'Hit 4 waterfront stunt ramps with Nitro Boost, collect skyline golden rings, and race beside The Flash and Superman.',
    reward: '+550 CR on completion',
  },
  {
    id: 'race',
    title: 'Racing Mode',
    tagline: 'City Circuit vs 3 AI Supercars',
    description:
      'Compete head-to-head against AI Ferrari, Lamborghini, and Mercedes drivers across downtown avenues and river bridges.',
    reward: 'Up to +650 CR',
  },
  {
    id: 'mission',
    title: 'Mission Mode',
    tagline: '5-Stage Metro Delivery',
    description:
      'Cross both river bridges and deliver urgent supplies across East and West Midtown hubs.',
    reward: '+500 CR on completion',
  },
  {
    id: 'offroad',
    title: 'Off-Road Mode',
    tagline: 'Parkland, Mud & Highland Ridge',
    description:
      'Navigate deep mud pits, the flooded south river ford, fallen logs, and steep mountain switchbacks.',
    reward: '+400 CR on completion',
  },
  {
    id: 'bridge',
    title: 'Bridge Challenge',
    tagline: 'Hazard Slalom Crossing',
    description:
      'Thread through roadworks, abandoned cars, and stone barriers across the Suspension Bridge and North Timber Bridge.',
    reward: '+450 CR on completion',
  },
  {
    id: 'wildlife',
    title: 'Wildlife Exploration',
    tagline: 'Observe All 10 Park & Valley Species',
    description:
      'Approach soaring hawks, songbirds, butterflies, rabbits, deer, monkeys, goats, cows, dogs, and cats in their habitats.',
    reward: '+50 CR per species + 450 CR bonus',
  },
];

export const ModesModal: React.FC<ModesModalProps> = ({
  selectedMode,
  saveData,
  onSelectMode,
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(7, 12, 10, 0.78)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Game Modes"
    >
      <div
        className="w-full max-w-4xl max-h-[88vh] flex flex-col rounded-xl border shadow-2xl overflow-hidden"
        style={{
          backgroundColor: '#101a16',
          borderColor: 'rgba(254, 243, 199, 0.2)',
        }}
      >
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black tracking-wide text-stone-100 uppercase">
              Game Modes
            </h2>
            <p className="text-xs text-stone-400">
              Choose how you want to experience the Wildroad valley.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 text-sm font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>

        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          {MODES.map((m) => {
            const isSelected = selectedMode === m.id;
            const completions = saveData.completedModes[m.id] ?? 0;

            return (
              <div
                key={m.id}
                className={`p-4 rounded-lg border flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'border-amber-400 bg-emerald-950/45'
                    : 'border-stone-800 bg-stone-900/75'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] uppercase tracking-wider text-amber-300 font-bold">
                      {m.tagline}
                    </span>
                    {completions > 0 && (
                      <span className="text-[11px] text-emerald-300 font-bold tabular-nums">
                        Cleared {completions}x
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-extrabold text-stone-100 mt-0.5">{m.title}</h3>
                  <p className="text-xs text-stone-400 mt-1.5 leading-relaxed">{m.description}</p>
                </div>

                <div className="pt-3 border-t border-stone-800 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-stone-300">{m.reward}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectMode(m.id, false)}
                      className="px-3 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold uppercase cursor-pointer"
                    >
                      {isSelected ? 'Selected' : 'Select'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectMode(m.id, true)}
                      className="px-3.5 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black uppercase cursor-pointer"
                    >
                      Play {m.title}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
