import test from 'node:test';
import assert from 'node:assert/strict';
import {
  groundHeightAt,
  surfaceAt,
  getSpawnForMode,
  getObstaclesForMode,
  getCheckpointsForMode,
  generateWorldProps,
  generateCityBuildings,
  getRampSupportAt,
  CITY_STUNT_RAMPS,
  ROAD_NETWORK,
  CITY_INTERSECTIONS,
  getDistrictName,
  computeCollisionImpactDamage,
  MAIN_BRIDGE_Y,
  NORTH_BRIDGE_Y,
  SOUTH_BRIDGE_Y,
  WATER_Y,
  WORLD_RADIUS,
} from './worldMath';
import { createInitialVehicleState, stepVehiclePhysics } from './vehiclePhysics';
import { getVehicleById, VEHICLES } from './vehiclesData';
import {
  createTrafficAgents,
  stepTrafficAgents,
  createWildlifeAgents,
  stepWildlifeAgents,
  createWorldDynamicState,
  stepWorldDynamicAI,
  createPedestrians,
  stepPedestrians,
  createAircraftAgents,
  stepAircraftAgents,
  createSuperheroAgents,
  stepSuperheroAgents,
  createPoliceAgents,
  stepPoliceAgents,
  createWantedState,
  addWantedHeat,
  stepWantedSystem,
} from './aiSystems';
import { createDefaultSave, unlockVehicleInSave } from './storage';

test('bridge deck provides drivable elevation above the river', () => {
  const mainDeckY = groundHeightAt(0, 0);
  assert.ok(mainDeckY >= MAIN_BRIDGE_Y, `Main bridge deck should be >= ${MAIN_BRIDGE_Y}, got ${mainDeckY}`);
  assert.equal(surfaceAt(0, 0), 'bridge');

  const northDeckY = groundHeightAt(0, -115);
  assert.ok(northDeckY >= NORTH_BRIDGE_Y, `North bridge deck should be >= ${NORTH_BRIDGE_Y}, got ${northDeckY}`);
  assert.equal(surfaceAt(0, -115), 'bridge');

  const southDeckY = groundHeightAt(0, 86);
  assert.ok(southDeckY >= SOUTH_BRIDGE_Y, `South bridge deck should be >= ${SOUTH_BRIDGE_Y}, got ${southDeckY}`);
  assert.equal(surfaceAt(0, 86), 'bridge');

  // River away from bridges is submerged below WATER_Y
  const riverBedY = groundHeightAt(0, 45);
  assert.ok(riverBedY < WATER_Y, `Open river channel should be below WATER_Y (${WATER_Y}), got ${riverBedY}`);
});

test('all game modes spawn player on dry passable road facing open path', () => {
  const modes = ['free', 'gta', 'mission', 'race', 'offroad', 'bridge', 'wildlife', 'stunt'] as const;
  for (const m of modes) {
    const sp = getSpawnForMode(m);
    const surf = surfaceAt(sp.x, sp.z);
    assert.notEqual(surf, 'water', `Spawn for mode ${m} should not be in water`);
    const y = groundHeightAt(sp.x, sp.z);
    assert.ok(y > WATER_Y + 0.5, `Spawn for mode ${m} should be safely above water`);
  }
  assert.ok(getCheckpointsForMode('mission').length >= 4);
  assert.ok(getCheckpointsForMode('gta').length >= 4);
  assert.ok(getObstaclesForMode('bridge').some((o) => o.bridgeOnly));
});

