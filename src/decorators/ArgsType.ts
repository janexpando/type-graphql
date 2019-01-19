import { getMetadataStorage } from "../metadata/getMetadataStorage";

export function ArgsType(): ClassDecorator {
  return target => {
    getMetadataStorage().argumentTypes.collect({
      name: target.name,
      target,
    });
  };
}
