import { getMetadataStorage } from "../metadata/getMetadataStorage";
import { getNameDecoratorParams } from "../helpers/decorators";
import { DescriptionOptions } from "./types";

export function InterfaceType(): ClassDecorator;
export function InterfaceType(options: DescriptionOptions): ClassDecorator;
export function InterfaceType(name: string, options?: DescriptionOptions): ClassDecorator;
export function InterfaceType(
  nameOrOptions?: string | DescriptionOptions,
  maybeOptions?: DescriptionOptions,
): ClassDecorator {
  const { name, options } = getNameDecoratorParams(nameOrOptions, maybeOptions);
  return target => {
    getMetadataStorage().interfaceTypes.collect({
      name: name || target.name,
      target,
      description: options.description,
    });
  };
}