test('vehicle physics accelerates, shifts gears, steers, and stays grounded on bridge', () => {
  const camry = getVehicleById('toyota_camry');
  const sp = getSpawnForMode('free');
  let state = createInitialVehicleState(sp.x, groundHeightAt(sp.x, sp.z), sp.z, sp.yaw);

  // Accelerate forward for 3 seconds toward and onto the main bridge
  for (let i = 0; i < 90; i++) {
    const surf = surfaceAt(state.x, state.z);
    state = stepVehiclePhysics(
      state,
      { throttle: 1, brake: 0, steer: 0, handbrake: false },
      camry,
      surf,
      1 / 30,
      { worldRadius: WORLD_RADIUS, groundHeightAt },
    );
  }

  assert.ok(state.speedMs > 15, `Expected car to accelerate above 15 m/s, got ${state.speedMs}`);
  assert.notEqual(state.gear, 'N');
  assert.notEqual(state.gear, 'R');
  assert.ok(state.x > sp.x + 25, 'Car should move forward in +X direction toward bridge');
  assert.ok(state.fuel < 100, 'Fuel should decrease while driving');

  // Steer left and check yaw changes
  const prevYaw = state.yaw;
  for (let i = 0; i < 20; i++) {
    state = stepVehiclePhysics(
      state,
      { throttle: 0.7, brake: 0, steer: 1, handbrake: false },
      camry,
      surfaceAt(state.x, state.z),
      1 / 30,
      { worldRadius: WORLD_RADIUS, groundHeightAt },
    );
  }
  assert.ok(state.yaw > prevYaw + 0.2, 'Steering left should increase yaw');
});

test('traffic AI advances along road network and wildlife flees approaching car', () => {
  const traffic = createTrafficAgents(6, false);
  assert.equal(traffic.length, 6);
  const initialX = traffic[0].x;
  const initialZ = traffic[0].z;
  for (let i = 0; i < 30; i++) {
    stepTrafficAgents(traffic, { x: 999, z: 999, vx: 0, vz: 0, yaw: 0 }, [], 1 / 30);
  }
  const movedDist = Math.hypot(traffic[0].x - initialX, traffic[0].z - initialZ);
  assert.ok(movedDist > 4, 'Traffic AI should drive along the road network');

  const wildlife = createWildlifeAgents();
  const deer = wildlife.find((w) => w.species === 'deer');
  assert.ok(deer, 'Should include deer in wildlife roster');
  const distBefore = 6;
  stepWildlifeAgents(wildlife, { x: deer.x - distBefore, z: deer.z, speedMs: 15 }, true, 0.05);
  assert.equal(deer.state, 'flee', 'Deer should enter flee state when car approaches or honks');
});

test('world AI cycles dynamic weather and offline storage unlocks vehicles cleanly', () => {
  const world = createWorldDynamicState('dynamic', 'dynamic');
  const startTime = world.timeOfDayNormalized;
  for (let i = 0; i < 40; i++) {
    stepWorldDynamicAI(world, 'dynamic', 'dynamic', 0.05);
  }
  assert.notEqual(world.timeOfDayNormalized, startTime, 'Dynamic time of day should advance');

  const save = createDefaultSave();
  assert.ok(VEHICLES.length >= 16, 'All 16 vehicle models should exist');
  const bmw = getVehicleById('bmw_m4');
  const res = unlockVehicleInSave(save, bmw.id, bmw.cost);
  assert.equal(res.unlocked, true);
  assert.ok(res.save.unlockedVehicleIds.includes('bmw_m4'));
  assert.equal(res.save.credits, save.credits - bmw.cost);
});

test('static world props include trees, rocks, and houses clear of spawns and inflict impact damage', () => {
  const { pines, oaks, rocks, colliders } = generateWorldProps();
  assert.ok(pines.length > 50, 'Should generate pine tree colliders');
  assert.ok(oaks.length > 25, 'Should generate oak tree colliders');
  assert.ok(rocks.length > 25, 'Should generate rock colliders');
  assert.ok(colliders.some((c) => c.kind === 'house'), 'Should include village house colliders');

  const modes = ['free', 'mission', 'race', 'offroad', 'bridge', 'wildlife'] as const;
  for (const m of modes) {
    const sp = getSpawnForMode(m);
    for (const c of colliders) {
      const dist = Math.hypot(sp.x - c.x, sp.z - c.z);
      assert.ok(dist > c.radius + 3.0, `Collider ${c.kind} at (${c.x},${c.z}) too close to spawn ${m}`);
    }
  }

  assert.equal(computeCollisionImpactDamage(1.5, 1.0), 0, 'Tiny scrapes below 2.2 m/s deal 0 damage');
  const treeSlowDmg = computeCollisionImpactDamage(5.0, 1.0);
  const treeFastDmg = computeCollisionImpactDamage(22.0, 1.0);
  const rockFastDmg = computeCollisionImpactDamage(22.0, 1.15);
  assert.ok(treeSlowDmg >= 4, `Moderate tree hit should deal at least 4% damage, got ${treeSlowDmg}`);
  assert.ok(treeFastDmg > treeSlowDmg, 'Faster tree impact should deal more damage');
  assert.ok(rockFastDmg >= treeFastDmg, 'Heavy rock impact should deal at least as much damage as tree hit');
});

