import { ClassMetadata } from "../../metadata/definitions";
import { InterfaceTypeInfo, TypesInfoStorage } from "../types-info-storage";
import { GraphQLFieldConfigMap, GraphQLInterfaceType } from "graphql";
import { getFieldMetadataFromObjectType } from "../utils";
import { GraphqlTypeBuilder } from "../graphql-type-builder";
import { SuperClassSearcher } from "../super-class-searcher";

export class InterfaceTypesInfoBuilder {
  constructor(
    private typeInfo: TypesInfoStorage,
    private graphqlTypeBuilder: GraphqlTypeBuilder,
    private superClassSearcher: SuperClassSearcher,
  ) {}

  createInterfaceTypeInfo(interfaceType: ClassMetadata) {
    const info: InterfaceTypeInfo = {
      target: interfaceType.target,
      type: new GraphQLInterfaceType({
        name: interfaceType.name,
        description: interfaceType.description,
        fields: () => {
          return this.createFields(interfaceType);
        },
      }),
    };
    return info;
  }

  createFields(interfaceType: ClassMetadata) {
    let fields = interfaceType.fields!.reduce<GraphQLFieldConfigMap<any, any>>(
      (fieldsMap, field) => {
        fieldsMap[field.schemaName] = {
          description: field.description,
          type: this.graphqlTypeBuilder.getGraphQLOutputType(
            field.name,
            field.getType(),
            field.typeOptions,
          ),
        };
        return fieldsMap;
      },
      {},
    );
    // support for extending interface classes - get field info from prototype
    const superClass = this.superClassSearcher.getSuperClassInterfacesType(interfaceType);
    if (superClass) {
      const superClassFields = getFieldMetadataFromObjectType(superClass);
      fields = Object.assign({}, superClassFields, fields);
    }
    return fields;
  }
}
