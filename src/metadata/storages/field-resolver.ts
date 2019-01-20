import { ClassMetadata, FieldMetadata, FieldResolverMetadata } from "../definitions";
import { TargetSpecificStorage } from "./target-specific";

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
