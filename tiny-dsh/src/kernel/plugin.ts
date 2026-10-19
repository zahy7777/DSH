import type { Context } from './context.ts'

export type PluginFunction = (context: Context) => void

export type PluginConstructor = new (context: Context) => unknown

export type PluginDefinition = PluginFunction | PluginConstructor

export function runPlugin(definition: PluginDefinition, context: Context) {
  if (isClassDefinition(definition)) new definition(context)
  else definition(context)
}

function isClassDefinition(definition: PluginDefinition): definition is PluginConstructor {
  return /^class\s/.test(Function.prototype.toString.call(definition))
}
