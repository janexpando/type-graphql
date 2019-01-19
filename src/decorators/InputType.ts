import { getMetadataStorage } from "../metadata/getMetadataStorage";
import { getNameDecoratorParams } from "../helpers/decorators";
import { DescriptionOptions } from "./types";

export function InputType(): ClassDecorator;
export function InputType(options: DescriptionOptions): ClassDecorator;
export function InputType(name: string, options?: DescriptionOptions): ClassDecorator;
export function InputType(
  nameOrOptions?: string | DescriptionOptions,
  maybeOptions?: DescriptionOptions,
): ClassDecorator {
  const { name, options } = getNameDecoratorParams(nameOrOptions, maybeOptions);
  return target => {
    getMetadataStorage().inputTypes.collect({
      name: name || target.name,
      target,
      description: options.description,
    });
  };
}
