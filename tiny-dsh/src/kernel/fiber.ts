import type { Context } from './context.ts'

export type Disposer = () => void

export type EffectSetup = () => Disposer

export type FiberState = 'active' | 'disposing' | 'disposed'

interface EffectEntry {
  active: boolean
  dispose: Disposer
}

export class Fiber {
  readonly context: Context
  private _state: FiberState = 'active'
  private readonly effects: EffectEntry[] = []

  constructor(context: Context) {
    this.context = context
  }

  get state() {
    return this._state
  }

  effect(setup: EffectSetup): Disposer {
    if (this._state !== 'active') {
      throw new Error('cannot create an effect on an inactive fiber')
    }

    const disposer = setup()
    const entry: EffectEntry = { active: true, dispose: disposer }
    this.effects.push(entry)

    return () => this.disposeEntry(entry)
  }

  dispose() {
    if (this._state === 'disposed' || this._state === 'disposing') return
    this._state = 'disposing'

    let firstError: unknown
    for (const entry of [...this.effects].reverse()) {
      try {
        this.disposeEntry(entry)
      } catch (error) {
        firstError ??= error
      }
    }

    this._state = 'disposed'
    if (firstError) throw firstError
  }

  private disposeEntry(entry: EffectEntry) {
    if (!entry.active) return
    entry.active = false
    const index = this.effects.indexOf(entry)
    if (index >= 0) this.effects.splice(index, 1)
    entry.dispose()
  }
}
