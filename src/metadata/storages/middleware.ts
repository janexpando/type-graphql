import { MiddlewareMetadata } from "../definitions";
import { TargetSpecificStorage } from "./target-specific";

export class MiddlewareMetadataStorage extends TargetSpecificStorage<MiddlewareMetadata> {
  getForField(target: Function, name: string) {
    return this.items.filter(
      middleware => middleware.target === target && middleware.fieldName === name,
    );
  }
}
