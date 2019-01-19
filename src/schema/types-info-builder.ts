import { getMetadataStorage } from "../metadata/getMetadataStorage";
import { HandlerArgsGenerator } from "./schema-generator";
import {
  EnumTypeInfoStorage,
  InputObjectTypeInfoStorage,
  InterfaceTypeInfoStorage,
  ObjectTypeInfoStorage,
  TypesInfoStorage,
  UnionTypeInfoStorage,
} from "./types-info-storage";
import { GraphqlTypeBuilder } from "./graphql-type-builder";
import { ObjectTypesInfoBuilder } from "./type-builders/object-types-info-builder";
import { InputTypesInfoBuilder } from "./type-builders/input-types-info-builder";
import { UnionTypesInfoBuilder } from "./type-builders/union-types-info-builder";
import { InterfaceTypesInfoBuilder } from "./type-builders/interface-types-info-builder";
import { SuperClassSearcher } from "./super-class-searcher";
import { EnumTypesInfoBuilder } from "./type-builders/enum-types-info-builder";
import { BuildContext } from "./build-context";

export class TypesInfoBuilder {
  private inputTypesInfoBuilder: InputTypesInfoBuilder;
  private objectTypesInfoBuilder: ObjectTypesInfoBuilder;
  private unionTypeInfoBuilder: UnionTypesInfoBuilder;
  private interfaceTypesInfoBuilder: InterfaceTypesInfoBuilder;
  private enumTypeInfoBuilder: EnumTypesInfoBuilder;
  private superClassSearcher: SuperClassSearcher;

  constructor(
    private typeInfo: TypesInfoStorage,
    private graphqlTypeBuilder: GraphqlTypeBuilder,
    private handlerArgsGenerator: HandlerArgsGenerator,
    private buildContext: BuildContext,
  ) {
    this.superClassSearcher = new SuperClassSearcher(this.typeInfo);
    this.inputTypesInfoBuilder = new InputTypesInfoBuilder(
      this.typeInfo,
      graphqlTypeBuilder,
      this.superClassSearcher,
    );
    this.objectTypesInfoBuilder = new ObjectTypesInfoBuilder(
      this.typeInfo,
      this.superClassSearcher,
      this.graphqlTypeBuilder,
      this.handlerArgsGenerator,
      this.buildContext,
    );
    this.unionTypeInfoBuilder = new UnionTypesInfoBuilder(this.typeInfo);
    this.interfaceTypesInfoBuilder = new InterfaceTypesInfoBuilder(
      this.typeInfo,
      this.graphqlTypeBuilder,
      this.superClassSearcher,
    );
    this.enumTypeInfoBuilder = new EnumTypesInfoBuilder();
  }

  buildTypesInfo(): TypesInfoStorage {
    this.typeInfo.unionTypesInfo = this.getUnionTypesInfo();
    this.typeInfo.enumTypesInfo = this.createEnumTypeStorage();
    this.typeInfo.interfaceTypesInfo = this.createInterfaceTypeStorage();
    this.typeInfo.objectTypesInfo = this.createObjectTypeStorage();
    this.typeInfo.inputTypesInfo = this.createInputTypesStorage();
    return this.typeInfo;
  }

  private getUnionTypesInfo(): UnionTypeInfoStorage {
    const storage = new UnionTypeInfoStorage();
    getMetadataStorage().unions.forEach(unionMetadata => {
      storage.set(this.unionTypeInfoBuilder.createUnionTypeInfo(unionMetadata));
    });
    return storage;
  }

  private createInterfaceTypeStorage(): InterfaceTypeInfoStorage {
    const storage = new InterfaceTypeInfoStorage();
    getMetadataStorage().interfaceTypes.forEach(interfaceType => {
      const info = this.interfaceTypesInfoBuilder.createInterfaceTypeInfo(interfaceType);
      storage.set(info);
    });
    return storage;
  }

  private createObjectTypeStorage(): ObjectTypeInfoStorage {
    const storage = new ObjectTypeInfoStorage();
    getMetadataStorage().objectTypes.forEach(objectType => {
      const info = this.objectTypesInfoBuilder.createObjectTypeInfo(objectType);
      storage.set(info);
    });
    return storage;
  }

  private createEnumTypeStorage(): EnumTypeInfoStorage {
    const storage = new EnumTypeInfoStorage();
    getMetadataStorage().enums.forEach(enumMetadata => {
      const info = this.enumTypeInfoBuilder.create(enumMetadata);
      storage.set(info);
    });
    return storage;
  }

  private createInputTypesStorage(): InputObjectTypeInfoStorage {
    const storage = new InputObjectTypeInfoStorage();
    getMetadataStorage().inputTypes.forEach(inputType => {
      const info = this.inputTypesInfoBuilder.create(inputType);
      storage.set(info);
    });
    return storage;
  }
}
