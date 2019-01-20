import { BaseResolverMetadata } from "../definitions";
import { ClassType } from "../../interfaces";
import { mapMiddlewareMetadataToArray } from "../utils";
import { ResolverClassMetadataStorage } from "../storages/resolver-class";
import { ParamMetadataStorage } from "../storages/param";
import { AuthorizedMetadataStorage } from "../storages/authorized";
import { MiddlewareMetadataStorage } from "../storages/middleware";

export class BaserResolverMetadataBuilder {
  constructor(
    private resolverClasses: ResolverClassMetadataStorage,
    private params: ParamMetadataStorage,
    private authorizedFields: AuthorizedMetadataStorage,
    private middlewares: MiddlewareMetadataStorage,
  ) {}

  build(def: BaseResolverMetadata) {
    const resolverClassMetadata = this.resolverClasses.find(def.target)!;
    def.resolverClassMetadata = resolverClassMetadata;
    def.params = this.params.getForField(def.target, def.methodName);
    def.roles = this.authorizedFields.findFieldRoles(def.target, def.methodName);
    def.middlewares = mapMiddlewareMetadataToArray(
      this.middlewares.getForField(def.target, def.methodName),
    );
  }
}
