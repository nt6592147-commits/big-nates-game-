import React from 'react';
import { GraphicsQuality, GraphicsSettings, TimeOfDayPreset, WeatherPreset } from '../game/types';
import { GRAPHICS_PRESETS } from '../game/storage';

interface SettingsModalProps {
  settings: GraphicsSettings;
  onChange: (next: GraphicsSettings) => void;
  onClose: () => void;
}

const QUALITIES: GraphicsQuality[] = ['low', 'medium', 'high', 'ultra'];
const TIMES: Array<{ id: TimeOfDayPreset; label: string }> = [
  { id: 'dynamic', label: 'Dynamic Cycle' },
  { id: 'sunrise', label: 'Sunrise' },
  { id: 'day', label: 'Daylight' },
  { id: 'sunset', label: 'Sunset' },
  { id: 'night', label: 'Nighttime' },
];
const WEATHERS: Array<{ id: WeatherPreset; label: string }> = [
  { id: 'dynamic', label: 'Dynamic AI' },
  { id: 'clear', label: 'Clear Sky' },
  { id: 'fog', label: 'Valley Fog' },
  { id: 'rain', label: 'Rainstorm' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onChange,
  onClose,
}) => {
  const applyPreset = (q: GraphicsQuality) => {
    onChange({
      ...settings,
      ...GRAPHICS_PRESETS[q],
      quality: q,
    });
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(7, 12, 10, 0.8)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Graphics and World Settings"
    >
      <div
        className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-xl border shadow-2xl overflow-hidden"
        style={{
          backgroundColor: '#101a16',
          borderColor: 'rgba(254, 243, 199, 0.2)',
        }}
      >
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black tracking-wide text-stone-100 uppercase">
              Settings
            </h2>
            <p className="text-xs text-stone-400">
              Optimized for Intel Core i5 / 8GB RAM / Integrated Graphics &amp; high-end GPUs.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-stone-950 text-sm font-bold cursor-pointer"
          >
            Apply &amp; Close
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Graphics Quality Presets */}
          <div>
            <div className="text-xs uppercase tracking-wider text-amber-300 font-bold mb-2">
              Graphics Preset
            </div>
            <div className="grid grid-cols-4 gap-2">
              {QUALITIES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => applyPreset(q)}
                  className={`py-2 rounded font-bold uppercase text-xs border cursor-pointer ${
                    settings.quality === q
                      ? 'bg-amber-500 text-stone-950 border-amber-400'
                      : 'bg-stone-900 text-stone-300 border-stone-700 hover:border-stone-500'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders & Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5 bg-stone-900/70 p-3 rounded border border-stone-800">
              <div className="flex justify-between text-xs font-semibold text-stone-300">
                <span>Resolution Scale</span>
                <span className="tabular-nums text-amber-300">
                  {Math.round(settings.resolutionScale * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.6}
                max={1.25}
                step={0.05}
                value={settings.resolutionScale}
                onChange={(e) =>
                  onChange({ ...settings, resolutionScale: Number(e.target.value) })
                }
                className="accent-amber-500"
              />
            </label>

            <label className="flex flex-col gap-1.5 bg-stone-900/70 p-3 rounded border border-stone-800">
              <div className="flex justify-between text-xs font-semibold text-stone-300">
                <span>Draw Distance</span>
                <span className="tabular-nums text-amber-300">{settings.drawDistance}m</span>
              </div>
              <input
                type="range"
                min={150}
                max={420}
                step={10}
                value={settings.drawDistance}
                onChange={(e) =>
                  onChange({ ...settings, drawDistance: Number(e.target.value) })
                }
                className="accent-amber-500"
              />
            </label>

            <label className="flex flex-col gap-1.5 bg-stone-900/70 p-3 rounded border border-stone-800">
              <span className="text-xs font-semibold text-stone-300">Texture Quality</span>
              <select
                value={settings.textureQuality}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    textureQuality: e.target.value as 'low' | 'medium' | 'high',
                  })
                }
                className="bg-stone-800 text-stone-100 rounded px-2.5 py-1.5 text-xs border border-stone-700"
              >
                <option value="low">Low (Fastest)</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>

            <label className="flex flex-col gap-1.5 bg-stone-900/70 p-3 rounded border border-stone-800">
              <div className="flex justify-between text-xs font-semibold text-stone-300">
                <span>Master Audio Volume</span>
                <span className="tabular-nums text-amber-300">
                  {settings.muted ? 'Muted' : `${Math.round(settings.volume * 100)}%`}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.volume}
                onChange={(e) =>
                  onChange({ ...settings, volume: Number(e.target.value), muted: false })
                }
                className="accent-amber-500"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            {(
              [
                ['shadows', 'Dynamic Shadows'],
                ['reflections', 'Water Reflections'],
                ['antialiasing', 'Anti-Aliasing'],
                ['weatherEffects', 'Rain Particles'],
                ['muted', 'Mute All Audio'],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex items-center justify-between gap-2 bg-stone-900/70 px-3 py-2.5 rounded border border-stone-800 cursor-pointer"
              >
                <span className="text-stone-200 font-semibold">{label}</span>
                <input
                  type="checkbox"
                  checked={settings[key]}
                  onChange={(e) => onChange({ ...settings, [key]: e.target.checked })}
                  className="accent-amber-500 w-4 h-4"
                />
              </label>
            ))}
          </div>

          {/* Time of Day & Weather */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-800">
            <div>
              <div className="text-xs uppercase tracking-wider text-amber-300 font-bold mb-2">
                Time of Day
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TIMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onChange({ ...settings, timeOfDay: t.id })}
                    className={`px-2.5 py-1.5 rounded text-xs font-semibold border cursor-pointer ${
                      settings.timeOfDay === t.id
                        ? 'bg-amber-500 text-stone-950 border-amber-400'
                        : 'bg-stone-900 text-stone-300 border-stone-700'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wider text-amber-300 font-bold mb-2">
                Weather
              </div>
              <div className="flex flex-wrap gap-1.5">
                {WEATHERS.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => onChange({ ...settings, weather: w.id })}
                    className={`px-2.5 py-1.5 rounded text-xs font-semibold border cursor-pointer ${
                      settings.weather === w.id
                        ? 'bg-sky-500 text-stone-950 border-sky-400'
                        : 'bg-stone-900 text-stone-300 border-stone-700'
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
