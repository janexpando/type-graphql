import { BaseResolverMetadata } from "./definitions";
import { ReflectMetadataMissingError } from "../errors";
import { ResolverClassMetadataBuilder } from "./builders/resolver-class";
import { ClassMetadataBuilder } from "./builders/class";
import { BaserResolverMetadataBuilder } from "./builders/base-resolver";
import { FieldResolverMetadataBuilder } from "./builders/field-resolver";
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
import { BaseMetadataStorage } from "./storages/base";

export class MetadataStorage {
  constructor(
    public queries: ResolverMetadataStorage,
    public mutations: ResolverMetadataStorage,
    public subscriptions: SubscriptionResolverMetadataStorage,
    public fieldResolvers: FieldResolverMetadataStorage,
    public objectTypes: ClassMetadataStorage,
    public inputTypes: ClassMetadataStorage,
    public argumentTypes: ClassMetadataStorage,
    public interfaceTypes: ClassMetadataStorage,
    public authorizedFields: AuthorizedMetadataStorage,
    public enums: EnumMetadataStorage,
    public unions: UnionMetadataStorage,
    public middlewares: MiddlewareMetadataStorage,
    public resolverClasses: ResolverClassMetadataStorage,
    public fields: FieldMetadataStorage,
    public params: ParamMetadataStorage,
    public classMetadataBuilder: ClassMetadataBuilder,
    public resolverClassMetadataBuilder: ResolverClassMetadataBuilder,
    public baseResolverMetadataBuilder: BaserResolverMetadataBuilder,
    public fieldResolverMetadataBuilder: FieldResolverMetadataBuilder,
  ) {
    this.ensureReflectMetadataExists();
  }

  build() {
    // TODO: disable next build attempts

    this.buildClassMetadatas(this.objectTypes);
    this.buildClassMetadatas(this.inputTypes);
    this.buildClassMetadatas(this.argumentTypes);
    this.buildClassMetadatas(this.interfaceTypes);
    this.buildFieldResolverMetadatas(this.fieldResolvers);
    this.buildResolversMetadatas(this.queries);
    this.buildResolversMetadatas(this.mutations);
    this.buildResolversMetadatas(this.subscriptions);
    this.buildExtendedResolversMetadatas();
  }

  clear() {
    this.queries.clear();
    this.mutations.clear();
    this.subscriptions.clear();
    this.fieldResolvers.clear();
    this.objectTypes.clear();
    this.inputTypes.clear();
    this.argumentTypes.clear();
    this.interfaceTypes.clear();
    this.authorizedFields.clear();
    this.enums.clear();
    this.unions.clear();
    this.middlewares.clear();
    this.resolverClasses.clear();
    this.fields.clear();
    this.params.clear();
  }

  private ensureReflectMetadataExists() {
    if (
      typeof Reflect !== "object" ||
      typeof Reflect.decorate !== "function" ||
      typeof Reflect.metadata !== "function"
    ) {
      throw new ReflectMetadataMissingError();
    }
  }

  private buildClassMetadatas(definitions: ClassMetadataStorage) {
    for (const def of definitions) {
      this.classMetadataBuilder.build(def);
    }
  }

  private buildResolversMetadatas(definitions: BaseMetadataStorage<BaseResolverMetadata>) {
    for (const def of definitions) {
      this.baseResolverMetadataBuilder.build(def);
    }
  }

  private buildFieldResolverMetadatas(definitions: FieldResolverMetadataStorage) {
    for (const def of definitions) {
      this.fieldResolverMetadataBuilder.build(def);
    }
  }

  private buildExtendedResolversMetadatas() {
    for (const def of this.resolverClasses) {
      this.resolverClassMetadataBuilder.build(def);
    }
  }
}
