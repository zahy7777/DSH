import type { Context, PluginFunction } from '../../src/kernel/index.ts'

export const localShell = { execute: (command: string) => `local:${command}` }

export const localShellPlugin: PluginFunction = (context) => {
  context.provide('shell', localShell)
}

export class ConsumerPlugin {
  readonly shell: typeof localShell | undefined

  constructor(context: Context) {
    this.shell = context.get('shell') as typeof localShell | undefined
  }
}
