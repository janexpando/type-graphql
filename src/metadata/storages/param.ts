import { ParamMetadata } from "../definitions";
import { TargetSpecificStorage } from "./target-specific";

export class ParamMetadataStorage extends TargetSpecificStorage<ParamMetadata> {
  getForField(target: Function, name: string) {
    return this.items.filter(item => item.target === target && item.methodName === name);
  }
}
