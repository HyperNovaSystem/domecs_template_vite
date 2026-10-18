import {
  Has,
  OnChanged,
  createWorld,
  defineComponent,
  defineEvent,
  entry,
  type Entity,
  type EntityView,
  type World,
} from '@domecs/core'

export const ARENA = {
  width: 720,
  height: 420,
} as const

export const FX_NAMES = ['once', 'fixed', 'tick', 'event', 'reactive'] as const
export type FxName = (typeof FX_NAMES)[number]

export interface PositionValue {
  x: number
  y: number
}

export interface VelocityValue {
  x: number
  y: number
}

export interface ActorValue {
  kind: 'player' | 'drone' | 'beacon' | 'pulse'
  label: string
  fx: FxName
  color: string
  size: number
}

export interface PulseValue {
  age: number
  duration: number
  radius: number
  alpha: number
}

export interface DemoStatsValue {
  runs: Record<FxName, number>
  booted: boolean
  pulseCount: number
  lastEvent: string
  lastReactive: string
}

export interface SpawnPulsePayload {
  x: number
  y: number
  source: string
}

export interface DemoWorld {
  world: World
  statsId: Entity
  playerId: Entity
  droneId: Entity
  emitPulse(payload?: Partial<SpawnPulsePayload>): void
  stats(): DemoStatsValue
}

export const Position = defineComponent<PositionValue>('Position', {
  defaults: { x: 0, y: 0 },
})

export const Velocity = defineComponent<VelocityValue>('Velocity', {
  defaults: { x: 0, y: 0 },
})

export const Actor = defineComponent<ActorValue>('Actor')
export const Pulse = defineComponent<PulseValue>('Pulse')
export const DemoStats = defineComponent<DemoStatsValue>('DemoStats')

export const SpawnPulse = defineEvent<SpawnPulsePayload>('SpawnPulse')

