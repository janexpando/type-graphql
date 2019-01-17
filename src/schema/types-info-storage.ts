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
  inputTypesInfo: InputObjectTypeInfoStorage = new InputObjectTypeInfoStorage();
  interfaceTypesInfo: InterfaceTypeInfoStorage = new InterfaceTypeInfoStorage();
  enumTypesInfo: EnumTypeInfoStorage = new EnumTypeInfoStorage();
  unionTypesInfo: UnionTypeInfoStorage = new UnionTypeInfoStorage();
}
export type Index = Function | object | symbol;

export abstract class Storage<
  GT extends SupportedGraphQLType = SupportedGraphQLType,
  T extends TypeInfo<GT> = TypeInfo<GT>
> {
  protected items: Map<Index, T>;

  constructor(items: T[] = []) {
    this.items = new Map();
    for (const item of items) {
      this.set(item);
    }
  }

  findByConstructor(constructor: Index): T | undefined {
    return this.items.get(constructor);
  }

  getTypes(): GT[] {
    const result: GT[] = [];
    for (const item of this.items.values()) {
      result.push(item.type);
    }
    return result;
  }

  set(typeInfo: T) {
    this.items.set(this.getIndex(typeInfo), typeInfo);
  }

  protected getIndex(item: T): Index {
    throw new Error("Not implemented");
  }
}

type TargetIndexed = ObjectTypeInfo | InputObjectTypeInfo | InterfaceTypeInfo;
type GTargetIndexed = GraphQLObjectType | GraphQLInputObjectType | GraphQLInterfaceType;

export abstract class TargetIndexedStorage<
  GT extends GTargetIndexed,
  T extends TargetIndexed
> extends Storage<GT, any> {
  protected getIndex(item: T): Index {
    return item.target;
  }
}

export class ObjectTypeInfoStorage extends TargetIndexedStorage<
  GraphQLObjectType,
  ObjectTypeInfo
> {}

export class InputObjectTypeInfoStorage extends TargetIndexedStorage<
  GraphQLInputObjectType,
  InputObjectTypeInfo
> {}

export class InterfaceTypeInfoStorage extends TargetIndexedStorage<
  GraphQLInterfaceType,
  InterfaceTypeInfo
> {}

export class EnumTypeInfoStorage extends Storage<GraphQLEnumType, EnumTypeInfo> {
  protected getIndex(item: EnumTypeInfo): Index {
    return item.enumObj;
  }
}

export class UnionTypeInfoStorage extends Storage<GraphQLUnionType, UnionTypeInfo> {
  protected getIndex(item: UnionTypeInfo): Index {
    return item.unionSymbol;
  }
}
