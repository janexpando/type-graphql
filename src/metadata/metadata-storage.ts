import {
  ResolverMetadata,
  ClassMetadata,
  FieldMetadata,
  ParamMetadata,
  FieldResolverMetadata,
  AuthorizedMetadata,
  BaseResolverMetadata,
  EnumMetadata,
  UnionMetadataWithSymbol,
  ResolverClassMetadata,
  SubscriptionResolverMetadata,
  MiddlewareMetadata,
} from "./definitions";
import { ClassType } from "../interfaces";
import { NoExplicitTypeError } from "../errors";
import {
  mapSuperResolverHandlers,
  mapMiddlewareMetadataToArray,
  mapSuperFieldResolverHandlers,
  ensureReflectMetadataExists,
} from "./utils";

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

  *[Symbol.iterator]() {
    for (const item of this.items) {
      yield item;
    }
  }
}

export class TargetSpecificStorage<T extends { target: Function }> extends BaseMetadataStorage<T> {
  find(target: ClassType): T | undefined {
    return this.items.find(i => i.target === target);
  }
  findMany(target: Function): T[] {
    return this.items.filter(subscription => subscription.target === target);
  }
}

export class ResolverMetadataStorage extends TargetSpecificStorage<ResolverMetadata> {
  findMethod(name: string) {
    return this.items.find(i => i.methodName === name);
  }
}

export class SubscriptionResolverMetadataStorage extends TargetSpecificStorage<
  SubscriptionResolverMetadata
> {}

export class FieldResolverMetadataStorage extends TargetSpecificStorage<FieldResolverMetadata> {
  findField(objectType: ClassMetadata, field: FieldMetadata): FieldResolverMetadata | undefined {
    return this.items.find(
      resolver =>
        resolver.getObjectType!() === objectType.target &&
        resolver.methodName === field.name &&
        (resolver.resolverClassMetadata === undefined ||
          resolver.resolverClassMetadata.isAbstract === false),
    );
  }
}

export class ClassMetadataStorage extends TargetSpecificStorage<ClassMetadata> {
  findByName(name: string) {
    return this.items.find(i => i.name === name);
  }
}

export class AuthorizedMetadataStorage extends TargetSpecificStorage<AuthorizedMetadata> {
  findField(target: Function, fieldName: string): AuthorizedMetadata | undefined {
    return this.items.find(item => item.target === target && item.fieldName === fieldName);
  }
}

export class EnumMetadataStorage extends BaseMetadataStorage<EnumMetadata> {}

export class UnionMetadataStorage extends BaseMetadataStorage<UnionMetadataWithSymbol> {}

export class MiddlewareMetadataStorage extends TargetSpecificStorage<MiddlewareMetadata> {
  getForField(target: Function, name: string) {
    return this.items.filter(
      middleware => middleware.target === target && middleware.fieldName === name,
    );
  }
}

export class ResolverClassMetadataStorage extends TargetSpecificStorage<ResolverClassMetadata> {}

export class FieldMetadataStorage extends TargetSpecificStorage<FieldMetadata> {}

export class ParamMetadataStorage extends TargetSpecificStorage<ParamMetadata> {
  getForField(target: Function, name: string) {
    return this.items.filter(item => item.target === target && item.methodName === name);
  }
}

export class MetadataStorage {
  queries: ResolverMetadataStorage = new ResolverMetadataStorage();
  mutations: ResolverMetadataStorage = new ResolverMetadataStorage();
  subscriptions: SubscriptionResolverMetadataStorage = new SubscriptionResolverMetadataStorage();
  fieldResolvers: FieldResolverMetadataStorage = new FieldResolverMetadataStorage();
  objectTypes: ClassMetadataStorage = new ClassMetadataStorage();
  inputTypes: ClassMetadataStorage = new ClassMetadataStorage();
  argumentTypes: ClassMetadataStorage = new ClassMetadataStorage();
  interfaceTypes: ClassMetadataStorage = new ClassMetadataStorage();
  authorizedFields: AuthorizedMetadataStorage = new AuthorizedMetadataStorage();
  enums: EnumMetadataStorage = new EnumMetadataStorage();
  unions: UnionMetadataStorage = new UnionMetadataStorage();
  middlewares: MiddlewareMetadataStorage = new MiddlewareMetadataStorage();

  private resolverClasses: ResolverClassMetadataStorage = new ResolverClassMetadataStorage();
  private fields: FieldMetadataStorage = new FieldMetadataStorage();
  private params: ParamMetadataStorage = new ParamMetadataStorage();

  constructor() {
    ensureReflectMetadataExists();
  }

  collectResolverClassMetadata(definition: ResolverClassMetadata) {
    this.resolverClasses.collect(definition);
  }
  collectClassFieldMetadata(definition: FieldMetadata) {
    this.fields.collect(definition);
  }
  collectHandlerParamMetadata(definition: ParamMetadata) {
    this.params.collect(definition);
  }

  build() {
    // TODO: disable next build attempts

    this.buildClassMetadatas(this.objectTypes);
    this.buildClassMetadatas(this.inputTypes);
    this.buildClassMetadatas(this.argumentTypes);
    this.buildClassMetadatas(this.interfaceTypes);
    this.buildFieldResolverMetadata(this.fieldResolvers);
    this.buildResolversMetadatas(this.queries);
    this.buildResolversMetadatas(this.mutations);
    this.buildResolversMetadatas(this.subscriptions);

    this.buildExtendedResolversMetadata();
  }

