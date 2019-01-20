import { ResolverClassMetadata } from "../definitions";
import { mapSuperFieldResolverHandlers, mapSuperResolverHandlers } from "../utils";
import { ResolverClassMetadataStorage } from "../storages/resolver-class";
import { ResolverMetadataStorage } from "../storages/resolver";
import { SubscriptionResolverMetadataStorage } from "../storages/subscription-resolver";
import { FieldResolverMetadataStorage } from "../storages/field-resolver";

export class ResolverClassMetadataBuilder {
  constructor(
    private resolverClasses: ResolverClassMetadataStorage,
    private queries: ResolverMetadataStorage,
    private mutations: ResolverMetadataStorage,
    private subscriptions: SubscriptionResolverMetadataStorage,
    private fieldResolvers: FieldResolverMetadataStorage,
  ) {}

  build(def: ResolverClassMetadata) {
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
