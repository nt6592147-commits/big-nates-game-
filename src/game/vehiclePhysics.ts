import { SurfaceType, VehicleSpec } from './types';

export interface VehiclePhysicsState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  vy: number;
  airborne: boolean;
  yaw: number;
  speedMs: number; // signed forward speed in m/s
  steerAngle: number;
  wheelRotation: number;
  pitch: number; // suspension pitch radians
  roll: number; // suspension roll radians
  heave: number; // vertical suspension offset
  heaveVel: number;
  fuel: number; // 0..100
  damage: number; // 0..100
  nitro: number; // 0..100
  isBoosting: boolean;
  rpmRatio: number; // 0..1
  gear: string; // 'P' | 'R' | 'N' | '1'..'6'
  slipRatio: number; // 0..1 for tire sound & skid particles
}

export interface VehicleDriveInput {
  throttle: number; // 0..1
  brake: number; // 0..1 (reverse when stopped)
  steer: number; // -1 (right) to +1 (left)
  handbrake: boolean;
  boost?: boolean;
}

export function createInitialVehicleState(x: number, y: number, z: number, yaw: number): VehiclePhysicsState {
  return {
    x,
    y,
    z,
    vx: 0,
    vz: 0,
    vy: 0,
    airborne: false,
    yaw,
    speedMs: 0,
    steerAngle: 0,
    wheelRotation: 0,
    pitch: 0,
    roll: 0,
    heave: 0,
    heaveVel: 0,
    fuel: 100,
    damage: 0,
    nitro: 100,
    isBoosting: false,
    rpmRatio: 0.14,
    gear: 'N',
    slipRatio: 0,
  };
}

export function getSurfaceGripAndDrag(surface: SurfaceType, spec: VehicleSpec): { grip: number; drag: number; maxSpeedScale: number } {
  switch (surface) {
    case 'asphalt':
    case 'bridge':
      return { grip: 1.0, drag: 0.32, maxSpeedScale: 1.0 };
    case 'dirt':
      return { grip: 0.55 + spec.offroadGrip * 0.42, drag: 0.65, maxSpeedScale: 0.68 + spec.offroadGrip * 0.22 };
    case 'mud':
      return { grip: 0.35 + spec.offroadGrip * 0.45, drag: 1.55 - spec.offroadGrip * 0.5, maxSpeedScale: 0.45 + spec.offroadGrip * 0.28 };
    case 'water':
      return { grip: 0.4, drag: 2.2, maxSpeedScale: 0.36 + spec.offroadGrip * 0.2 };
    case 'grass':
    default:
      return { grip: 0.62 + spec.offroadGrip * 0.32, drag: 0.58, maxSpeedScale: 0.72 + spec.offroadGrip * 0.18 };
  }
}

export function computeGearAndRpm(speedMs: number, maxSpeedMs: number, throttle: number): { gear: string; rpmRatio: number } {
  const absSpeed = Math.abs(speedMs);
  if (speedMs < -0.5) {
    return {
      gear: 'R',
      rpmRatio: Math.min(1, 0.22 + (absSpeed / (maxSpeedMs * 0.35)) * 0.78),
    };
  }
  if (absSpeed < 0.45 && throttle < 0.05) {
    return { gear: 'N', rpmRatio: 0.14 };
  }
  const ratio = Math.min(1, absSpeed / Math.max(8, maxSpeedMs));
  const gearNum = Math.min(6, Math.max(1, Math.floor(ratio * 5.99) + 1));
  const gearMin = (gearNum - 1) / 6;
  const gearSpan = 1 / 6;
  const inGear = (ratio - gearMin) / gearSpan;
  const rpm = Math.min(1, Math.max(0.22, 0.25 + inGear * 0.68 + throttle * 0.12));
  return { gear: String(gearNum), rpmRatio: rpm };
}

