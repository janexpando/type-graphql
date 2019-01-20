import { ResolverMetadata } from "../definitions";
import { TargetSpecificStorage } from "./target-specific";

export class ResolverMetadataStorage extends TargetSpecificStorage<ResolverMetadata> {
  findMethod(name: string) {
    return this.items.find(i => i.methodName === name);
  }
}
