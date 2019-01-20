export class BaseMetadataStorage<T> {
  protected items: T[] = [];

  collect(definition: T) {
    this.items.push(definition);
  }

  unshift(...definitions: T[]) {
    this.items.unshift(...definitions);
  }

  get isEmpty(): boolean {
    return this.items.length === 0;
  }

  clear() {
    this.items = [];
  }

  *[Symbol.iterator]() {
    for (const item of this.items) {
      yield item;
    }
  }
}
