import { Context } from './context.ts'

export { Context } from './context.ts'
export { Isolate } from './isolate.ts'
export { Registry } from './registry.ts'
export { Fiber } from './fiber.ts'
export type {
  Disposer,
  EffectSetup,
  FiberState,
} from './fiber.ts'
export type { PluginConstructor, PluginDefinition, PluginFunction } from './plugin.ts'
export type { ServiceName } from './isolate.ts'
export type { Impl } from './registry.ts'

export function createRootContext() {
  return new Context()
}
