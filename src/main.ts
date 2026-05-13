import { Has, type EntityView } from '@domecs/core'
import { defineView, mountDOM } from '@domecs/dom'
import { createInputPlugin } from '@domecs/input'
import {
  Actor,
  ARENA,
  FX_NAMES,
  Position,
  Pulse,
  createDemoWorld,
  type ActorValue,
  type PositionValue,
  type PulseValue,
} from './sim.js'
import domecsMarkUrl from './assets/domecs-mark.svg'
import './styles.css'

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('missing #app')

app.innerHTML = `
  <main class="shell">
    <header class="topbar">
      <div>
        <h1><img class="brand-mark" src="${domecsMarkUrl}" alt="" />DOMECS FX Lab</h1>
        <p>Vite template app</p>
      </div>
      <div class="controls">
        <button id="pulse-button" type="button">Pulse</button>
        <button id="pause-button" type="button">Pause</button>
      </div>
    </header>
    <section class="workspace">
      <div class="stage-shell">
        <div id="stage" class="stage" aria-label="DOMECS demo stage"></div>
      </div>
      <aside class="hud">
        <div class="clock">
          <span>tick</span>
          <strong id="tick-value">0</strong>
        </div>
        <div id="fx-grid" class="fx-grid"></div>
        <div class="readout">
          <span id="event-line">event: none</span>
          <span id="reactive-line">reactive: none</span>
          <span id="pulse-line">pulses: 0</span>
        </div>
      </aside>
    </section>
  </main>
`

const stage = mustQuery<HTMLDivElement>('#stage')
const fxGrid = mustQuery<HTMLDivElement>('#fx-grid')
const tickValue = mustQuery<HTMLElement>('#tick-value')
const eventLine = mustQuery<HTMLElement>('#event-line')
const reactiveLine = mustQuery<HTMLElement>('#reactive-line')
const pulseLine = mustQuery<HTMLElement>('#pulse-line')
const pulseButton = mustQuery<HTMLButtonElement>('#pulse-button')
const pauseButton = mustQuery<HTMLButtonElement>('#pause-button')

const demo = createDemoWorld()
const { world } = demo

world.use(
  createInputPlugin({
    keyTarget: document,
    pointerTarget: stage,
    wheelTarget: stage,
    preventDefaultKeys: true,
  }),
)

const fxRows = new Map<string, HTMLElement>()
for (const fx of FX_NAMES) {
  const row = document.createElement('div')
  row.className = `fx-row fx-row-${fx}`
  row.innerHTML = `<span>${fx}</span><strong>0</strong>`
  fxGrid.appendChild(row)
  fxRows.set(fx, row)
}

const actorView = defineView({
  slot: 'stage',
  query: Has(Actor),
  changedOn: [Position, Actor, Pulse],
  create(entity) {
    const el = document.createElement('div')
    renderActor(el, entity)
    return el
  },
  update(el, entity) {
    renderActor(el, entity)
  },
})

mountDOM(world, {
  slots: { stage },
  views: [actorView],
})

pulseButton.addEventListener('click', () => {
  demo.emitPulse({ source: 'button' })
})

stage.addEventListener('pointerdown', (event) => {
  const rect = stage.getBoundingClientRect()
  const scaleX = ARENA.width / rect.width
  const scaleY = ARENA.height / rect.height
  demo.emitPulse({
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
    source: 'stage',
  })
})

let paused = false
pauseButton.addEventListener('click', () => {
  paused = !paused
  if (paused) {
    world.pause()
    pauseButton.textContent = 'Resume'
  } else {
    world.resume()
    pauseButton.textContent = 'Pause'
  }
})

world.signals.tickEnd.subscribe(() => {
  paintHud()
})

world.step(0)
paintHud()
const stop = world.start({ dtClampMs: 80 })
window.addEventListener('beforeunload', stop)

function renderActor(el: HTMLElement, entity: EntityView): void {
  const position = entity.Position as PositionValue | undefined
  const actor = entity.Actor as ActorValue | undefined
  const pulse = entity.Pulse as PulseValue | undefined
  if (!position || !actor) return

  const size = pulse ? pulse.radius * 2 : actor.size
  el.className = `actor actor-${actor.kind}`
  el.textContent = actor.label
  el.style.left = `${position.x - size / 2}px`
  el.style.top = `${position.y - size / 2}px`
  el.style.width = `${size}px`
  el.style.height = `${size}px`
  el.style.backgroundColor = actor.color
  el.style.opacity = String(pulse?.alpha ?? 1)
  el.style.borderColor = actor.color
  el.dataset.fx = actor.fx
}

function paintHud(): void {
  const stats = demo.stats()
  tickValue.textContent = world.time.tick.toString()
  for (const fx of FX_NAMES) {
    const row = fxRows.get(fx)
    const value = row?.querySelector('strong')
    if (value) value.textContent = stats.runs[fx].toString()
  }
  eventLine.textContent = `event: ${stats.lastEvent}`
  reactiveLine.textContent = `reactive: ${stats.lastReactive}`
  pulseLine.textContent = `pulses: ${stats.pulseCount}`
}

function mustQuery<T extends Element>(selector: string): T {
  const el = document.querySelector<T>(selector)
  if (!el) throw new Error(`template UI missing ${selector}`)
  return el
}