test('Lamborghini and Ferrari are unlocked starters, city buildings are clear of spawns, and nitro + stunt ramps work', () => {
  const save = createDefaultSave();
  assert.equal(save.selectedVehicleId, 'lamborghini_aventador');
  assert.ok(save.unlockedVehicleIds.includes('lamborghini_aventador'));
  assert.ok(save.unlockedVehicleIds.includes('ferrari_f8'));

  const buildings = generateCityBuildings();
  assert.ok(buildings.length >= 25, `Expected dense city skyline >= 25 skyscrapers, got ${buildings.length}`);
  assert.ok(buildings.some((b) => (b.height ?? 0) >= 35), 'City should include tall skyscrapers >= 35m');

  const spStunt = getSpawnForMode('stunt');
  assert.notEqual(surfaceAt(spStunt.x, spStunt.z), 'water');
  for (const b of buildings) {
    const hw = b.halfW ?? b.radius;
    const hd = b.halfD ?? b.radius;
    const inside = Math.abs(spStunt.x - b.x) < hw + 3 && Math.abs(spStunt.z - b.z) < hd + 3;
    assert.equal(inside, false, 'Stunt spawn must not overlap any building');
  }

  // Nitro Boost + Ramp launch check
  const lambo = getVehicleById('lamborghini_aventador');
  const ramp = CITY_STUNT_RAMPS[0];
  let boostState = createInitialVehicleState(ramp.x, groundHeightAt(ramp.x, ramp.z - 16), ramp.z - 16, ramp.yaw);
  for (let i = 0; i < 45; i++) {
    boostState = stepVehiclePhysics(
      boostState,
      { throttle: 1, brake: 0, steer: 0, handbrake: false, boost: true },
      lambo,
      'asphalt',
      1 / 30,
      { worldRadius: WORLD_RADIUS, groundHeightAt, getRampSupportAt },
    );
  }
  assert.ok(boostState.nitro < 100, 'Nitro should drain when boosting');
  assert.ok(boostState.speedMs > 25, `Lambo with nitro should accelerate rapidly, got ${boostState.speedMs}`);
  const rampCheck = getRampSupportAt(ramp.x, ramp.z + ramp.length * 0.42);
  assert.equal(rampCheck.onRamp, true);
  assert.equal(rampCheck.atLaunchLip, true);
});

test('pedestrians, aircraft, Flash, and Superman animate across the city', () => {
  const peds = createPedestrians();
  assert.ok(peds.length >= 20);
  const p0x = peds[0].x;
  const p0z = peds[0].z;
  for (let i = 0; i < 30; i++) {
    stepPedestrians(peds, { x: 999, z: 999, speedMs: 0 }, false, 1 / 30);
  }
  assert.ok(Math.hypot(peds[0].x - p0x, peds[0].z - p0z) > 0.5, 'Pedestrians should walk sidewalks');

  const aircraft = createAircraftAgents();
  assert.ok(aircraft.some((a) => a.kind === 'jet'));
  assert.ok(aircraft.some((a) => a.kind === 'helicopter'));
  stepAircraftAgents(aircraft, 0.05);
  const jetX = aircraft[0].x;
  stepAircraftAgents(aircraft, 0.05);
  assert.notEqual(aircraft[0].x, jetX, 'Aircraft should fly across the skyline');

  const heroes = createSuperheroAgents();
  const flash = heroes.find((h) => h.hero === 'flash')!;
  const superman = heroes.find((h) => h.hero === 'superman')!;
  const fx0 = flash.x;
  const sy0 = superman.y;
  for (let i = 0; i < 20; i++) {
    stepSuperheroAgents(heroes, 0.05);
  }
  assert.ok(Math.abs(flash.x - fx0) > 15, 'Flash should sprint at super-speed');
  assert.notEqual(superman.y, sy0, 'Superman should soar dynamically over the skyline');
  assert.ok(superman.y < 30, 'Superman should fly low enough over avenues and bridges to stay visible');
});

