import assert from 'node:assert/strict'
import { createRootContext } from '../../src/kernel/index.ts'
import { ConsumerPlugin, localShell, localShellPlugin } from '../fixture/plugins.ts'

const root = createRootContext()
const provider = root.mount(localShellPlugin)
const consumer = provider.mount(ConsumerPlugin)

assert.equal(provider.get('shell'), localShell)
assert.equal(consumer.get('shell'), undefined)
assert.equal(provider.fiber.state, 'active')

provider.fiber.dispose()
assert.equal(root.get('shell'), undefined)
assert.equal(consumer.get('shell'), undefined)
assert.equal(consumer.fiber.state, 'disposed')

const events: string[] = []
const disposable = root.effect(() => {
  events.push('setup')
  return () => events.push('dispose')
})

disposable()
disposable()
assert.deepEqual(events, ['setup', 'dispose'])

root.fiber.dispose()
assert.equal(root.fiber.state, 'disposed')

console.log('c1 ok: context, fiber, effect, registry, isolate')
