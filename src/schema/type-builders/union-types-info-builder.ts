import { TypesInfoStorage } from "../types-info-storage";
import { UnionMetadataWithSymbol } from "../../metadata/definitions";
import { GraphQLUnionType } from "graphql";
import { UnionResolveTypeError } from "../../errors";

export class UnionTypesInfoBuilder {
  constructor(private typeInfo: TypesInfoStorage) {}

  createUnionTypeInfo(unionMetadata: UnionMetadataWithSymbol) {
    return {
      unionSymbol: unionMetadata.symbol,
      type: new GraphQLUnionType({
        name: unionMetadata.name,
        description: unionMetadata.description,
        types: () =>
          unionMetadata.types.map(
            objectType => this.typeInfo.objectTypesInfo.findByConstructor(objectType)!.type,
          ),
        resolveType: instance => {
          const instanceTarget = unionMetadata.types.find(type => instance instanceof type);
          if (!instanceTarget) {
            throw new UnionResolveTypeError(unionMetadata);
          }
          return this.typeInfo.objectTypesInfo.findByConstructor(instanceTarget)!.type;
        },
      }),
    };
  }
}
