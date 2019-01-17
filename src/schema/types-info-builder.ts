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
  EnumTypeInfoStorage,
  InputObjectTypeInfo,
  InputObjectTypeInfoStorage,
  InterfaceTypeInfo,
  InterfaceTypeInfoStorage,
  ObjectTypeInfo,
  ObjectTypeInfoStorage,
  TypesInfoStorage,
  UnionTypeInfo,
  UnionTypeInfoStorage,
} from "./types-info-storage";
import { getDefaultValue } from "./getDefaultValue";
import { ClassMetadata, UnionMetadataWithSymbol } from "../metadata/definitions";
import { GraphqlTypeBuilder } from "./graphql-type-builder";

export class TypesInfoBuilder {
  private inputTypesInfoGenerator: InputTypesInfoGenerator;
  private superClassSearcher: SuperClassSearcher;

  constructor(
    private graphqlTypeBuilder: GraphqlTypeBuilder,
    private handlerArgsGenerator: HandlerArgsGenerator,
  ) {
    this.superClassSearcher = new SuperClassSearcher();
    this.inputTypesInfoGenerator = new InputTypesInfoGenerator(
      graphqlTypeBuilder,
      this.superClassSearcher,
    );
  }

  buildTypesInfo(): TypesInfoStorage {
    const typeInfo = new TypesInfoStorage();
    typeInfo.unionTypesInfo = this.getUnionTypesInfo(typeInfo);
    typeInfo.enumTypesInfo = this.getEnumTypesInfo();
    typeInfo.interfaceTypesInfo = this.getInterfaceTypesInfo(typeInfo);
    typeInfo.objectTypesInfo = this.getObjectTypesInfo(typeInfo);
    typeInfo.inputTypesInfo = this.inputTypesInfoGenerator.getInputTypesInfo(typeInfo);
    return typeInfo;
  }

  private getUnionTypesInfo(typesInfo: TypesInfoStorage): UnionTypeInfoStorage {
    const storage = new UnionTypeInfoStorage();
    getMetadataStorage().unions.forEach(unionMetadata => {
      storage.set(this.mapUnionMetadata(unionMetadata, typesInfo));
    });
    return storage;
  }

  private mapUnionMetadata(unionMetadata: UnionMetadataWithSymbol, typesInfo: TypesInfoStorage) {
    return {
      unionSymbol: unionMetadata.symbol,
      type: new GraphQLUnionType({
        name: unionMetadata.name,
        description: unionMetadata.description,
        types: () =>
          unionMetadata.types.map(
            objectType => typesInfo.objectTypesInfo.findByConstructor(objectType)!.type,
          ),
        resolveType: instance => {
          const instanceTarget = unionMetadata.types.find(type => instance instanceof type);
          if (!instanceTarget) {
            throw new UnionResolveTypeError(unionMetadata);
          }
          return typesInfo.objectTypesInfo.findByConstructor(instanceTarget)!.type;
        },
      }),
    };
  }

