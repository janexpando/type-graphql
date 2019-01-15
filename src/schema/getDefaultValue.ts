import { TypeOptions } from "../decorators/types";
import { ConflictingDefaultValuesError } from "../errors";

export function getDefaultValue(
  typeInstance: { [property: string]: unknown },
  typeOptions: TypeOptions,
  fieldName: string,
  typeName: string,
): unknown | undefined {
  const defaultValueFromInitializer = typeInstance[fieldName];
  if (
    typeOptions.defaultValue !== undefined &&
    defaultValueFromInitializer !== undefined &&
    typeOptions.defaultValue !== defaultValueFromInitializer
  ) {
    throw new ConflictingDefaultValuesError(
      typeName,
      fieldName,
      typeOptions.defaultValue,
      defaultValueFromInitializer,
    );
  }
  return typeOptions.defaultValue !== undefined
    ? typeOptions.defaultValue
    : defaultValueFromInitializer;
}
