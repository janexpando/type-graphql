import { AuthorizedMetadata } from "../definitions";
import { TargetSpecificStorage } from "./target-specific";

export class AuthorizedMetadataStorage extends TargetSpecificStorage<AuthorizedMetadata> {
  findField(target: Function, fieldName: string): AuthorizedMetadata | undefined {
    return this.items.find(item => item.target === target && item.fieldName === fieldName);
  }

  findFieldRoles(target: Function, fieldName: string): any[] | undefined {
    const authorizedField = this.findField(target, fieldName);
    if (!authorizedField) {
      return;
    }
    return authorizedField.roles;
  }
}
