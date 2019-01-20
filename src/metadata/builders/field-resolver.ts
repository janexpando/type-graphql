import { FieldMetadata, FieldResolverMetadata } from "../definitions";
import { ClassType } from "../../interfaces";
import { NoExplicitTypeError } from "../../errors";
import { BaserResolverMetadataBuilder } from "./base-resolver";
import { AuthorizedMetadataStorage } from "../storages/authorized";
import { ResolverClassMetadataStorage } from "../storages/resolver-class";
import { ClassMetadataStorage } from "../storages/class";
import { FieldMetadataStorage } from "../storages/field";

export class FieldResolverMetadataBuilder {
  constructor(
    private baseResolverMetadataBuilder: BaserResolverMetadataBuilder,
    private authorizedFields: AuthorizedMetadataStorage,
    private resolverClasses: ResolverClassMetadataStorage,
    private objectTypes: ClassMetadataStorage,
    private fields: FieldMetadataStorage,
  ) {}

  build(def: FieldResolverMetadata) {
    this.baseResolverMetadataBuilder.build(def);
    def.roles = this.authorizedFields.findFieldRoles(def.target, def.methodName);
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
        this.fields.collect(fieldMetadata);
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
