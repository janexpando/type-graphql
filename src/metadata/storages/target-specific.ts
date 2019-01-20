import { ClassType } from "../../interfaces";
import { BaseMetadataStorage } from "./base";

export class TargetSpecificStorage<T extends { target: Function }> extends BaseMetadataStorage<T> {
  find(target: ClassType): T | undefined {
    return this.items.find(i => i.target === target);
  }
  findMany(target: Function): T[] {
    return this.items.filter(subscription => subscription.target === target);
  }
}
