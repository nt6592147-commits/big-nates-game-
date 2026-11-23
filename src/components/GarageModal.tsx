import React, { useState } from 'react';
import { SaveData, VehicleCategory } from '../game/types';
import { VEHICLES } from '../game/vehiclesData';

interface GarageModalProps {
  saveData: SaveData;
  onSelectOrUnlock: (vehicleId: string, cost: number) => void;
  onClose: () => void;
}

const CATEGORIES: Array<{ id: VehicleCategory; label: string }> = [
  { id: 'cars', label: 'Cars' },
  { id: 'trucks', label: 'Trucks' },
  { id: 'other', label: 'Other Vehicles' },
];

export const GarageModal: React.FC<GarageModalProps> = ({
  saveData,
  onSelectOrUnlock,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<VehicleCategory>('cars');
  const [notice, setNotice] = useState<string | null>(null);

  const filtered = VEHICLES.filter((v) => v.category === activeTab);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(7, 12, 10, 0.78)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Vehicle Garage"
    >
      <div
        className="w-full max-w-4xl max-h-[88vh] flex flex-col rounded-xl border shadow-2xl overflow-hidden"
        style={{
          backgroundColor: '#101a16',
          borderColor: 'rgba(254, 243, 199, 0.2)',
        }}
      >
        <div className="px-6 py-4 border-b border-stone-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black tracking-wide text-stone-100 uppercase">
              Vehicle Garage
            </h2>
            <p className="text-xs text-stone-400">
              Select an unlocked vehicle or spend earned Credits (CR) to unlock new machines.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-3 py-1.5 rounded bg-stone-900 border border-amber-500/40 text-amber-400 font-bold text-sm tabular-nums">
              {saveData.credits} CR
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 text-sm font-semibold cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="px-6 pt-3 flex gap-2 border-b border-stone-800/80">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setActiveTab(cat.id);
                setNotice(null);
              }}
              className={`px-4 py-2 text-sm font-bold rounded-t-lg border-b-2 transition-colors cursor-pointer ${
                activeTab === cat.id
                  ? 'border-amber-400 text-amber-300 bg-stone-900/70'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {notice && (
          <div className="mx-6 mt-3 px-3 py-2 rounded bg-red-950/80 border border-red-700/60 text-red-200 text-xs font-semibold">
            {notice}
          </div>
        )}

        {/* Vehicle Cards */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((v) => {
            const isUnlocked = saveData.unlockedVehicleIds.includes(v.id);
            const isSelected = saveData.selectedVehicleId === v.id;
            const canAfford = saveData.credits >= v.cost;

            return (
              <div
                key={v.id}
                className={`p-4 rounded-lg border flex flex-col justify-between gap-3 transition-colors ${
                  isSelected
                    ? 'border-amber-400 bg-emerald-950/40'
                    : 'border-stone-800 bg-stone-900/70'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold">
                        {v.brand}
                      </div>
                      <h3 className="text-base font-extrabold text-stone-100">{v.name}</h3>
                    </div>
                    <span
                      className="w-6 h-6 rounded border border-white/25 shrink-0"
                      style={{ backgroundColor: v.color }}
                      title={`Paint color ${v.color}`}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-stone-400 leading-relaxed">{v.description}</p>

                  {/* Stat Bars */}
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                    <div>
                      <div className="flex justify-between text-stone-300">
                        <span>Top Speed</span>
                        <span className="tabular-nums font-bold">{v.maxSpeedKmh} km/h</span>
                      </div>
                      <div className="h-1.5 rounded bg-stone-800 mt-0.5 overflow-hidden">
                        <div
                          className="h-full bg-amber-400"
                          style={{ width: `${Math.min(100, (v.maxSpeedKmh / 285) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-stone-300">
                        <span>Accel</span>
                        <span className="tabular-nums font-bold">{Math.round((v.accelForce / 55) * 100)}</span>
                      </div>
                      <div className="h-1.5 rounded bg-stone-800 mt-0.5 overflow-hidden">
                        <div
                          className="h-full bg-emerald-400"
                          style={{ width: `${Math.min(100, (v.accelForce / 55) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-stone-300">
                        <span>Handling</span>
                        <span className="tabular-nums font-bold">{Math.round((v.handling / 1.4) * 100)}</span>
                      </div>
                      <div className="h-1.5 rounded bg-stone-800 mt-0.5 overflow-hidden">
                        <div
                          className="h-full bg-sky-400"
                          style={{ width: `${Math.min(100, (v.handling / 1.4) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-stone-300">
                        <span>Off-Road</span>
                        <span className="tabular-nums font-bold">{Math.round(v.offroadGrip * 100)}</span>
                      </div>
                      <div className="h-1.5 rounded bg-stone-800 mt-0.5 overflow-hidden">
                        <div
                          className="h-full bg-lime-400"
                          style={{ width: `${Math.min(100, v.offroadGrip * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-400 tabular-nums">
                    {isUnlocked ? 'Owned' : `${v.cost} CR`}
                  </span>
                  {isSelected ? (
                    <span className="px-3 py-1 rounded bg-amber-500/20 text-amber-300 text-xs font-bold uppercase">
                      Active Vehicle
                    </span>
                  ) : isUnlocked ? (
                    <button
                      type="button"
                      onClick={() => {
                        setNotice(null);
                        onSelectOrUnlock(v.id, 0);
                      }}
                      className="px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase cursor-pointer"
                    >
                      Select {v.name}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (!canAfford) {
                          setNotice(`Need ${v.cost - saveData.credits} more CR! Complete missions, races, or observe wildlife to earn CR.`);
                          return;
                        }
                        setNotice(null);
                        onSelectOrUnlock(v.id, v.cost);
                      }}
                      className={`px-3.5 py-1.5 rounded text-xs font-bold uppercase cursor-pointer ${
                        canAfford
                          ? 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                          : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                      }`}
                    >
                      Unlock {v.name} ({v.cost} CR)
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
