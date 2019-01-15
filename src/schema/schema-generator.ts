import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLNamedType,
  GraphQLFieldConfigMap,
  GraphQLFieldConfigArgumentMap,
  graphql,
  getIntrospectionQuery,
} from "graphql";
import { withFilter, ResolverFn } from "graphql-subscriptions";

import { getMetadataStorage } from "../metadata/getMetadataStorage";
import {
  ResolverMetadata,
  ParamMetadata,
  ClassMetadata,
  SubscriptionResolverMetadata,
} from "../metadata/definitions";
import { createHandlerResolver } from "../resolvers/create";
import { BuildContext, BuildContextOptions } from "./build-context";
import { GeneratingSchemaError, MissingSubscriptionTopicsError } from "../errors";
import { ResolverFilterData, ResolverTopicData } from "../interfaces";
import { TypesInfoBuilder } from "./types-info-builder";
import { TypesInfoStorage } from "./types-info-storage";
import { getDefaultValue } from "./getDefaultValue";
import { GraphqlTypeBuilder } from "./graphql-type-builder";

// tslint:disable-next-line:no-empty-interface
export interface SchemaGeneratorOptions extends BuildContextOptions {}

export class HandlerArgsGenerator {
  constructor(private graphqTypeBuilder: GraphqlTypeBuilder) {}

  generateHandlerArgs(
    typesInfo: TypesInfoStorage,
    params: ParamMetadata[],
  ): GraphQLFieldConfigArgumentMap {
    return params!.reduce<GraphQLFieldConfigArgumentMap>((args, param) => {
      if (param.kind === "arg") {
        args[param.name] = {
          description: param.description,
          type: this.graphqTypeBuilder.getGraphQLInputType(
            typesInfo,
            param.name,
            param.getType(),
            param.typeOptions,
          ),
          defaultValue: param.typeOptions.defaultValue,
        };
      } else if (param.kind === "args") {
        const argumentType = getMetadataStorage().argumentTypes.find(
          it => it.target === param.getType(),
        )!;
        let superClass = Object.getPrototypeOf(argumentType.target);
        while (superClass.prototype !== undefined) {
          const superArgumentType = getMetadataStorage().argumentTypes.find(
            it => it.target === superClass,
          )!;
          this.mapArgFields(typesInfo, superArgumentType, args);
          superClass = Object.getPrototypeOf(superClass);
        }
        this.mapArgFields(typesInfo, argumentType, args);
      }
      return args;
    }, {});
  }

  private mapArgFields(
    typesInfo: TypesInfoStorage,
    argumentType: ClassMetadata,
    args: GraphQLFieldConfigArgumentMap = {},
  ) {
    const argumentInstance = new (argumentType.target as any)();
    argumentType.fields!.forEach(field => {
      field.typeOptions.defaultValue = getDefaultValue(
        argumentInstance,
        field.typeOptions,
        field.name,
        argumentType.name,
      );
      args[field.schemaName] = {
        description: field.description,
        type: this.graphqTypeBuilder.getGraphQLInputType(
          typesInfo,
          field.name,
          field.getType(),
          field.typeOptions,
        ),
        defaultValue: field.typeOptions.defaultValue,
      };
    });
  }
}

export abstract class SchemaGenerator {
  private static typesInfo: TypesInfoStorage;

  private static graphqlTypeBuilder: GraphqlTypeBuilder = new GraphqlTypeBuilder();

  private static handlerArgsGenerator: HandlerArgsGenerator = new HandlerArgsGenerator(
    new GraphqlTypeBuilder(),
  );

  static async generateFromMetadata(options: SchemaGeneratorOptions): Promise<GraphQLSchema> {
    const schema = this.generateFromMetadataSync(options);
    const { errors } = await graphql(schema, getIntrospectionQuery());
    if (errors) {
      throw new GeneratingSchemaError(errors);
    }
    return schema;
  }

  static generateFromMetadataSync(options: SchemaGeneratorOptions): GraphQLSchema {
    this.checkForErrors(options);
    BuildContext.create(options);
    getMetadataStorage().build();
    this.buildTypesInfo();

    const schema = new GraphQLSchema({
      query: this.buildRootQueryType(),
      mutation: this.buildRootMutationType(),
      subscription: this.buildRootSubscriptionType(),
      types: this.buildOtherTypes(),
    });

    BuildContext.reset();
    return schema;
  }

