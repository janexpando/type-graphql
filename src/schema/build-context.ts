import { GraphQLScalarType } from "graphql";
import { ValidatorOptions } from "class-validator";
import { PubSubEngine, PubSub, PubSubOptions } from "graphql-subscriptions";

import { AuthChecker, AuthMode } from "../interfaces";
import { Middleware } from "../interfaces/Middleware";
import { getMetadataStorage } from "../metadata/getMetadataStorage";
import { SchemaGeneratorOptions } from "./schema-generator";

export type DateScalarMode = "isoDate" | "timestamp";

export interface ScalarsTypeMap {
  type: Function;
  scalar: GraphQLScalarType;
}

export interface BuildContextOptions {
  dateScalarMode?: DateScalarMode;
  scalarsMap?: ScalarsTypeMap[];
  /**
   * Indicates if class-validator should be used to auto validate objects injected into params.
   * You can also directly pass validator options to enable validator with a given options.
   */
  validate?: boolean | ValidatorOptions;
  authChecker?: AuthChecker<any, any>;
  authMode?: AuthMode;
  pubSub?: PubSubEngine | PubSubOptions;
  globalMiddlewares?: Array<Middleware<any>>;
}

export class BuildContext {
  dateScalarMode: DateScalarMode = "isoDate";
  scalarsMaps: ScalarsTypeMap[] = [];
  validate: boolean | ValidatorOptions = true;
  authChecker?: AuthChecker<any, any>;
  authMode: AuthMode = "error";
  pubSub: PubSubEngine = new PubSub();
  globalMiddlewares: Array<Middleware<any>> = [];

  static create(options: BuildContextOptions): BuildContext {
    this.checkForErrors(options);
    const context = new BuildContext();
    if (options.dateScalarMode !== undefined) {
      context.dateScalarMode = options.dateScalarMode;
    }
    if (options.scalarsMap !== undefined) {
      context.scalarsMaps = options.scalarsMap;
    }
    if (options.validate !== undefined) {
      context.validate = options.validate;
    }
    if (options.authChecker !== undefined) {
      context.authChecker = options.authChecker;
    }
    if (options.authMode !== undefined) {
      context.authMode = options.authMode;
    }
    if (options.pubSub !== undefined) {
      if ("eventEmitter" in options.pubSub) {
        context.pubSub = new PubSub(options.pubSub as PubSubOptions);
      } else {
        context.pubSub = options.pubSub as PubSubEngine;
      }
    }
    if (options.globalMiddlewares) {
      context.globalMiddlewares = options.globalMiddlewares;
    }
    return context;
  }

  static checkForErrors(options: SchemaGeneratorOptions) {
    if (!getMetadataStorage().authorizedFields.isEmpty && options.authChecker === undefined) {
      throw new Error(
        "You need to provide `authChecker` function for `@Authorized` decorator usage!",
      );
    }
  }
}
