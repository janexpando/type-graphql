import { TypeOptions, TypeValue } from "../decorators/types";
import { GraphQLInputType, GraphQLOutputType, GraphQLType } from "graphql";
import { convertTypeIfScalar, wrapWithTypeOptions } from "../helpers/types";
import { Storage, TypesInfoStorage } from "./types-info-storage";

export class GraphqlTypeBuilder {
  getGraphQLInputType(
    typeInfo: TypesInfoStorage,
    typeOwnerName: string,
    type: TypeValue,
    typeOptions: TypeOptions = {},
  ): GraphQLInputType {
    return this.getGraphqlType(
      [typeInfo.inputTypesInfo, typeInfo.enumTypesInfo],
      typeOwnerName,
      type,
      typeOptions,
    ) as GraphQLInputType;
  }

  getGraphQLOutputType(
    typeInfo: TypesInfoStorage,
    typeOwnerName: string,
    type: TypeValue,
    typeOptions: TypeOptions = {},
  ): GraphQLOutputType {
    return this.getGraphqlType(
      [
        typeInfo.objectTypesInfo,
        typeInfo.interfaceTypesInfo,
        typeInfo.enumTypesInfo,
        typeInfo.unionTypesInfo,
      ],
      typeOwnerName,
      type,
      typeOptions,
    ) as GraphQLOutputType;
  }

  private getGraphqlType(
    storages: Storage[],
    typeOwnerName: string,
    type: TypeValue,
    typeOptions: TypeOptions = {},
  ): GraphQLType {
    let gqlType: GraphQLType | undefined;
    gqlType = convertTypeIfScalar(type);

    if (!gqlType) {
      for (const storage of storages) {
        const found = storage.findByConstructor(type);
        if (found) {
          gqlType = found.type;
          break;
        }
      }
    }

    if (!gqlType) {
      throw new Error(`Cannot determine GraphQL type for ${typeOwnerName}`!);
    }

    return wrapWithTypeOptions(typeOwnerName, gqlType, typeOptions);
  }
}
