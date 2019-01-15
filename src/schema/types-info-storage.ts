import {
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLUnionType,
} from "graphql";

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
  constructor(
    public objectTypesInfo: ObjectTypeInfo[] = [],
    public inputTypesInfo: InputObjectTypeInfo[] = [],
    public interfaceTypesInfo: InterfaceTypeInfo[] = [],
    public enumTypesInfo: EnumTypeInfo[] = [],
    public unionTypesInfo: UnionTypeInfo[] = [],
  ) {}
}
