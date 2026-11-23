import React, { useEffect, useRef, useState } from 'react';
import { CameraMode, HudSnapshot } from '../game/types';
import { ROAD_NETWORK, riverCenterX, riverHalfWidth } from '../game/worldMath';

interface GameplayHudProps {
  hud: HudSnapshot;
  muted: boolean;
  onToggleMute: () => void;
  onCycleCamera: () => void;
  onToggleLights: () => void;
  onHorn: () => void;
  onPause: () => void;
  onTouchInput: (input: { throttle?: number; brake?: number; steer?: number; handbrake?: boolean; boost?: boolean }) => void;
}

const CAMERA_NAMES: Record<CameraMode, string> = {
  chase: 'Chase',
  cockpit: 'Cockpit',
  front: 'Bumper',
  cinematic: 'Cinema',
};

function detectTouchOrMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(pointer: coarse)').matches ||
    navigator.maxTouchPoints > 0 ||
    window.innerWidth < 960
  );
}

export const GameplayHud: React.FC<GameplayHudProps> = ({
  hud,
  muted,
  onToggleMute,
  onCycleCamera,
  onToggleLights,
  onHorn,
  onPause,
  onTouchInput,
}) => {
  const minimapRef = useRef<HTMLCanvasElement | null>(null);
  const [autoTouch, setAutoTouch] = useState<boolean>(() => detectTouchOrMobile());
  const [isNarrow, setIsNarrow] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false,
  );
  const [forceTouch, setForceTouch] = useState<boolean | null>(null);

  useEffect(() => {
    const onResize = () => {
      setAutoTouch(detectTouchOrMobile());
      setIsNarrow(window.innerWidth < 640);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const showTouchControls = forceTouch ?? autoTouch;

  // Render live world geometry & actors onto corner minimap
  useEffect(() => {
    const canvas = minimapRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const half = size * 0.5;
    const scale = size / 340; // covers ~340m radius view centered on player

    ctx.clearRect(0, 0, size, size);

    // Clip circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(half, half, half - 2, 0, Math.PI * 2);
    ctx.clip();

    // Background city-parkland dark slate
    ctx.fillStyle = '#141d1c';
    ctx.fillRect(0, 0, size, size);

    const toMini = (wx: number, wz: number): [number, number] => [
      half + (wx - hud.playerX) * scale,
      half + (wz - hud.playerZ) * scale,
    ];

    // River path
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = riverHalfWidth(hud.playerZ) * 2 * scale;
    ctx.beginPath();
    for (let z = -260; z <= 260; z += 16) {
      const [mx, my] = toMini(riverCenterX(z), z);
      if (z === -260) ctx.moveTo(mx, my);
      else ctx.lineTo(mx, my);
    }
    ctx.stroke();

    // Road Network
    for (const road of ROAD_NETWORK) {
      ctx.strokeStyle = road.surface === 'asphalt' ? '#64748b' : '#926c47';
      ctx.lineWidth = road.halfWidth * 1.8 * scale;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      road.points.forEach((pt, idx) => {
        const [mx, my] = toMini(pt.x, pt.z);
        if (idx === 0) ctx.moveTo(mx, my);
        else ctx.lineTo(mx, my);
      });
      if (road.closed) ctx.closePath();
      ctx.stroke();
    }

    // Bridges highlight (Main, North, and South Metro Bridge)
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 5;
    for (const bz of [0, -115, 86]) {
      const [bx1, by1] = toMini(-42, bz);
      const [bx2, by2] = toMini(42, bz);
      ctx.beginPath();
      ctx.moveTo(bx1, by1);
      ctx.lineTo(bx2, by2);
      ctx.stroke();
    }

    // Actors (traffic, racers, wildlife, fuel, heroes, aircraft, rings, checkpoint)
    for (const a of hud.minimapActors) {
      const [ax, ay] = toMini(a.x, a.z);
      if (a.kind === 'checkpoint') {
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(ax, ay, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (a.kind === 'ring') {
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(ax, ay, 3.6, 0, Math.PI * 2);
        ctx.stroke();
      } else if (a.kind === 'hero') {
        ctx.fillStyle = a.color ?? '#facc15';
        ctx.beginPath();
        ctx.arc(ax, ay, 4.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else if (a.kind === 'aircraft') {
        ctx.fillStyle = '#e0f2fe';
        ctx.beginPath();
        ctx.moveTo(ax, ay - 3.5);
        ctx.lineTo(ax + 3, ay + 2.5);
        ctx.lineTo(ax - 3, ay + 2.5);
        ctx.closePath();
        ctx.fill();
      } else if (a.kind === 'fuel') {
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(ax - 3, ay - 3, 6, 6);
      } else if (a.kind === 'police') {
        const flashRed = Math.floor(Date.now() / 220) % 2 === 0;
        ctx.fillStyle = flashRed ? '#ef4444' : '#3b82f6';
        ctx.beginPath();
        ctx.arc(ax, ay, 3.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = flashRed ? '#93c5fd' : '#fecaca';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      } else if (a.kind === 'racer') {
        ctx.fillStyle = '#fb923c';
        ctx.beginPath();
        ctx.arc(ax, ay, 3.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (a.kind === 'traffic') {
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.arc(ax, ay, 2.3, 0, Math.PI * 2);
        ctx.fill();
      } else if (a.kind === 'wildlife') {
        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.arc(ax, ay, 2.0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Player heading arrow in center
    ctx.save();
    ctx.translate(half, half);
    ctx.rotate(-hud.playerYaw + Math.PI);
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.restore();

    // Outer compass bezel
    ctx.strokeStyle = 'rgba(254, 243, 199, 0.35)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(half, half, half - 2, 0, Math.PI * 2);
    ctx.stroke();
  }, [hud]);

  const speedPct = Math.min(1, hud.speedKmh / 290);
  const arcLen = 176;
  const dashOffset = arcLen * (1 - speedPct);
  const integrityPct = Math.max(0, 100 - hud.damage);

  const renderSteerPad = () => (
    <div className="pointer-events-auto flex items-center gap-2 touch-none select-none">
      <button
        type="button"
        data-testid="touch-left"
        onPointerDown={(e) => {
          e.preventDefault();
          onTouchInput({ steer: 1 });
        }}
        onPointerUp={() => onTouchInput({ steer: 0 })}
        onPointerCancel={() => onTouchInput({ steer: 0 })}
        onPointerLeave={() => onTouchInput({ steer: 0 })}
        onContextMenu={(e) => e.preventDefault()}
        className="w-14 h-14 sm:w-14 sm:h-14 rounded-xl bg-stone-900/90 active:bg-amber-500 active:text-stone-950 border border-amber-300/35 text-white text-xl font-black touch-none select-none cursor-pointer"
        aria-label="Steer Left"
      >
        ◀
      </button>
      <button
        type="button"
        data-testid="touch-right"
        onPointerDown={(e) => {
          e.preventDefault();
          onTouchInput({ steer: -1 });
        }}
        onPointerUp={() => onTouchInput({ steer: 0 })}
        onPointerCancel={() => onTouchInput({ steer: 0 })}
        onPointerLeave={() => onTouchInput({ steer: 0 })}
        onContextMenu={(e) => e.preventDefault()}
        className="w-14 h-14 sm:w-14 sm:h-14 rounded-xl bg-stone-900/90 active:bg-amber-500 active:text-stone-950 border border-amber-300/35 text-white text-xl font-black touch-none select-none cursor-pointer"
        aria-label="Steer Right"
      >
        ▶
      </button>
    </div>
  );

  const renderPedals = () => (
    <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 touch-none select-none">
      <button
        type="button"
        data-testid="touch-brake"
        onPointerDown={(e) => {
          e.preventDefault();
          onTouchInput({ brake: 1 });
        }}
        onPointerUp={() => onTouchInput({ brake: 0 })}
        onPointerCancel={() => onTouchInput({ brake: 0 })}
        onPointerLeave={() => onTouchInput({ brake: 0 })}
        onContextMenu={(e) => e.preventDefault()}
        className="w-14 h-14 rounded-xl bg-red-950/90 active:bg-red-600 border border-red-500/60 text-red-100 text-[11px] font-black uppercase touch-none select-none cursor-pointer"
        aria-label="Brake or Reverse"
      >
        Brake
      </button>
      <button
        type="button"
        data-testid="touch-boost"
        onPointerDown={(e) => {
          e.preventDefault();
          onTouchInput({ boost: true, throttle: 1 });
        }}
        onPointerUp={() => onTouchInput({ boost: false, throttle: 0 })}
        onPointerCancel={() => onTouchInput({ boost: false, throttle: 0 })}
        onPointerLeave={() => onTouchInput({ boost: false, throttle: 0 })}
        onContextMenu={(e) => e.preventDefault()}
        className="w-14 h-14 rounded-xl bg-sky-900/90 active:bg-sky-400 active:text-stone-950 border border-sky-400/65 text-sky-100 text-[11px] font-black uppercase touch-none select-none cursor-pointer"
        aria-label="Nitro Boost"
      >
        Boost
      </button>
      <button
        type="button"
        data-testid="touch-gas"
        onPointerDown={(e) => {
          e.preventDefault();
          onTouchInput({ throttle: 1 });
        }}
        onPointerUp={() => onTouchInput({ throttle: 0 })}
        onPointerCancel={() => onTouchInput({ throttle: 0 })}
        onPointerLeave={() => onTouchInput({ throttle: 0 })}
        onContextMenu={(e) => e.preventDefault()}
        className="w-16 h-14 rounded-xl bg-amber-500 active:bg-amber-300 border border-amber-200/70 text-stone-950 text-xs font-black uppercase touch-none select-none cursor-pointer"
        aria-label="Accelerate"
      >
        Gas
      </button>
    </div>
  );

  const renderGauges = () => (
    <div
      className="px-2.5 py-2 sm:px-4 sm:py-2.5 rounded-xl border flex items-center gap-2.5 sm:gap-4 shrink-0"
      style={{
        backgroundColor: 'rgba(11, 19, 16, 0.88)',
        borderColor: hud.isBoosting ? 'rgba(56, 189, 248, 0.7)' : 'rgba(254, 243, 199, 0.2)',
      }}
    >
      {/* SVG Speedometer Arc + Tabular Readout */}
      <div className="relative w-20 h-16 sm:w-28 sm:h-20 flex items-center justify-center shrink-0">
        <svg viewBox="0 0 120 82" className="w-full h-full">
          <path
            d="M 18 70 A 48 48 0 1 1 102 70"
            fill="none"
            stroke="rgba(255,255,255,0.14)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M 18 70 A 48 48 0 1 1 102 70"
            fill="none"
            stroke={hud.isBoosting ? '#38bdf8' : '#f59e0b'}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={arcLen}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <div
            data-testid="hud-speed"
            className="text-lg sm:text-2xl font-black text-stone-100 leading-none tabular-nums"
          >
            {hud.speedKmh}
          </div>
          <div className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-stone-400">
            KM/H
          </div>
        </div>
      </div>

      {/* Gear, Nitro, Fuel & Vehicle Integrity Bars */}
      <div className="flex flex-col gap-1.5 min-w-[96px] sm:min-w-[122px]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-stone-400 font-bold">
              Gear
            </span>
            <span className="px-1.5 py-0.5 rounded bg-amber-500 text-stone-950 font-black text-xs sm:text-sm tabular-nums">
              {hud.gear}
            </span>
          </div>
          <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-bold text-stone-300">
            {hud.surface}
          </span>
        </div>

        <div>
          <div className="flex justify-between text-[9px] sm:text-[10px] font-bold text-sky-300 mb-0.5">
            <span>NITRO</span>
            <span className="tabular-nums">{hud.nitro}%</span>
          </div>
          <div className="h-1.5 w-full rounded bg-stone-800 overflow-hidden">
            <div
              className={`h-full ${hud.isBoosting ? 'bg-cyan-300' : 'bg-sky-500'}`}
              style={{ width: `${hud.nitro}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-[9px] sm:text-[10px] font-bold text-stone-300 mb-0.5">
            <span>FUEL</span>
            <span className="tabular-nums">{hud.fuel}%</span>
          </div>
          <div className="h-1.5 w-full rounded bg-stone-800 overflow-hidden">
            <div
              className={`h-full ${hud.fuel < 20 ? 'bg-red-500' : 'bg-amber-400'}`}
              style={{ width: `${hud.fuel}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-[9px] sm:text-[10px] font-bold text-stone-300 mb-0.5">
            <span>INTEGRITY</span>
            <span className="tabular-nums">{integrityPct}%</span>
          </div>
          <div className="h-1.5 w-full rounded bg-stone-800 overflow-hidden">
            <div
              className={`h-full ${integrityPct < 35 ? 'bg-red-500' : 'bg-emerald-400'}`}
              style={{ width: `${integrityPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-3 sm:p-4">
      {/* Top Row: Left Objective Cluster + Right Utility Controls */}
      <div className="flex items-start justify-between gap-1.5 sm:gap-4">
        {/* Top-Left Mode & Environment Cluster */}
        <div
          className="px-2 py-1 sm:px-4 sm:py-2.5 rounded-lg border min-w-0 flex-1 max-w-[162px] sm:max-w-sm"
          style={{
            backgroundColor: 'rgba(11, 19, 16, 0.84)',
            borderColor: 'rgba(254, 243, 199, 0.18)',
          }}
        >
          <div className="flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-[11px] uppercase tracking-wider font-bold text-amber-300 truncate">
            <span className="truncate">{hud.districtName || hud.biome}</span>
            <span className="text-stone-500">·</span>
            <span className="text-sky-300">{hud.weatherActive}</span>
            <span className="hidden sm:inline text-stone-500">·</span>
            <span className="hidden sm:inline text-stone-300 tabular-nums">{hud.timeLabel}</span>
          </div>
          <div className="text-[11px] sm:text-base font-extrabold text-stone-100 mt-0.5 leading-snug truncate">
            {hud.objectiveTitle}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[10px] sm:text-xs text-stone-300 tabular-nums">
            <span className="font-semibold text-amber-200 truncate">{hud.objectiveProgress}</span>
            {hud.mode === 'race' && (
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                POS {hud.racePosition}/{hud.raceTotalRacers}
              </span>
            )}
            {hud.mode !== 'free' && (
              <span className="text-stone-400">{hud.elapsedSec.toFixed(1)}s</span>
            )}
            <span className="text-emerald-300 font-semibold hidden sm:inline">
              Wildlife {hud.wildlifeDiscoveredCount}/{hud.wildlifeTotalSpecies}
            </span>
          </div>
        </div>

        {/* Top-Right Compact Utility Buttons + Stacked GTA Cash & Wanted Stars */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="pointer-events-auto flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              setForceTouch((prev) => !(prev ?? autoTouch));
            }}
            aria-label="Toggle Touch Controls"
            title="Show / Hide Touch Controls"
            className="h-8 sm:h-10 px-1.5 sm:px-3 rounded-lg border text-[10px] sm:text-xs font-bold uppercase text-stone-100 hover:border-amber-400 cursor-pointer flex items-center gap-1"
            style={{
              backgroundColor: 'rgba(11, 19, 16, 0.84)',
              borderColor: showTouchControls ? 'rgba(251, 191, 36, 0.65)' : 'rgba(254, 243, 199, 0.2)',
            }}
          >
            <span className={showTouchControls ? 'text-amber-300' : 'text-stone-300'}>Touch</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            aria-label={muted ? 'Unmute Audio' : 'Mute Audio'}
            title="Mute / Unmute [M]"
            className="h-8 sm:h-10 px-1.5 sm:px-3 rounded-lg border text-[10px] sm:text-xs font-bold uppercase text-stone-100 hover:border-amber-400 cursor-pointer flex items-center gap-1"
            style={{
              backgroundColor: 'rgba(11, 19, 16, 0.84)',
              borderColor: 'rgba(254, 243, 199, 0.2)',
            }}
          >
            <span>{muted ? 'Mute' : 'Audio'}</span>
            <span className="hidden md:inline text-[10px] text-stone-400">[M]</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onCycleCamera();
            }}
            aria-label="Switch Camera Angle"
            title="Switch Camera [C]"
            className="h-8 sm:h-10 px-1.5 sm:px-3 rounded-lg border text-[10px] sm:text-xs font-bold uppercase text-stone-100 hover:border-amber-400 cursor-pointer flex items-center gap-1"
            style={{
              backgroundColor: 'rgba(11, 19, 16, 0.84)',
              borderColor: 'rgba(254, 243, 199, 0.2)',
            }}
          >
            <span>{CAMERA_NAMES[hud.cameraMode]}</span>
            <span className="hidden md:inline text-[10px] text-amber-300">[C]</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleLights();
            }}
            aria-label="Toggle Headlights"
            title="Headlights [L]"
            className="h-8 sm:h-10 px-2.5 sm:px-3 rounded-lg border text-xs font-bold uppercase text-stone-100 hover:border-amber-400 cursor-pointer hidden md:flex items-center gap-1.5"
            style={{
              backgroundColor: 'rgba(11, 19, 16, 0.84)',
              borderColor: hud.headlightsOn ? 'rgba(250, 204, 21, 0.65)' : 'rgba(254, 243, 199, 0.2)',
            }}
          >
            <span className={hud.headlightsOn ? 'text-amber-300' : 'text-stone-300'}>Lights</span>
            <span className="text-[10px] text-stone-400">[L]</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onHorn();
            }}
            aria-label="Honk Horn"
            title="Horn [G]"
            className="h-8 sm:h-10 px-2.5 sm:px-3 rounded-lg border text-xs font-bold uppercase text-stone-100 hover:border-amber-400 cursor-pointer hidden sm:flex items-center gap-1"
            style={{
              backgroundColor: 'rgba(11, 19, 16, 0.84)',
              borderColor: 'rgba(254, 243, 199, 0.2)',
            }}
          >
            <span>Horn</span>
            <span className="hidden md:inline text-[10px] text-stone-400">[G]</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            aria-label="Pause Game"
            title="Pause [Esc]"
            className="h-8 sm:h-10 px-2 sm:px-3.5 rounded-lg border text-[10px] sm:text-xs font-black uppercase text-amber-300 hover:bg-amber-500 hover:text-stone-950 cursor-pointer"
            style={{
              backgroundColor: 'rgba(11, 19, 16, 0.88)',
              borderColor: 'rgba(251, 191, 36, 0.45)',
            }}
          >
            Pause<span className="hidden md:inline"> [Esc]</span>
          </button>
          </div>

          {/* GTA Wanted Stars + Cash Readout */}
          <div
            className="flex items-center gap-2 sm:gap-3 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg border"
            style={{
              backgroundColor: 'rgba(11, 19, 16, 0.86)',
              borderColor:
                hud.wantedStars > 0
                  ? Math.floor(Date.now() / 260) % 2 === 0
                    ? 'rgba(239, 68, 68, 0.72)'
                    : 'rgba(59, 130, 246, 0.72)'
                  : 'rgba(254, 243, 199, 0.16)',
            }}
          >
            <span
              data-testid="hud-cash"
              className="text-xs sm:text-sm font-black text-emerald-400 tabular-nums tracking-tight"
            >
              ${hud.credits}
            </span>
            <div
              data-testid="hud-wanted-stars"
              aria-label={`Wanted Level ${hud.wantedStars} of 5`}
              className="flex items-center gap-0.5 sm:gap-1"
            >
              {[1, 2, 3, 4, 5].map((starIdx) => {
                const active = starIdx <= hud.wantedStars;
                return (
                  <svg
                    key={starIdx}
                    viewBox="0 0 24 24"
                    className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                    aria-hidden="true"
                  >
                    <path
                      d="M12 2.2l2.9 6.1 6.7.9-4.9 4.7 1.2 6.7-5.9-3.2-5.9 3.2 1.2-6.7-4.9-4.7 6.7-.9z"
                      fill={active ? '#facc15' : 'rgba(255,255,255,0.12)'}
                      stroke={active ? '#dc2626' : 'rgba(255,255,255,0.22)'}
                      strokeWidth="1.4"
                    />
                  </svg>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Transient Stunt / Busted / Wildlife / Station Banners */}
      <div className="flex flex-col items-center gap-1.5">
        {hud.bustedProgress > 0 && (
          <div
            data-testid="hud-busted-warning"
            className="px-4 py-1.5 rounded-lg border border-red-500/80 text-red-100 text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-3"
            style={{ backgroundColor: 'rgba(69, 10, 10, 0.92)' }}
          >
            <span>BUSTING... {Math.min(100, Math.round(hud.bustedProgress))}%</span>
            <span className="w-20 h-2 rounded bg-red-950 overflow-hidden inline-block">
              <span
                className="block h-full bg-red-400"
                style={{ width: `${Math.min(100, hud.bustedProgress)}%` }}
              />
            </span>
          </div>
        )}
        {hud.stuntBanner && (
          <div
            className="px-4 py-1.5 rounded-lg border border-amber-400/70 text-amber-200 text-xs sm:text-sm font-black uppercase tracking-wider"
            style={{ backgroundColor: 'rgba(16, 20, 28, 0.9)' }}
          >
            {hud.stuntBanner}
          </div>
        )}
        {(hud.nearbyAnimalHint || hud.nearbyStationHint) && (
          <div
            className="px-4 py-1.5 rounded-lg border border-emerald-400/50 text-emerald-200 text-xs sm:text-sm font-bold tracking-wide"
            style={{ backgroundColor: 'rgba(11, 24, 18, 0.9)' }}
          >
            {hud.nearbyAnimalHint ?? hud.nearbyStationHint}
          </div>
        )}
      </div>

      {/* Bottom Area: Single-Mount Responsive Portrait & Landscape Layout */}
      <div className="flex flex-col gap-2.5">
        {/* Row A: Minimap + Gauges (plus inline Touch controls when viewport >= 640px) */}
        <div className="flex items-end justify-between gap-2 sm:gap-3">
          <div className="flex items-end gap-2 sm:gap-3">
            <div className="relative w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 shrink-0">
              <canvas
                ref={minimapRef}
                width={144}
                height={144}
                className="w-full h-full rounded-full"
                aria-label="World Minimap"
              />
              <span className="absolute top-0.5 left-1/2 -translate-x-1/2 text-[9px] sm:text-[10px] font-black text-amber-300 hud-text-stroke">
                N
              </span>
            </div>

            {showTouchControls && !isNarrow && renderSteerPad()}
          </div>

          <div className="flex items-end gap-2 sm:gap-3">
            {showTouchControls && !isNarrow && renderPedals()}
            {renderGauges()}
          </div>
        </div>

        {/* Row B: Dedicated Ergonomic Thumb Strip on Narrow Portrait Mobile (< 640px) */}
        {showTouchControls && isNarrow && (
          <div className="flex items-center justify-between gap-2 pt-0.5">
            {renderSteerPad()}
            {renderPedals()}
          </div>
        )}
      </div>
    </div>
  );
};