  private getEnumTypesInfo(): EnumTypeInfoStorage {
    const storage = new EnumTypeInfoStorage();
    getMetadataStorage().enums.forEach(enumMetadata => {
      const enumMap = getEnumValuesMap(enumMetadata.enumObj);
      const info: EnumTypeInfo = {
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
      storage.set(info);
    });
    return storage;
  }

  private getInterfaceTypesInfo(typesInfo: TypesInfoStorage): InterfaceTypeInfoStorage {
    const storage = new InterfaceTypeInfoStorage();

    getMetadataStorage().interfaceTypes.forEach(interfaceType => {
      const interfaceSuperClass = Object.getPrototypeOf(interfaceType.target);
      const hasExtended = interfaceSuperClass.prototype !== undefined;
      const getSuperClassType = () => {
        const superClassTypeInfo = typesInfo.interfaceTypesInfo.findByConstructor(
          interfaceSuperClass,
        );
        return superClassTypeInfo ? superClassTypeInfo.type : undefined;
      };
      const info: InterfaceTypeInfo = {
        target: interfaceType.target,
        type: new GraphQLInterfaceType({
          name: interfaceType.name,
          description: interfaceType.description,
          fields: () => {
            let fields = interfaceType.fields!.reduce<GraphQLFieldConfigMap<any, any>>(
              (fieldsMap, field) => {
                fieldsMap[field.schemaName] = {
                  description: field.description,
                  type: this.graphqlTypeBuilder.getGraphQLOutputType(
                    typesInfo,
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
      storage.set(info);
    });
    return storage;
  }

  private getObjectTypesInfo(typesInfo: TypesInfoStorage): ObjectTypeInfoStorage {
    const storage = new ObjectTypeInfoStorage();
    getMetadataStorage().objectTypes.forEach(objectType => {
      const objectSuperClass = Object.getPrototypeOf(objectType.target);
      const hasExtended = objectSuperClass.prototype !== undefined;
      const interfaceClasses = objectType.interfaceClasses || [];
      const info: ObjectTypeInfo = {
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
                typesInfo.interfaceTypesInfo.findByConstructor(interfaceClass)!.type,
            );
            // copy interfaces from super class
            if (hasExtended) {
              const superClass = this.superClassSearcher.getSuperClassObjectType(
                typesInfo,
                objectType,
              );
              if (superClass) {
                const superInterfaces = superClass.getInterfaces();
                interfaces = Array.from(new Set(interfaces.concat(superInterfaces)));
              }
            }
            return interfaces;
          },
          fields: () => {
            let fields = this.createObjectTypesInfoConfigMap(objectType, typesInfo);
            // support for extending classes - get field info from prototype
            if (hasExtended) {
              const superClass = this.superClassSearcher.getSuperClassObjectType(
                typesInfo,
                objectType,
              );
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
                const interfaceType = typesInfo.interfaceTypesInfo.findByConstructor(
                  interfaceClass,
                )!.type;
                return Object.assign(fieldsMap, getFieldMetadataFromObjectType(interfaceType));
              }, {});
              fields = Object.assign({}, interfacesFields, fields);
            }
            return fields;
          },
        }),
      };
      storage.set(info);
    });
    return storage;
  }

  private createObjectTypesInfoConfigMap(objectType: ClassMetadata, typesInfo: TypesInfoStorage) {
    return objectType.fields!.reduce<GraphQLFieldConfigMap<any, any>>((fieldsMap, field) => {
      const fieldResolverMetadata = getMetadataStorage().fieldResolvers.find(
        resolver =>
          resolver.getObjectType!() === objectType.target &&
          resolver.methodName === field.name &&
          (resolver.resolverClassMetadata === undefined ||
            resolver.resolverClassMetadata.isAbstract === false),
      );
      fieldsMap[field.schemaName] = {
        type: this.graphqlTypeBuilder.getGraphQLOutputType(
          typesInfo,
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
    }, {});
  }
}

export class InputTypesInfoGenerator {
  constructor(
    private graphqlTypeBuilder: GraphqlTypeBuilder,
    private superClassSearcher: SuperClassSearcher,
  ) {}

  getInputTypesInfo(typeInfo: TypesInfoStorage): InputObjectTypeInfoStorage {
    const storage = new InputObjectTypeInfoStorage();

    getMetadataStorage().inputTypes.forEach(inputType => {
      const inputInstance = new (inputType.target as any)();
      const info: InputObjectTypeInfo = {
        target: inputType.target,
        type: new GraphQLInputObjectType({
          name: inputType.name,
          description: inputType.description,
          fields: () => {
            return this.createInputTypesInfoConfigMap(inputType, inputInstance, typeInfo);
          },
        }),
      };
      storage.set(info);
    });
    return storage;
  }

  // support for extending classes - get field info from prototype
  private mergeWithSuperClass(
    typeInfo: TypesInfoStorage,
    fields: GraphQLInputFieldConfigMap,
    inputType: ClassMetadata,
  ): GraphQLInputFieldConfigMap {
    const superClass:
      | GraphQLInputObjectType
      | undefined = this.superClassSearcher.getSuperClassInputType(typeInfo, inputType);
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
    return this.mergeWithSuperClass(typeInfo, fields, inputType);
  }
}

export class SuperClassSearcher {
  getSuperClassInputType(
    typeInfo: TypesInfoStorage,
    classMetadata: ClassMetadata,
  ): GraphQLInputObjectType | undefined {
    const objectSuperClass = this.getSuperObjectClass(classMetadata);
    if (objectSuperClass === undefined) {
      return undefined;
    }
    const superClassTypeInfo = typeInfo.inputTypesInfo.findByConstructor(objectSuperClass);
    return superClassTypeInfo ? superClassTypeInfo.type : undefined;
  }

  getSuperClassObjectType(
    typeInfo: TypesInfoStorage,
    classMetadata: ClassMetadata,
  ): GraphQLObjectType | undefined {
    const objectSuperClass = this.getSuperObjectClass(classMetadata);
    if (objectSuperClass === undefined) {
      return undefined;
    }
    const superClassTypeInfo = typeInfo.objectTypesInfo.findByConstructor(objectSuperClass);
    return superClassTypeInfo ? superClassTypeInfo.type : undefined;
  }

  private getSuperObjectClass(classMetadata: ClassMetadata): any | undefined {
    const objectSuperClass = Object.getPrototypeOf(classMetadata.target);
    if (objectSuperClass.prototype === undefined) {
      return undefined;
    }
    return objectSuperClass;
  }
}