  clear() {
    this.queries = new ResolverMetadataStorage();
    this.mutations = new ResolverMetadataStorage();
    this.subscriptions = new SubscriptionResolverMetadataStorage();
    this.fieldResolvers = new FieldResolverMetadataStorage();
    this.objectTypes = new ClassMetadataStorage();
    this.inputTypes = new ClassMetadataStorage();
    this.argumentTypes = new ClassMetadataStorage();
    this.interfaceTypes = new ClassMetadataStorage();
    this.authorizedFields = new AuthorizedMetadataStorage();
    this.enums = new EnumMetadataStorage();
    this.unions = new UnionMetadataStorage();
    this.middlewares = new MiddlewareMetadataStorage();

    this.resolverClasses = new ResolverClassMetadataStorage();
    this.fields = new FieldMetadataStorage();
    this.params = new ParamMetadataStorage();
  }

  private buildClassMetadatas(definitions: ClassMetadataStorage) {
    for (const def of definitions) {
      this.buildClassMetadata(def);
    }
  }

  private buildClassMetadata(def: ClassMetadata) {
    const fields = this.fields.findMany(def.target);
    for (const field of fields) {
      field.roles = this.findFieldRoles(field.target, field.name);
      field.params = this.params.getForField(field.target, field.name);
      field.middlewares = mapMiddlewareMetadataToArray(
        this.middlewares.getForField(field.target, field.name),
      );
    }
    def.fields = fields;
  }

  private buildResolversMetadatas(definitions: BaseMetadataStorage<BaseResolverMetadata>) {
    for (const def of definitions) {
      this.buildBaseResolverMetadata(def);
    }
  }

  private buildBaseResolverMetadata(def: BaseResolverMetadata) {
    const resolverClassMetadata = this.resolverClasses.find(def.target as ClassType)!;
    def.resolverClassMetadata = resolverClassMetadata;
    def.params = this.params.getForField(def.target, def.methodName);
    def.roles = this.findFieldRoles(def.target, def.methodName);
    def.middlewares = mapMiddlewareMetadataToArray(
      this.middlewares.getForField(def.target, def.methodName),
    );
  }

  private buildFieldResolverMetadata(definitions: FieldResolverMetadataStorage) {
    this.buildResolversMetadatas(definitions);

    for (const def of definitions) {
      def.roles = this.findFieldRoles(def.target, def.methodName);
      def.getObjectType =
        def.kind === "external"
          ? this.resolverClasses.find(def.target as ClassType)!.getObjectType
          : () => def.target as ClassType;
      if (def.kind === "external") {
        const objectTypeCls = this.resolverClasses.find(def.target as ClassType)!.getObjectType!();
        const objectType = this.objectTypes.find(objectTypeCls)!;
        const objectTypeField = objectType.fields!.find(
          fieldDef => fieldDef.name === def.methodName,
        )!;
        if (!objectTypeField) {
          if (!def.getType || !def.typeOptions) {
            throw new NoExplicitTypeError(def.target.name, def.methodName);
          }
          const fieldMetadata: FieldMetadata = {
            name: def.methodName,
            schemaName: def.schemaName,
            getType: def.getType!,
            target: objectTypeCls,
            typeOptions: def.typeOptions!,
            deprecationReason: def.deprecationReason,
            description: def.description,
            complexity: def.complexity,
            roles: def.roles!,
            middlewares: def.middlewares!,
            params: def.params!,
          };
          this.collectClassFieldMetadata(fieldMetadata);
          objectType.fields!.push(fieldMetadata);
        } else {
          objectTypeField.complexity = def.complexity;
          if (objectTypeField.params!.length === 0) {
            objectTypeField.params = def.params!;
          }
          if (def.roles) {
            objectTypeField.roles = def.roles;
          } else if (objectTypeField.roles) {
            def.roles = objectTypeField.roles;
          }
        }
      }
    }
  }

  private buildExtendedResolversMetadata() {
    for (const def of this.resolverClasses) {
      const target = def.target;
      let superResolver = Object.getPrototypeOf(target);

      // copy and modify metadata of resolver from parent resolver class
      while (superResolver.prototype) {
        const superResolverMetadata = this.resolverClasses.find(superResolver);
        if (superResolverMetadata) {
          this.queries.unshift(...mapSuperResolverHandlers(this.queries, superResolver, def));
          this.mutations.unshift(...mapSuperResolverHandlers(this.mutations, superResolver, def));
          this.subscriptions.unshift(
            ...mapSuperResolverHandlers(this.subscriptions, superResolver, def),
          );
          this.fieldResolvers.unshift(
            ...mapSuperFieldResolverHandlers(this.fieldResolvers, superResolver, def),
          );
        }
        superResolver = Object.getPrototypeOf(superResolver);
      }
    }
  }

  private findFieldRoles(target: Function, fieldName: string): any[] | undefined {
    const authorizedField = this.authorizedFields.findField(target, fieldName);
    if (!authorizedField) {
      return;
    }
    return authorizedField.roles;
  }
}
