import { Has } from '@domecs/core'
import { describe, expect, it } from 'vitest'
import { DemoStats, Pulse, createDemoWorld } from './sim.js'

describe('DOMECS Vite template fx demo', () => {
  it('runs once, fixed, tick, and reactive fx on the first real step', () => {
    const demo = createDemoWorld({ headless: true })

    demo.world.step(1 / 60)
    const stats = demo.world.getComponent(demo.statsId, DemoStats)!

    expect(stats.runs.once).toBe(1)
    expect(stats.runs.fixed).toBe(1)
    expect(stats.runs.tick).toBe(1)
    expect(stats.runs.reactive).toBeGreaterThanOrEqual(1)

    demo.world.step(1 / 60)
    expect(stats.runs.once).toBe(1)
  })

  it('uses event fx to spawn a pulse', () => {
    const demo = createDemoWorld({ headless: true })

    demo.emitPulse({ x: 120, y: 80, source: 'test' })
    demo.world.step(1 / 60)

    const stats = demo.world.getComponent(demo.statsId, DemoStats)!
    expect(stats.runs.event).toBe(1)
    expect(pulseCount(demo)).toBe(1)
  })

  it('uses fixed fx to expire pulses deterministically', () => {
    const demo = createDemoWorld({ headless: true })
    demo.emitPulse({ x: 120, y: 80, source: 'test' })

    demo.world.step(1 / 60)
    expect(pulseCount(demo)).toBe(1)

    demo.world.stepN(60, 1 / 60)
    expect(pulseCount(demo)).toBe(0)
  })
})

function pulseCount(demo: ReturnType<typeof createDemoWorld>): number {
  const query = demo.world.query(Has(Pulse))
  const size = query.size
  query.dispose()
  return size
}
