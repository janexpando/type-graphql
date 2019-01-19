import { EnumTypeInfo } from "../types-info-storage";
import { getEnumValuesMap } from "../../helpers/types";
import { GraphQLEnumType, GraphQLEnumValueConfigMap } from "graphql";
import { EnumMetadata } from "../../metadata/definitions";

export class EnumTypesInfoBuilder {
  create(enumMetadata: EnumMetadata): EnumTypeInfo {
    const enumMap = getEnumValuesMap(enumMetadata.enumObj);
    return {
      enumObj: enumMetadata.enumObj,
      type: new GraphQLEnumType({
        name: enumMetadata.name,
        description: enumMetadata.description,
        values: Object.keys(enumMap).reduce<GraphQLEnumValueConfigMap>((enumConfig, enumKey) => {
          enumConfig[enumKey] = {
            value: enumMap[enumKey],
          };
          return enumConfig;
        }, {}),
      }),
    };
  }
}