export function stepVehiclePhysics(
  state: VehiclePhysicsState,
  input: VehicleDriveInput,
  spec: VehicleSpec,
  surface: SurfaceType,
  dt: number,
  options: {
    worldRadius: number;
    groundHeightAt: (x: number, z: number) => number;
    getRampSupportAt?: (x: number, z: number) => { onRamp: boolean; rampY: number; atLaunchLip: boolean; rampYaw: number };
    bumpImpulse?: number;
    infiniteFuel?: boolean;
  },
): VehiclePhysicsState {
  const clampedDt = Math.min(Math.max(dt, 0.001), 0.05);
  const maxSpeedMs = (spec.maxSpeedKmh / 3.6);
  const surf = getSurfaceGripAndDrag(surface, spec);

  // Nitro boost state
  const wantsBoost = Boolean(input.boost) && state.nitro > 1.5 && (input.throttle > 0.05 || state.speedMs > 4);
  state.isBoosting = wantsBoost;
  if (wantsBoost) {
    state.nitro = Math.max(0, state.nitro - 26 * clampedDt);
  } else {
    state.nitro = Math.min(100, state.nitro + 9 * clampedDt);
  }
  const boostSpeedMult = wantsBoost ? 1.28 : 1.0;
  const boostAccelMult = wantsBoost ? 1.65 : 1.0;
  const effectiveMaxSpeed = maxSpeedMs * surf.maxSpeedScale * boostSpeedMult;

  // Vehicle forward & right unit vectors (yaw = 0 -> +Z, yaw = PI/2 -> +X)
  const fx = Math.sin(state.yaw);
  const fz = Math.cos(state.yaw);
  const rx = Math.cos(state.yaw);
  const rz = -Math.sin(state.yaw);

  // Decompose current world velocity into forward and lateral components
  let vForward = state.vx * fx + state.vz * fz;
  let vLateral = state.vx * rx + state.vz * rz;

  // Damage reduces engine output slightly
  const healthScale = Math.max(0.45, 1 - (state.damage / 100) * 0.48);
  const hasFuel = options.infiniteFuel || state.fuel > 0.1;

  // Longitudinal acceleration / braking / reverse (reduced traction while airborne)
  const airGripScale = state.airborne ? 0.12 : 1.0;
  let longAccel = 0;
  if ((input.throttle > 0 || wantsBoost) && hasFuel) {
    const driveThrottle = Math.max(input.throttle, wantsBoost ? 1 : 0);
    const speedRatio = Math.max(0, vForward / Math.max(1, effectiveMaxSpeed));
    const torqueCurve = Math.max(0.14, 1 - speedRatio * 0.82);
    longAccel += driveThrottle * spec.accelForce * boostAccelMult * surf.grip * healthScale * torqueCurve * airGripScale;
  }

  if (input.brake > 0 && !state.airborne) {
    if (vForward > 0.8) {
      longAccel -= input.brake * spec.brakeForce * surf.grip;
    } else if (hasFuel) {
      // Reverse gear
      const revMax = effectiveMaxSpeed * 0.32;
      const revScale = Math.max(0, 1 - Math.abs(vForward) / Math.max(2, revMax));
      longAccel -= input.brake * spec.accelForce * 0.55 * revScale;
    }
  }

  if (input.handbrake && !state.airborne) {
    const sign = vForward >= 0 ? 1 : -1;
    if (Math.abs(vForward) > 0.5) {
      longAccel -= sign * spec.brakeForce * 0.75;
    } else {
      vForward = 0;
    }
  }

  // Rolling resistance & aerodynamic drag
  const aeroDrag = 0.0042 * vForward * Math.abs(vForward);
  const rollDrag = (state.airborne ? 0.08 : surf.drag) * vForward;
  vForward += (longAccel - aeroDrag - rollDrag) * clampedDt;

  // Clamp forward speed
  const minRev = -effectiveMaxSpeed * 0.34;
  if (vForward > effectiveMaxSpeed) vForward = effectiveMaxSpeed;
  if (vForward < minRev) vForward = minRev;
  if (!state.airborne && Math.abs(vForward) < 0.06 && input.throttle < 0.05 && input.brake < 0.05 && !wantsBoost) {
    vForward = 0;
  }

  // Smooth steering angle
  const targetSteer = input.steer * 0.54;
  state.steerAngle += (targetSteer - state.steerAngle) * Math.min(1, clampedDt * 9.5);

  // Speed-sensitive turn rate
  const absSpeed = Math.abs(vForward);
  const speedTurnFactor = Math.min(1, absSpeed / 4.0) * (1 / (1 + absSpeed * 0.028));
  const steerDir = vForward >= -0.05 ? 1 : -1;
  const handbrakeTurnBoost = input.handbrake ? 1.38 : 1.0;
  const yawRate =
    state.steerAngle *
    spec.handling *
    2.55 *
    speedTurnFactor *
    steerDir *
    handbrakeTurnBoost *
    (state.airborne ? 0.25 : 1.0);
  state.yaw += yawRate * clampedDt;

  // Lateral tire friction (controls drift vs grip)
  const lateralGrip = (state.airborne ? 0.35 : input.handbrake ? 2.1 : 6.8) * surf.grip * spec.handling;
  vLateral *= Math.exp(-lateralGrip * clampedDt);

  // Slip ratio for audio & particle dust/skids
  const lateralSlip = state.airborne ? 0 : Math.min(1, Math.abs(vLateral) / 6.5);
  const accelSlip = !state.airborne && (surface === 'dirt' || surface === 'mud') ? Math.min(0.8, absSpeed / 18) : 0;
  state.slipRatio = Math.max(lateralSlip, !state.airborne && input.handbrake && absSpeed > 4 ? 0.85 : 0, accelSlip);

  // Reconstruct world velocity
  const nfx = Math.sin(state.yaw);
  const nfz = Math.cos(state.yaw);
  const nrx = Math.cos(state.yaw);
  const nrz = -Math.sin(state.yaw);

  state.vx = nfx * vForward + nrx * vLateral;
  state.vz = nfz * vForward + nrz * vLateral;
  state.speedMs = vForward;

  // Integrate position
  let nextX = state.x + state.vx * clampedDt;
  let nextZ = state.z + state.vz * clampedDt;

  // Natural mountain perimeter boundary (soft pushback at WORLD_RADIUS - 14)
  const maxR = options.worldRadius - 14;
  const r = Math.hypot(nextX, nextZ);
  if (r > maxR) {
    const scale = maxR / r;
    nextX *= scale;
    nextZ *= scale;
    state.vx *= 0.4;
    state.vz *= 0.4;
    state.speedMs *= 0.4;
  }

  // Terrain & Stunt Ramp elevation + airborne ballistic arc
  let supportY = options.groundHeightAt(nextX, nextZ);
  const rampInfo = options.getRampSupportAt?.(nextX, nextZ);
  if (rampInfo && rampInfo.onRamp && rampInfo.rampY > supportY) {
    supportY = rampInfo.rampY;
    if (rampInfo.atLaunchLip && absSpeed > 12 && !state.airborne) {
      state.vy = Math.min(15.5, 4.8 + absSpeed * 0.28);
      state.airborne = true;
    }
  }

  state.x = nextX;
  state.z = nextZ;

  if (state.airborne) {
    state.vy -= 19.5 * clampedDt;
    state.y += state.vy * clampedDt;
    if (state.y <= supportY + 0.05) {
      state.y = supportY;
      if (state.vy < -6) {
        state.heaveVel = Math.max(-2.6, state.vy * 0.22);
      }
      state.vy = 0;
      state.airborne = false;
    }
  } else {
    if (state.y > supportY + 0.85) {
      state.airborne = true;
      state.vy = Math.max(0, state.vy);
    } else {
      state.y += (supportY - state.y) * Math.min(1, clampedDt * 24);
      state.vy = 0;
    }
  }

  // Wheel rotation
  state.wheelRotation += (vForward / Math.max(0.25, spec.wheelRadius)) * clampedDt;

  // Suspension pitch (accel/brake/air nose attitude), roll (cornering), and heave (bumps/surface roughness)
  const targetPitch = state.airborne
    ? Math.max(-0.22, Math.min(0.22, -state.vy * 0.018))
    : Math.max(-0.075, Math.min(0.075, (-longAccel * 0.0014) / spec.suspensionStiffness));
  const targetRoll = state.airborne
    ? 0
    : Math.max(-0.09, Math.min(0.09, (yawRate * Math.min(18, absSpeed) * 0.0045) / spec.suspensionStiffness));
  state.pitch += (targetPitch - state.pitch) * Math.min(1, clampedDt * 8.5 * spec.suspensionDamping);
  state.roll += (targetRoll - state.roll) * Math.min(1, clampedDt * 8.5 * spec.suspensionDamping);

  const surfaceChatter =
    (!state.airborne && (surface === 'dirt' || surface === 'mud') ? Math.sin(state.wheelRotation * 1.4) * 0.018 : 0) +
    (options.bumpImpulse ?? 0) * 0.08;
  const springForce = -state.heave * 45 * spec.suspensionStiffness - state.heaveVel * 8.5 * spec.suspensionDamping;
  state.heaveVel += (springForce + surfaceChatter * 22) * clampedDt;
  state.heave = Math.max(-0.16, Math.min(0.16, state.heave + state.heaveVel * clampedDt));

  // Fuel consumption
  if (!options.infiniteFuel && state.fuel > 0) {
    const burnRate = (0.04 + input.throttle * 0.24 + (absSpeed / 60) * 0.14) * clampedDt;
    state.fuel = Math.max(0, state.fuel - burnRate);
  }

  // Gear & RPM
  const gearInfo = computeGearAndRpm(state.speedMs, effectiveMaxSpeed, wantsBoost ? 1 : input.throttle);
  state.gear = gearInfo.gear;
  state.rpmRatio = gearInfo.rpmRatio;

  return state;
}
