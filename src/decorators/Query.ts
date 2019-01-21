import { ReturnTypeFunc, AdvancedOptions } from "./types";
import { getMetadataStorage } from "../metadata/getMetadataStorage";
import { getHandlerInfo } from "../helpers/handlers";
import { getTypeDecoratorParams } from "../helpers/decorators";
import { ResolverMarker } from "../utils/resolver-marker";

export function Query(): MethodDecorator;
export function Query(options: AdvancedOptions): MethodDecorator;
export function Query(returnTypeFunc: ReturnTypeFunc, options?: AdvancedOptions): MethodDecorator;
export function Query(
  returnTypeFuncOrOptions?: ReturnTypeFunc | AdvancedOptions,
  maybeOptions?: AdvancedOptions,
): MethodDecorator {
  const { options, returnTypeFunc } = getTypeDecoratorParams(returnTypeFuncOrOptions, maybeOptions);
  return (prototype, methodName) => {
    ResolverMarker.mark(prototype.constructor);
    const handler = getHandlerInfo(prototype, methodName, returnTypeFunc, options);
    getMetadataStorage().queries.collect(handler);
  };
}
