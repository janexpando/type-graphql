import {
  ResolverClassMetadata,
  BaseResolverMetadata,
  MiddlewareMetadata,
  FieldResolverMetadata,
} from "./definitions";
import { Middleware } from "../interfaces/Middleware";
import { isThrowing } from "../helpers/isThrowing";
import { TargetSpecificStorage } from "./storages/target-specific";

export function mapSuperResolverHandlers<T extends BaseResolverMetadata>(
  definitions: TargetSpecificStorage<T>,
  superResolver: Function,
  resolverMetadata: ResolverClassMetadata,
): T[] {
  const superMetadata = definitions.findMany(superResolver);

  return superMetadata.map<T>(metadata => ({
    ...(metadata as any),
    target: resolverMetadata.target,
    resolverClassMetadata: resolverMetadata,
  }));
}

export function mapSuperFieldResolverHandlers(
  definitions: TargetSpecificStorage<FieldResolverMetadata>,
  superResolver: Function,
  resolverMetadata: ResolverClassMetadata,
): FieldResolverMetadata[] {
  const superMetadata = mapSuperResolverHandlers(definitions, superResolver, resolverMetadata);

  return superMetadata.map<FieldResolverMetadata>(metadata => ({
    ...metadata,
    getObjectType: isThrowing(metadata.getObjectType!)
      ? resolverMetadata.getObjectType!
      : metadata.getObjectType!,
  }));
}

export function mapMiddlewareMetadataToArray(
  metadata: MiddlewareMetadata[],
): Array<Middleware<any>> {
  return metadata
    .map(m => m.middlewares)
    .reduce<Array<Middleware<any>>>(
      (middlewares, resultArray) => resultArray.concat(middlewares),
      [],
    );
}
