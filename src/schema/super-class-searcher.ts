import { Storage, TypesInfoStorage } from "./types-info-storage";
import { ClassMetadata } from "../metadata/definitions";
import { GraphQLInputObjectType, GraphQLInterfaceType, GraphQLObjectType } from "graphql";

export class SuperClassSearcher {
  constructor(private typeInfo: TypesInfoStorage) {}
  getSuperClassInputType(classMetadata: ClassMetadata): GraphQLInputObjectType | undefined {
    return this.getSuperClassType(this.typeInfo.inputTypesInfo, classMetadata);
  }

  getSuperClassObjectType(classMetadata: ClassMetadata): GraphQLObjectType | undefined {
    return this.getSuperClassType(this.typeInfo.objectTypesInfo, classMetadata);
  }

  getSuperClassInterfacesType(classMetadata: ClassMetadata): GraphQLInterfaceType | undefined {
    return this.getSuperClassType(this.typeInfo.interfaceTypesInfo, classMetadata);
  }

  private getSuperClassType(storage: Storage, classMetadata: ClassMetadata): any {
    const objectSuperClass = this.getSuperObjectClass(classMetadata);
    if (objectSuperClass === undefined) {
      return undefined;
    }
    const superClassTypeInfo = storage.findByConstructor(objectSuperClass);
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