export function createDemoWorld(options: { headless?: boolean } = {}): DemoWorld {
  const world = createWorld({
    seed: 0xd0ec5,
    fixedStep: 1 / 60,
    headless: options.headless ?? false,
  })

  const statsId = world.spawn([
    entry(DemoStats, createStats()),
  ])

  const playerId = world.spawn([
    entry(Position, { x: ARENA.width * 0.5, y: ARENA.height * 0.58 }),
    entry(Velocity, { x: 0, y: 0 }),
    entry(Actor, {
      kind: 'player',
      label: 'T',
      fx: 'tick',
      color: '#2f80ed',
      size: 38,
    }),
  ])

  const droneId = world.spawn([
    entry(Position, { x: ARENA.width * 0.28, y: ARENA.height * 0.36 }),
    entry(Velocity, { x: 72, y: 48 }),
    entry(Actor, {
      kind: 'drone',
      label: 'F',
      fx: 'fixed',
      color: '#12a182',
      size: 30,
    }),
  ])

  const demo: DemoWorld = {
    world,
    statsId,
    playerId,
    droneId,
    emitPulse(payload = {}) {
      const position = world.getComponent(playerId, Position)
      world.emit(SpawnPulse, {
        x: clamp(payload.x ?? position?.x ?? ARENA.width / 2, 24, ARENA.width - 24),
        y: clamp(payload.y ?? position?.y ?? ARENA.height / 2, 24, ARENA.height - 24),
        source: payload.source ?? 'button',
      })
    },
    stats() {
      return getStats(world, statsId)
    },
  }

  world.system('fx.once.bootstrap', { schedule: 'once' }, () => {
    const stats = getStats(world, statsId)
    stats.booted = true
    stats.runs.once += 1
    world.markChanged(statsId, DemoStats)

    world.spawn([
      entry(Position, { x: ARENA.width * 0.78, y: ARENA.height * 0.26 }),
      entry(Actor, {
        kind: 'beacon',
        label: '1',
        fx: 'once',
        color: '#f2b705',
        size: 34,
      }),
    ])
  })

  world.system(
    'fx.fixed.pulse-lifetimes',
    { schedule: 'fixed', query: Has(Pulse) },
    ({ entities, time }) => {
      const stats = getStats(world, statsId)
      stats.runs.fixed += 1

      let expired = 0
      for (const view of entities as EntityView[]) {
        const pulse = world.getComponent(view.id, Pulse)
        if (!pulse) continue
        pulse.age += time.fixedStep
        pulse.radius = 18 + pulse.age * 145
        pulse.alpha = Math.max(0, 1 - pulse.age / pulse.duration)
        if (pulse.age >= pulse.duration) {
          world.despawn(view.id)
          expired += 1
        } else {
          world.markChanged(view.id, Pulse)
        }
      }

      if (expired > 0) {
        stats.pulseCount = Math.max(0, stats.pulseCount - expired)
      }
      world.markChanged(statsId, DemoStats)
    },
  )

  world.system(
    'fx.tick.input-and-motion',
    { schedule: 'tick', query: [Position, Velocity] },
    ({ entities, input, time }) => {
      const stats = getStats(world, statsId)
      stats.runs.tick += 1

      const playerVelocity = world.getComponent(playerId, Velocity)
      if (playerVelocity) {
        const speed = input.mods.shift ? 230 : 150
        playerVelocity.x = axis(input.keys, 'ArrowLeft', 'KeyA', 'ArrowRight', 'KeyD') * speed
        playerVelocity.y = axis(input.keys, 'ArrowUp', 'KeyW', 'ArrowDown', 'KeyS') * speed
        world.markChanged(playerId, Velocity)
      }

      if (input.keyDelta.pressed.has('Space')) {
        const position = world.getComponent(playerId, Position)
        if (position) {
          world.emit(SpawnPulse, { x: position.x, y: position.y, source: 'keyboard' })
        }
      }

      for (const view of entities as EntityView[]) {
        const position = world.getComponent(view.id, Position)
        const velocity = world.getComponent(view.id, Velocity)
        if (!position || !velocity) continue

        const previousX = position.x
        const previousY = position.y
        position.x += velocity.x * time.scaledDelta
        position.y += velocity.y * time.scaledDelta
        bounce(position, velocity)

        if (position.x !== previousX || position.y !== previousY) {
          world.markChanged(view.id, Position)
        }
      }

      world.markChanged(statsId, DemoStats)
    },
  )

  world.system(
    'fx.event.spawn-pulse',
    { schedule: 'event', triggers: [SpawnPulse] },
    ({ events }) => {
      const pulses = events.of(SpawnPulse)
      if (pulses.length === 0) return

      const stats = getStats(world, statsId)
      stats.runs.event += pulses.length
      stats.lastEvent = `${pulses.length} pulse from ${pulses[pulses.length - 1]?.source ?? 'event'}`

      for (const payload of pulses) {
        world.spawn([
          entry(Position, { x: payload.x, y: payload.y }),
          entry(Pulse, { age: 0, duration: 0.7, radius: 18, alpha: 1 }),
          entry(Actor, {
            kind: 'pulse',
            label: '',
            fx: 'event',
            color: '#e94f37',
            size: 36,
          }),
        ])
        stats.pulseCount += 1
      }
      world.markChanged(statsId, DemoStats)
    },
  )

  world.system(
    'fx.reactive.position-watch',
    {
      schedule: 'reactive',
      query: OnChanged(Position),
      reactsTo: OnChanged(Position),
    },
    ({ entities }) => {
      const changed = (entities as EntityView[]).length
      if (changed === 0) return
      const stats = getStats(world, statsId)
      stats.runs.reactive += 1
      stats.lastReactive = `${changed} changed position${changed === 1 ? '' : 's'}`
      world.markChanged(statsId, DemoStats)
    },
  )

  return demo
}

function createStats(): DemoStatsValue {
  return {
    runs: {
      once: 0,
      fixed: 0,
      tick: 0,
      event: 0,
      reactive: 0,
    },
    booted: false,
    pulseCount: 0,
    lastEvent: 'none',
    lastReactive: 'none',
  }
}

function getStats(world: World, statsId: Entity): DemoStatsValue {
  const stats = world.getComponent(statsId, DemoStats)
  if (!stats) throw new Error('DOMECS template stats entity is missing')
  return stats
}

function axis(
  keys: ReadonlySet<string>,
  negativeArrow: string,
  negativeKey: string,
  positiveArrow: string,
  positiveKey: string,
): number {
  const negative = keys.has(negativeArrow) || keys.has(negativeKey)
  const positive = keys.has(positiveArrow) || keys.has(positiveKey)
  return positive === negative ? 0 : positive ? 1 : -1
}

function bounce(position: PositionValue, velocity: VelocityValue): void {
  const radius = 20
  if (position.x < radius) {
    position.x = radius
    velocity.x = Math.abs(velocity.x)
  } else if (position.x > ARENA.width - radius) {
    position.x = ARENA.width - radius
    velocity.x = -Math.abs(velocity.x)
  }

  if (position.y < radius) {
    position.y = radius
    velocity.y = Math.abs(velocity.y)
  } else if (position.y > ARENA.height - radius) {
    position.y = ARENA.height - radius
    velocity.y = -Math.abs(velocity.y)
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
