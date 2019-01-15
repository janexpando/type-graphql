import { getMetadataStorage } from "../metadata/getMetadataStorage";
import {
  GraphQLEnumType,
  GraphQLEnumValueConfigMap,
  GraphQLFieldConfigMap,
  GraphQLInputFieldConfigMap,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLUnionType,
} from "graphql";
import { UnionResolveTypeError } from "../errors";
import { getEnumValuesMap } from "../helpers/types";
import { getFieldMetadataFromInputType, getFieldMetadataFromObjectType } from "./utils";
import { createAdvancedFieldResolver, createSimpleFieldResolver } from "../resolvers/create";
import { HandlerArgsGenerator } from "./schema-generator";
import {
  EnumTypeInfo,
  InputObjectTypeInfo,
  InterfaceTypeInfo,
  ObjectTypeInfo,
  TypesInfo,
  UnionTypeInfo,
} from "./types-info";
import { getDefaultValue } from "./getDefaultValue";
import { UnionMetadataWithSymbol } from "../metadata/definitions";

export class TypesInfoBuilder {
  constructor(private handlerArgsGenerator: HandlerArgsGenerator) {}

  buildTypesInfo(): TypesInfo {
    const typeInfo = new TypesInfo();
    typeInfo.unionTypesInfo = this.getUnionTypesInfo(typeInfo);
    typeInfo.enumTypesInfo = this.getEnumTypesInfo();
    typeInfo.interfaceTypesInfo = this.getInterfaceTypesInfo(typeInfo);
    typeInfo.objectTypesInfo = this.getObjectTypesInfo(typeInfo);
    typeInfo.inputTypesInfo = this.getInputTypesInfo(typeInfo);
    return typeInfo;
  }

  private getUnionTypesInfo(typesInfo: TypesInfo): UnionTypeInfo[] {
    return getMetadataStorage().unions.map<UnionTypeInfo>(unionMetadata => {
      return this.mapUnionMetadata(unionMetadata, typesInfo);
    });
  }

  private mapUnionMetadata(unionMetadata: UnionMetadataWithSymbol, typesInfo: TypesInfo) {
    return {
      unionSymbol: unionMetadata.symbol,
      type: new GraphQLUnionType({
        name: unionMetadata.name,
        description: unionMetadata.description,
        types: () =>
          unionMetadata.types.map(
            objectType => typesInfo.objectTypesInfo.find(type => type.target === objectType)!.type,
          ),
        resolveType: instance => {
          const instanceTarget = unionMetadata.types.find(type => instance instanceof type);
          if (!instanceTarget) {
            throw new UnionResolveTypeError(unionMetadata);
          }
          // TODO: refactor to map for quicker access
          return typesInfo.objectTypesInfo.find(type => type.target === instanceTarget)!.type;
        },
      }),
    };
  }

  private getEnumTypesInfo() {
    return getMetadataStorage().enums.map<EnumTypeInfo>(enumMetadata => {
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
    });
  }

