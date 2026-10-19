import { Fiber } from './fiber.ts'
import type { EffectSetup } from './fiber.ts'
import { runPlugin, type PluginDefinition } from './plugin.ts'
import { Isolate } from './isolate.ts'
import type { ServiceName } from './isolate.ts'
import { Registry, type Impl } from './registry.ts'

export class Context {
  readonly fiber: Fiber
  readonly isolate: Isolate
  readonly registry: Registry

  constructor(registry = new Registry()) {
    this.registry = registry
    this.isolate = new Isolate()
    this.fiber = new Fiber(this)
  }

  mount(definition: PluginDefinition) {
    const child = new Context(this.registry)
    const release = this.effect(() => () => child.fiber.dispose())

    try {
      runPlugin(definition, child)
    } catch (error) {
      release()
      throw error
    }

    return child
  }

  effect(setup: EffectSetup) {
    return this.fiber.effect(setup)
  }

  provide(serviceName: ServiceName, impl: Impl) {
    return this.effect(() => {
      const label = this.isolate._ensure(serviceName)
      this.registry._set(label, impl)

      return () => {
        this.registry._delete(label)
      }
    })
  }

  get(serviceName: ServiceName) {
    const label = this.isolate.resolve(serviceName)
    if (label === undefined) return undefined
    return this.registry.get(label)
  }
}
