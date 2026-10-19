export type Impl = unknown

export class Registry {
  private readonly implementations = new Map<symbol, Impl>()

  get(label: symbol) {
    return this.implementations.get(label)
  }

  _set(label: symbol, impl: Impl) {
    if (this.implementations.has(label)) {
      throw new Error('implementation is already registered in this isolate')
    }
    this.implementations.set(label, impl)
  }

  _delete(label: symbol) {
    this.implementations.delete(label)
  }
}
