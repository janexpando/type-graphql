import { ReturnTypeFunc, AdvancedOptions } from "./types";
import { getMetadataStorage } from "../metadata/getMetadataStorage";
import { getHandlerInfo } from "../helpers/handlers";
import { getTypeDecoratorParams } from "../helpers/decorators";
import { ResolverMarker } from "../utils/resolver-marker";

export function Mutation(): MethodDecorator;
export function Mutation(options: AdvancedOptions): MethodDecorator;
export function Mutation(
  returnTypeFunc: ReturnTypeFunc,
  options?: AdvancedOptions,
): MethodDecorator;
export function Mutation(
  returnTypeFuncOrOptions?: ReturnTypeFunc | AdvancedOptions,
  maybeOptions?: AdvancedOptions,
): MethodDecorator {
  const { options, returnTypeFunc } = getTypeDecoratorParams(returnTypeFuncOrOptions, maybeOptions);
  return (prototype, methodName) => {
    ResolverMarker.mark(prototype.constructor);
    const handler = getHandlerInfo(prototype, methodName, returnTypeFunc, options);
    getMetadataStorage().mutations.collect(handler);
  };
}
