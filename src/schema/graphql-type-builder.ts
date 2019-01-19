import { TypeOptions, TypeValue } from "../decorators/types";
import { GraphQLInputType, GraphQLOutputType, GraphQLType } from "graphql";
import { convertTypeIfScalar, wrapWithTypeOptions } from "../helpers/types";
import { Storage, TypesInfoStorage } from "./types-info-storage";
import { BuildContext } from "./build-context";

export class GraphqlTypeBuilder {
  constructor(private typeInfo: TypesInfoStorage, private buildContext: BuildContext) {}

  getGraphQLInputType(
    typeOwnerName: string,
    type: TypeValue,
    typeOptions: TypeOptions = {},
  ): GraphQLInputType {
    return this.getGraphqlType(
      [this.typeInfo.inputTypesInfo, this.typeInfo.enumTypesInfo],
      typeOwnerName,
      type,
      typeOptions,
    ) as GraphQLInputType;
  }

  getGraphQLOutputType(
    typeOwnerName: string,
    type: TypeValue,
    typeOptions: TypeOptions = {},
  ): GraphQLOutputType {
    return this.getGraphqlType(
      [
        this.typeInfo.objectTypesInfo,
        this.typeInfo.interfaceTypesInfo,
        this.typeInfo.enumTypesInfo,
        this.typeInfo.unionTypesInfo,
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
    gqlType = convertTypeIfScalar(this.buildContext, type);

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
