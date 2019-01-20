import { MetadataStorage } from "../metadata/metadata-storage";
import { ResolverMetadataStorage } from "./storages/resolver";
import { SubscriptionResolverMetadataStorage } from "./storages/subscription-resolver";
import { FieldResolverMetadataStorage } from "./storages/field-resolver";
import { ClassMetadataStorage } from "./storages/class";
import { AuthorizedMetadataStorage } from "./storages/authorized";
import { EnumMetadataStorage } from "./storages/enum";
import { UnionMetadataStorage } from "./storages/union";
import { MiddlewareMetadataStorage } from "./storages/middleware";
import { ResolverClassMetadataStorage } from "./storages/resolver-class";
import { FieldMetadataStorage } from "./storages/field";
import { ParamMetadataStorage } from "./storages/param";
import { ClassMetadataBuilder } from "./builders/class";
import { ResolverClassMetadataBuilder } from "./builders/resolver-class";
import { BaserResolverMetadataBuilder } from "./builders/base-resolver";
import { FieldResolverMetadataBuilder } from "./builders/field-resolver";

function createMetadataStorage(): MetadataStorage {
  const queries = new ResolverMetadataStorage();
  const mutations = new ResolverMetadataStorage();
  const subscriptions = new SubscriptionResolverMetadataStorage();
  const fieldResolvers = new FieldResolverMetadataStorage();
  const objectTypes = new ClassMetadataStorage();
  const inputTypes = new ClassMetadataStorage();
  const argumentTypes = new ClassMetadataStorage();
  const interfaceTypes = new ClassMetadataStorage();
  const authorizedFields = new AuthorizedMetadataStorage();
  const enums = new EnumMetadataStorage();
  const unions = new UnionMetadataStorage();
  const middlewares = new MiddlewareMetadataStorage();
  const resolverClasses = new ResolverClassMetadataStorage();
  const fields = new FieldMetadataStorage();
  const params = new ParamMetadataStorage();
  const classMetadataBuilder = new ClassMetadataBuilder(
    fields,
    authorizedFields,
    params,
    middlewares,
  );
  const resolverClassMetadataBuilder = new ResolverClassMetadataBuilder(
    resolverClasses,
    queries,
    mutations,
    subscriptions,
    fieldResolvers,
  );
  const baseResolverMetadataBuilder = new BaserResolverMetadataBuilder(
    resolverClasses,
    params,
    authorizedFields,
    middlewares,
  );
  const fieldResolverMetadataBuilder = new FieldResolverMetadataBuilder(
    baseResolverMetadataBuilder,
    authorizedFields,
    resolverClasses,
    objectTypes,
    fields,
  );
  return new MetadataStorage(
    queries,
    mutations,
    subscriptions,
    fieldResolvers,
    objectTypes,
    inputTypes,
    argumentTypes,
    interfaceTypes,
    authorizedFields,
    enums,
    unions,
    middlewares,
    resolverClasses,
    fields,
    params,
    classMetadataBuilder,
    resolverClassMetadataBuilder,
    baseResolverMetadataBuilder,
    fieldResolverMetadataBuilder,
  );
}

export function getMetadataStorage(): MetadataStorage {
  return (
    global.TypeGraphQLMetadataStorage ||
    (global.TypeGraphQLMetadataStorage = createMetadataStorage())
  );
}