  private static checkForErrors(options: SchemaGeneratorOptions) {
    if (getMetadataStorage().authorizedFields.length !== 0 && options.authChecker === undefined) {
      throw new Error(
        "You need to provide `authChecker` function for `@Authorized` decorator usage!",
      );
    }
  }

  private static buildTypesInfo() {
    const builder = new TypesInfoBuilder(this.graphqlTypeBuilder, this.handlerArgsGenerator);
    this.typesInfo = builder.buildTypesInfo();
  }

  private static buildRootQueryType(): GraphQLObjectType {
    return new GraphQLObjectType({
      name: "Query",
      fields: this.generateHandlerFields(getMetadataStorage().queries),
    });
  }

  private static buildRootMutationType(): GraphQLObjectType | undefined {
    if (getMetadataStorage().mutations.length === 0) {
      return;
    }
    return new GraphQLObjectType({
      name: "Mutation",
      fields: this.generateHandlerFields(getMetadataStorage().mutations),
    });
  }

  private static buildRootSubscriptionType(): GraphQLObjectType | undefined {
    if (getMetadataStorage().subscriptions.length === 0) {
      return;
    }
    return new GraphQLObjectType({
      name: "Subscription",
      fields: this.generateSubscriptionsFields(getMetadataStorage().subscriptions),
    });
  }

  private static buildOtherTypes(): GraphQLNamedType[] {
    // TODO: investigate the need of directly providing this types
    // maybe GraphQL can use only the types provided indirectly
    return [
      ...this.typesInfo.objectTypesInfo.map(it => it.type),
      ...this.typesInfo.interfaceTypesInfo.map(it => it.type),
    ];
  }

  private static generateHandlerFields<T = any, U = any>(
    handlers: ResolverMetadata[],
  ): GraphQLFieldConfigMap<T, U> {
    return handlers.reduce<GraphQLFieldConfigMap<T, U>>((fields, handler) => {
      // omit emitting abstract resolver fields
      if (handler.resolverClassMetadata && handler.resolverClassMetadata.isAbstract) {
        return fields;
      }
      fields[handler.schemaName] = {
        type: this.graphqlTypeBuilder.getGraphQLOutputType(
          this.typesInfo,
          handler.methodName,
          handler.getReturnType(),
          handler.returnTypeOptions,
        ),
        args: this.handlerArgsGenerator.generateHandlerArgs(this.typesInfo, handler.params!),
        resolve: createHandlerResolver(handler),
        description: handler.description,
        deprecationReason: handler.deprecationReason,
        complexity: handler.complexity,
      };
      return fields;
    }, {});
  }

  private static generateSubscriptionsFields<T = any, U = any>(
    subscriptionsHandlers: SubscriptionResolverMetadata[],
  ): GraphQLFieldConfigMap<T, U> {
    const { pubSub } = BuildContext;
    const basicFields = this.generateHandlerFields(subscriptionsHandlers);
    return subscriptionsHandlers.reduce<GraphQLFieldConfigMap<T, U>>((fields, handler) => {
      // omit emitting abstract resolver fields
      if (handler.resolverClassMetadata && handler.resolverClassMetadata.isAbstract) {
        return fields;
      }

      let pubSubIterator: ResolverFn;
      if (typeof handler.topics === "function") {
        const getTopics = handler.topics;
        pubSubIterator = (payload, args, context, info) => {
          const resolverTopicData: ResolverTopicData = { payload, args, context, info };
          const topics = getTopics(resolverTopicData);
          if (Array.isArray(topics) && topics.length === 0) {
            throw new MissingSubscriptionTopicsError(handler.target, handler.methodName);
          }
          return pubSub.asyncIterator(topics);
        };
      } else {
        const topics = handler.topics;
        pubSubIterator = () => pubSub.asyncIterator(topics);
      }

      fields[handler.schemaName].subscribe = handler.filter
        ? withFilter(pubSubIterator, (payload, args, context, info) => {
            const resolverFilterData: ResolverFilterData = { payload, args, context, info };
            return handler.filter!(resolverFilterData);
          })
        : pubSubIterator;
      return fields;
    }, basicFields);
  }
}
