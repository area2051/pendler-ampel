export class MemoryStorage {
  constructor(initial = {}) {
    this.data = structuredClone(initial);
  }

  async get(keys = null) {
    if (keys === null) return structuredClone(this.data);
    const names = typeof keys === "string" ? [keys] : keys;
    return Object.fromEntries(
      names.filter((name) => Object.hasOwn(this.data, name)).map((name) => [name, structuredClone(this.data[name])]),
    );
  }

  async set(values) {
    Object.assign(this.data, structuredClone(values));
  }

  async remove(keys) {
    for (const key of typeof keys === "string" ? [keys] : keys) delete this.data[key];
  }

  async clear() {
    this.data = {};
  }
}
