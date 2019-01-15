import { TypeOptions, TypeValue } from "../decorators/types";
import {
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLInputType,
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLUnionType,
} from "graphql";
import { convertTypeIfScalar, wrapWithTypeOptions } from "../helpers/types";

export interface ObjectTypeInfo {
  target: Function;
  type: GraphQLObjectType;
}

export interface InputObjectTypeInfo {
  target: Function;
  type: GraphQLInputObjectType;
}

export interface InterfaceTypeInfo {
  target: Function;
  type: GraphQLInterfaceType;
}

export interface EnumTypeInfo {
  enumObj: object;
  type: GraphQLEnumType;
}

export interface UnionTypeInfo {
  unionSymbol: symbol;
  type: GraphQLUnionType;
}

export class TypeInfoStorage {}

export class TypesInfo {
  constructor(
    public objectTypesInfo: ObjectTypeInfo[] = [],
    public inputTypesInfo: InputObjectTypeInfo[] = [],
    public interfaceTypesInfo: InterfaceTypeInfo[] = [],
    public enumTypesInfo: EnumTypeInfo[] = [],
    public unionTypesInfo: UnionTypeInfo[] = [],
  ) {}

  getSuperClassType(objectSuperClass: any) {
    const superClassTypeInfo = this.inputTypesInfo.find(type => type.target === objectSuperClass);
    return superClassTypeInfo ? superClassTypeInfo.type : undefined;
  }

  getGraphQLInputType(
    typeOwnerName: string,
    type: TypeValue,
    typeOptions: TypeOptions = {},
  ): GraphQLInputType {
    let gqlType: GraphQLInputType | undefined;
    gqlType = convertTypeIfScalar(type);
    if (!gqlType) {
      const inputType = this.inputTypesInfo.find(it => it.target === (type as Function));
      if (inputType) {
        gqlType = inputType.type;
      }
    }
    if (!gqlType) {
      const enumType = this.enumTypesInfo.find(it => it.enumObj === (type as Function));
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
    typeOwnerName: string,
    type: TypeValue,
    typeOptions: TypeOptions = {},
  ): GraphQLOutputType {
    let gqlType: GraphQLOutputType | undefined;
    gqlType = convertTypeIfScalar(type);
    if (!gqlType) {
      const objectType = this.objectTypesInfo.find(it => it.target === (type as Function));
      if (objectType) {
        gqlType = objectType.type;
      }
    }
    if (!gqlType) {
      const interfaceType = this.interfaceTypesInfo.find(it => it.target === (type as Function));
      if (interfaceType) {
        gqlType = interfaceType.type;
      }
    }
    if (!gqlType) {
      const enumType = this.enumTypesInfo.find(it => it.enumObj === (type as Function));
      if (enumType) {
        gqlType = enumType.type;
      }
    }
    if (!gqlType) {
      const unionType = this.unionTypesInfo.find(it => it.unionSymbol === (type as symbol));
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
