export type ServiceName = string

export class Isolate {
  private readonly bindings = new Map<ServiceName, symbol>()

  resolve(serviceName: ServiceName): symbol | undefined {
    return this.bindings.get(serviceName)
  }

  _ensure(serviceName: ServiceName) {
    let label = this.bindings.get(serviceName)
    if (!label) {
      label = Symbol(serviceName)
      this.bindings.set(serviceName, label)
    }
    return label
  }
}
