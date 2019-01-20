import { ClassMetadata } from "../definitions";
import { TargetSpecificStorage } from "./target-specific";

export class ClassMetadataStorage extends TargetSpecificStorage<ClassMetadata> {
  findByName(name: string) {
    return this.items.find(i => i.name === name);
  }
}
