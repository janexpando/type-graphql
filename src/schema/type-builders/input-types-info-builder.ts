import { GraphqlTypeBuilder } from "../graphql-type-builder";
import { InputObjectTypeInfo, TypesInfoStorage } from "../types-info-storage";
import { GraphQLInputFieldConfigMap, GraphQLInputObjectType } from "graphql";
import { ClassMetadata } from "../../metadata/definitions";
import { getFieldMetadataFromInputType } from "../utils";
import { getDefaultValue } from "../getDefaultValue";
import { SuperClassSearcher } from "../super-class-searcher";

export class InputTypesInfoBuilder {
  constructor(
    private typeInfo: TypesInfoStorage,
    private graphqlTypeBuilder: GraphqlTypeBuilder,
    private superClassSearcher: SuperClassSearcher,
  ) {}

  create(inputType: ClassMetadata) {
    const inputInstance = new (inputType.target as any)();
    const info: InputObjectTypeInfo = {
      target: inputType.target,
      type: new GraphQLInputObjectType({
        name: inputType.name,
        description: inputType.description,
        fields: () => {
          return this.createInputTypesInfoConfigMap(inputType, inputInstance, this.typeInfo);
        },
      }),
    };
    return info;
  }

  // support for extending classes - get field info from prototype
  private mergeWithSuperClass(
    fields: GraphQLInputFieldConfigMap,
    inputType: ClassMetadata,
  ): GraphQLInputFieldConfigMap {
    const superClass:
      | GraphQLInputObjectType
      | undefined = this.superClassSearcher.getSuperClassInputType(inputType);
    if (superClass) {
      const superClassFields = getFieldMetadataFromInputType(superClass);
      fields = Object.assign({}, superClassFields, fields);
    }
    return fields;
  }

  private createInputTypesInfoConfigMap(
    inputType: ClassMetadata,
    inputInstance: any,
    typeInfo: TypesInfoStorage,
  ): GraphQLInputFieldConfigMap {
    const fields = inputType.fields!.reduce<GraphQLInputFieldConfigMap>((fieldsMap, field) => {
      field.typeOptions.defaultValue = getDefaultValue(
        inputInstance,
        field.typeOptions,
        field.name,
        inputType.name,
      );

      fieldsMap[field.schemaName] = {
        description: field.description,
        type: this.graphqlTypeBuilder.getGraphQLInputType(
          typeInfo,
          field.name,
          field.getType(),
          field.typeOptions,
        ),
        defaultValue: field.typeOptions.defaultValue,
      };
      return fieldsMap;
    }, {});
    return this.mergeWithSuperClass(fields, inputType);
  }
}
