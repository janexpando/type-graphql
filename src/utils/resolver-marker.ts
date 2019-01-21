export const IS_RESOLVER = Symbol.for("is resolver");

export class ResolverMarker {
  static mark(target: Function) {
    (target as any)[IS_RESOLVER] = true;
  }

  static isResolver(target: Function): boolean {
    return (target as any)[IS_RESOLVER];
  }
}
