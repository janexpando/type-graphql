import {
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLUnionType,
} from "graphql";

export type SupportedGraphQLType =
  | GraphQLObjectType
  | GraphQLInputObjectType
  | GraphQLInterfaceType
  | GraphQLEnumType
  | GraphQLUnionType;

export interface TypeInfo<T extends SupportedGraphQLType> {
  type: T;
}

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

export class TypesInfoStorage {
  objectTypesInfo: ObjectTypeInfoStorage = new ObjectTypeInfoStorage();
  inputTypesInfo: InputObjectTypeInfo[] = [];
  interfaceTypesInfo: InterfaceTypeInfo[] = [];
  enumTypesInfo: EnumTypeInfo[] = [];
  unionTypesInfo: UnionTypeInfo[] = [];
}

export interface Storage<T> {
  findByConstructor(constructor: any): T | undefined;
  getTypes(): SupportedGraphQLType[];
}

export class ObjectTypeInfoStorage implements Storage<ObjectTypeInfo> {
  private items: ObjectTypeInfo[] = [];

  findByConstructor(constructor: any): ObjectTypeInfo | undefined {
    return this.items.find(type => type.target === constructor);
  }

  getTypes(): GraphQLObjectType[] {
    return this.items.map(it => it.type);
  }
}
