import { TypeOptions, TypeValue } from "../decorators/types";
import { GraphQLInputType, GraphQLOutputType } from "graphql";
import { convertTypeIfScalar, wrapWithTypeOptions } from "../helpers/types";
import { TypesInfoStorage } from "./types-info-storage";

export class GraphqlTypeBuilder {
  getGraphQLInputType(
    typeInfo: TypesInfoStorage,
    typeOwnerName: string,
    type: TypeValue,
    typeOptions: TypeOptions = {},
  ): GraphQLInputType {
    let gqlType: GraphQLInputType | undefined;
    gqlType = convertTypeIfScalar(type);
    if (!gqlType) {
      const inputType = typeInfo.inputTypesInfo.find(it => it.target === (type as Function));
      if (inputType) {
        gqlType = inputType.type;
      }
    }
    if (!gqlType) {
      const enumType = typeInfo.enumTypesInfo.find(it => it.enumObj === (type as Function));
      if (enumType) {
        gqlType = enumType.type;
      }
    }
    if (!gqlType) {
      throw new Error(`Cannot determine GraphQL input type for ${typeOwnerName}`!);
    }

    return wrapWithTypeOptions(typeOwnerName, gqlType, typeOptions);
  }

  getGraphQLOutputType(
    typeInfo: TypesInfoStorage,
    typeOwnerName: string,
    type: TypeValue,
    typeOptions: TypeOptions = {},
  ): GraphQLOutputType {
    let gqlType: GraphQLOutputType | undefined;
    gqlType = convertTypeIfScalar(type);
    if (!gqlType) {
      const objectType = typeInfo.objectTypesInfo.findByConstructor(type);
      if (objectType) {
        gqlType = objectType.type;
      }
    }
    if (!gqlType) {
      const interfaceType = typeInfo.interfaceTypesInfo.find(
        it => it.target === (type as Function),
      );
      if (interfaceType) {
        gqlType = interfaceType.type;
      }
    }
    if (!gqlType) {
      const enumType = typeInfo.enumTypesInfo.find(it => it.enumObj === (type as Function));
      if (enumType) {
        gqlType = enumType.type;
      }
    }
    if (!gqlType) {
      const unionType = typeInfo.unionTypesInfo.find(it => it.unionSymbol === (type as symbol));
      if (unionType) {
        gqlType = unionType.type;
      }
    }
    if (!gqlType) {
      throw new Error(`Cannot determine GraphQL output type for ${typeOwnerName}`!);
    }

    return wrapWithTypeOptions(typeOwnerName, gqlType, typeOptions);
  }
}
