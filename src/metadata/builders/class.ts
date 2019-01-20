import { ClassMetadata } from "../definitions";
import { mapMiddlewareMetadataToArray } from "../utils";
import { ParamMetadataStorage } from "../storages/param";
import { MiddlewareMetadataStorage } from "../storages/middleware";
import { AuthorizedMetadataStorage } from "../storages/authorized";
import { FieldMetadataStorage } from "../storages/field";

export class ClassMetadataBuilder {
  constructor(
    private fields: FieldMetadataStorage,
    private authorizedFields: AuthorizedMetadataStorage,
    private params: ParamMetadataStorage,
    private middlewares: MiddlewareMetadataStorage,
  ) {}

  build(def: ClassMetadata) {
    const fields = this.fields.findMany(def.target);
    for (const field of fields) {
      field.roles = this.authorizedFields.findFieldRoles(field.target, field.name);
      field.params = this.params.getForField(field.target, field.name);
      field.middlewares = mapMiddlewareMetadataToArray(
        this.middlewares.getForField(field.target, field.name),
      );
    }
    def.fields = fields;
  }
}