  private getInterfaceTypesInfo(typesInfo: TypesInfo) {
    return getMetadataStorage().interfaceTypes.map<InterfaceTypeInfo>(interfaceType => {
      const interfaceSuperClass = Object.getPrototypeOf(interfaceType.target);
      const hasExtended = interfaceSuperClass.prototype !== undefined;
      const getSuperClassType = () => {
        const superClassTypeInfo = typesInfo.interfaceTypesInfo.find(
          type => type.target === interfaceSuperClass,
        );
        return superClassTypeInfo ? superClassTypeInfo.type : undefined;
      };
      return {
        target: interfaceType.target,
        type: new GraphQLInterfaceType({
          name: interfaceType.name,
          description: interfaceType.description,
          fields: () => {
            let fields = interfaceType.fields!.reduce<GraphQLFieldConfigMap<any, any>>(
              (fieldsMap, field) => {
                fieldsMap[field.schemaName] = {
                  description: field.description,
                  type: typesInfo.getGraphQLOutputType(
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
            if (hasExtended) {
              const superClass = getSuperClassType();
              if (superClass) {
                const superClassFields = getFieldMetadataFromObjectType(superClass);
                fields = Object.assign({}, superClassFields, fields);
              }
            }
            return fields;
          },
        }),
      };
    });
  }

  private getObjectTypesInfo(typesInfo: TypesInfo) {
    return getMetadataStorage().objectTypes.map<ObjectTypeInfo>(objectType => {
      const objectSuperClass = Object.getPrototypeOf(objectType.target);
      const hasExtended = objectSuperClass.prototype !== undefined;
      const getSuperClassType = () => {
        const superClassTypeInfo = typesInfo.objectTypesInfo.find(
          type => type.target === objectSuperClass,
        );
        return superClassTypeInfo ? superClassTypeInfo.type : undefined;
      };
      const interfaceClasses = objectType.interfaceClasses || [];
      return {
        target: objectType.target,
        type: new GraphQLObjectType({
          name: objectType.name,
          description: objectType.description,
          isTypeOf:
            hasExtended || interfaceClasses.length > 0
              ? instance => instance instanceof objectType.target
              : undefined,
          interfaces: () => {
            let interfaces = interfaceClasses.map<GraphQLInterfaceType>(
              interfaceClass =>
                typesInfo.interfaceTypesInfo.find(info => info.target === interfaceClass)!.type,
            );
            // copy interfaces from super class
            if (hasExtended) {
              const superClass = getSuperClassType();
              if (superClass) {
                const superInterfaces = superClass.getInterfaces();
                interfaces = Array.from(new Set(interfaces.concat(superInterfaces)));
              }
            }
            return interfaces;
          },
          fields: () => {
            let fields = objectType.fields!.reduce<GraphQLFieldConfigMap<any, any>>(
              (fieldsMap, field) => {
                const fieldResolverMetadata = getMetadataStorage().fieldResolvers.find(
                  resolver =>
                    resolver.getObjectType!() === objectType.target &&
                    resolver.methodName === field.name &&
                    (resolver.resolverClassMetadata === undefined ||
                      resolver.resolverClassMetadata.isAbstract === false),
                );
                fieldsMap[field.schemaName] = {
                  type: typesInfo.getGraphQLOutputType(
                    field.name,
                    field.getType(),
                    field.typeOptions,
                  ),
                  complexity: field.complexity,
                  args: this.handlerArgsGenerator.generateHandlerArgs(typesInfo, field.params!),
                  resolve: fieldResolverMetadata
                    ? createAdvancedFieldResolver(fieldResolverMetadata)
                    : createSimpleFieldResolver(field),
                  description: field.description,
                  deprecationReason: field.deprecationReason,
                };
                return fieldsMap;
              },
              {},
            );
            // support for extending classes - get field info from prototype
            if (hasExtended) {
              const superClass = getSuperClassType();
              if (superClass) {
                const superClassFields = getFieldMetadataFromObjectType(superClass);
                fields = Object.assign({}, superClassFields, fields);
              }
            }
            // support for implicitly implementing interfaces
            // get fields from interfaces definitions
            if (objectType.interfaceClasses) {
              const interfacesFields = objectType.interfaceClasses.reduce<
                GraphQLFieldConfigMap<any, any>
              >((fieldsMap, interfaceClass) => {
                const interfaceType = typesInfo.interfaceTypesInfo.find(
                  type => type.target === interfaceClass,
                )!.type;
                return Object.assign(fieldsMap, getFieldMetadataFromObjectType(interfaceType));
              }, {});
              fields = Object.assign({}, interfacesFields, fields);
            }
            return fields;
          },
        }),
      };
    });
  }

  private getInputTypesInfo(this: object, typeInfo: TypesInfo) {
    return getMetadataStorage().inputTypes.map<InputObjectTypeInfo>(inputType => {
      const objectSuperClass = Object.getPrototypeOf(inputType.target);

      const inputInstance = new (inputType.target as any)();
      return {
        target: inputType.target,
        type: new GraphQLInputObjectType({
          name: inputType.name,
          description: inputType.description,
          fields: () => {
            let fields = inputType.fields!.reduce<GraphQLInputFieldConfigMap>(
              (fieldsMap, field) => {
                field.typeOptions.defaultValue = getDefaultValue(
                  inputInstance,
                  field.typeOptions,
                  field.name,
                  inputType.name,
                );

                fieldsMap[field.schemaName] = {
                  description: field.description,
                  type: typeInfo.getGraphQLInputType(
                    field.name,
                    field.getType(),
                    field.typeOptions,
                  ),
                  defaultValue: field.typeOptions.defaultValue,
                };
                return fieldsMap;
              },
              {},
            );
            // support for extending classes - get field info from prototype
            if (objectSuperClass.prototype !== undefined) {
              const superClass = typeInfo.getSuperClassType(objectSuperClass);
              if (superClass) {
                const superClassFields = getFieldMetadataFromInputType(superClass);
                fields = Object.assign({}, superClassFields, fields);
              }
            }
            return fields;
          },
        }),
      };
    });
  }
}
