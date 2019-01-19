import { ObjectTypeInfo, TypesInfoStorage } from "../types-info-storage";
import { GraphqlTypeBuilder } from "../graphql-type-builder";
import { HandlerArgsGenerator } from "../schema-generator";
import { ClassMetadata } from "../../metadata/definitions";
import { GraphQLFieldConfigMap, GraphQLInterfaceType, GraphQLObjectType } from "graphql";
import { getFieldMetadataFromObjectType } from "../utils";
import { getMetadataStorage } from "../../metadata/getMetadataStorage";
import { createAdvancedFieldResolver, createSimpleFieldResolver } from "../../resolvers/create";
import { SuperClassSearcher } from "../super-class-searcher";
import { BuildContext } from "../build-context";

export class ObjectTypesInfoBuilder {
  constructor(
    private typesInfo: TypesInfoStorage,
    private superClassSearcher: SuperClassSearcher,
    private graphqlTypeBuilder: GraphqlTypeBuilder,
    private handlerArgsGenerator: HandlerArgsGenerator,
    private buildContext: BuildContext,
  ) {}

  createObjectTypeInfo(objectType: ClassMetadata): ObjectTypeInfo {
    const objectSuperClass = Object.getPrototypeOf(objectType.target);
    const hasExtended = objectSuperClass.prototype !== undefined;
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
        interfaces: () => this.createInterfaces(objectType),
        fields: () => {
          let fields = this.createObjectTypesInfoConfigMap(objectType);
          // support for extending classes - get field info from prototype
          if (hasExtended) {
            const superClass = this.superClassSearcher.getSuperClassObjectType(objectType);
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
              const interfaceType = this.typesInfo.interfaceTypesInfo.findByConstructor(
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
  }

  private createInterfaces(objectType: ClassMetadata) {
    function mergeArrays<T>(a: T[], b: T[]): T[] {
      return Array.from(new Set(a.concat(b)));
    }

    let interfaces: GraphQLInterfaceType[] = this.findInterfaces(
      objectType.interfaceClasses || [],
      this.typesInfo,
    );
    // copy interfaces from super class
    const superClass = this.superClassSearcher.getSuperClassObjectType(objectType);
    if (superClass) {
      const superInterfaces = superClass.getInterfaces();
      interfaces = mergeArrays(interfaces, superInterfaces);
    }

    return interfaces;
  }

  private findInterfaces(classes: Function[], typesInfo: TypesInfoStorage): GraphQLInterfaceType[] {
    return classes.map<GraphQLInterfaceType>(
      interfaceClass => typesInfo.interfaceTypesInfo.findByConstructor(interfaceClass)!.type,
    );
  }

  private createObjectTypesInfoConfigMap(objectType: ClassMetadata) {
    return objectType.fields!.reduce<GraphQLFieldConfigMap<any, any>>((fieldsMap, field) => {
      const fieldResolverMetadata = getMetadataStorage().fieldResolvers.findField(
        objectType,
        field,
      );
      fieldsMap[field.schemaName] = {
        type: this.graphqlTypeBuilder.getGraphQLOutputType(
          field.name,
          field.getType(),
          field.typeOptions,
        ),
        complexity: field.complexity,
        args: this.handlerArgsGenerator.generateHandlerArgs(field.params!),
        resolve: fieldResolverMetadata
          ? createAdvancedFieldResolver(this.buildContext, fieldResolverMetadata)
          : createSimpleFieldResolver(this.buildContext, field),
        description: field.description,
        deprecationReason: field.deprecationReason,
      };
      return fieldsMap;
    }, {});
  }
}