test('GTA city grid, police cruiser pursuit, wanted stars, Pay n Spray, and Busted state work offline', () => {
  assert.ok(ROAD_NETWORK.length >= 28, `Expected dense city street grid >= 28 polylines, got ${ROAD_NETWORK.length}`);
  assert.ok(CITY_INTERSECTIONS.length >= 60, `Expected >= 60 city intersections, got ${CITY_INTERSECTIONS.length}`);
  assert.equal(surfaceAt(-72, 28), 'asphalt');
  assert.equal(surfaceAt(72, -58), 'asphalt');
  assert.ok(getDistrictName(-72, 0).length > 3);

  const buildings = generateCityBuildings();
  const gtaSpawn = getSpawnForMode('gta');
  for (const b of buildings) {
    const hw = b.halfW ?? b.radius;
    const hd = b.halfD ?? b.radius;
    assert.equal(
      Math.abs(gtaSpawn.x - b.x) < hw + 2.5 && Math.abs(gtaSpawn.z - b.z) < hd + 2.5,
      false,
      'City buildings must not block GTA spawn',
    );
  }

  const police = createPoliceAgents(5);
  assert.equal(police.length, 5);
  const nearest = police[0];
  const initialDist = Math.hypot(nearest.x - gtaSpawn.x, nearest.z - gtaSpawn.z);

  // At 0 stars, police patrol quietly with sirens off
  stepPoliceAgents(police, { x: gtaSpawn.x, z: gtaSpawn.z, yaw: gtaSpawn.yaw, speedMs: 0 }, 0, buildings, 0.05);
  assert.equal(police.some((p) => p.chasing), false);

  // At 2 stars, closest cruisers activate sirens and close distance toward player
  for (let i = 0; i < 60; i++) {
    stepPoliceAgents(police, { x: gtaSpawn.x, z: gtaSpawn.z, yaw: gtaSpawn.yaw, speedMs: 0 }, 2, buildings, 0.05);
  }
  assert.ok(police.some((p) => p.chasing && p.sirenActive), 'At 2★ police cruisers should engage pursuit sirens');
  const minDistAfter = Math.min(...police.map((p) => Math.hypot(p.x - gtaSpawn.x, p.z - gtaSpawn.z)));
  assert.ok(minDistAfter < initialDist || minDistAfter < 50, 'Chasing police should converge toward wanted player');

  // Wanted state machine: speeding trigger, 5-star cap, Pay n Spray clear, and Busted
  const wanted = createWantedState(0);
  stepWantedSystem(wanted, 15, 130, false, 0.05);
  assert.ok(wanted.stars >= 1, 'Speeding >115 km/h near police should trigger Wanted Star');

  addWantedHeat(wanted, 95);
  assert.equal(wanted.stars, 5, 'Heat should cap at 5 Wanted Stars');

  const sprayed = stepWantedSystem(wanted, 12, 0, true, 0.05);
  assert.equal(sprayed.evaded, true);
  assert.equal(wanted.stars, 0, 'Pay n Spray should clear Wanted Stars');

  const arrestWanted = createWantedState(2);
  let bustedTriggered = false;
  for (let i = 0; i < 70; i++) {
    const res = stepWantedSystem(arrestWanted, 6.0, 2.0, false, 0.05);
    if (res.busted) {
      bustedTriggered = true;
      break;
    }
  }
  assert.equal(bustedTriggered, true, 'Being boxed in by police at < 9 km/h for 2.8s should trigger BUSTED');
});



