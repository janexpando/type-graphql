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
  BaseResolverMetadata,
} from "../metadata/definitions";
import { createHandlerResolver } from "../resolvers/create";
import { BuildContext, BuildContextOptions } from "./build-context";
import { GeneratingSchemaError, MissingSubscriptionTopicsError } from "../errors";
import { ClassType, ResolverFilterData, ResolverTopicData } from "../interfaces";
import { TypesInfoBuilder } from "./types-info-builder";
import { TypesInfoStorage } from "./types-info-storage";
import { getDefaultValue } from "./getDefaultValue";
import { GraphqlTypeBuilder } from "./graphql-type-builder";
import {
  ResolverMetadataStorage,
  SubscriptionResolverMetadataStorage,
  TargetSpecificStorage,
} from "../metadata/metadata-storage";

// tslint:disable-next-line:no-empty-interface
export interface SchemaGeneratorOptions extends BuildContextOptions {}

export class HandlerArgsGenerator {
  constructor(private graphqTypeBuilder: GraphqlTypeBuilder) {}

  generateHandlerArgs(params: ParamMetadata[]): GraphQLFieldConfigArgumentMap {
    return params!.reduce<GraphQLFieldConfigArgumentMap>((args, param) => {
      if (param.kind === "arg") {
        args[param.name] = {
          description: param.description,
          type: this.graphqTypeBuilder.getGraphQLInputType(
            param.name,
            param.getType(),
            param.typeOptions,
          ),
          defaultValue: param.typeOptions.defaultValue,
        };
      } else if (param.kind === "args") {
        const argumentType = getMetadataStorage().argumentTypes.find(param.getType() as ClassType)!;
        let superClass = Object.getPrototypeOf(argumentType.target);
        while (superClass.prototype !== undefined) {
          const superArgumentType = getMetadataStorage().argumentTypes.find(superClass)!;
          this.mapArgFields(superArgumentType, args);
          superClass = Object.getPrototypeOf(superClass);
        }
        this.mapArgFields(argumentType, args);
      }
      return args;
    }, {});
  }

  private mapArgFields(argumentType: ClassMetadata, args: GraphQLFieldConfigArgumentMap = {}) {
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
          field.name,
          field.getType(),
          field.typeOptions,
        ),
        defaultValue: field.typeOptions.defaultValue,
      };
    });
  }
}

export class HandlerFieldsGenerator {
  constructor(
    private typesInfo: TypesInfoStorage,
    private graphqlTypeBuilder: GraphqlTypeBuilder,
    private handlerArgsGenerator: HandlerArgsGenerator,
    private buildContext: BuildContext,
  ) {}

  generateHandlerFields<T = any, U = any>(
    handlers: TargetSpecificStorage<ResolverMetadata>,
  ): GraphQLFieldConfigMap<T, U> {
    const fields: GraphQLFieldConfigMap<T, U> = {};
    for (const handler of handlers) {
      if (handler.resolverClassMetadata && handler.resolverClassMetadata.isAbstract) {
        continue;
      }
      fields[handler.schemaName] = {
        type: this.graphqlTypeBuilder.getGraphQLOutputType(
          handler.methodName,
          handler.getReturnType(),
          handler.returnTypeOptions,
        ),
        args: this.handlerArgsGenerator.generateHandlerArgs(handler.params!),
        resolve: createHandlerResolver(this.buildContext, handler),
        description: handler.description,
        deprecationReason: handler.deprecationReason,
        complexity: handler.complexity,
      };
    }
    return fields;
  }
}

export class SchemaGenerator {
  private typesInfo: TypesInfoStorage;
  private graphqlTypeBuilder: GraphqlTypeBuilder;
  private handlerArgsGenerator: HandlerArgsGenerator;
  private handlerFieldsGenerator: HandlerFieldsGenerator;

  constructor(private buildContext: BuildContext) {
    this.typesInfo = new TypesInfoStorage();
    this.graphqlTypeBuilder = new GraphqlTypeBuilder(this.typesInfo, this.buildContext);
    this.handlerArgsGenerator = new HandlerArgsGenerator(this.graphqlTypeBuilder);
    this.handlerFieldsGenerator = new HandlerFieldsGenerator(
      this.typesInfo,
      this.graphqlTypeBuilder,
      this.handlerArgsGenerator,
      this.buildContext,
    );
  }

  async generateFromMetadata(): Promise<GraphQLSchema> {
    const schema = this.generateFromMetadataSync();
    const { errors } = await graphql(schema, getIntrospectionQuery());
    if (errors) {
      throw new GeneratingSchemaError(errors);
    }
    return schema;
  }

  generateFromMetadataSync(): GraphQLSchema {
    getMetadataStorage().build();
    this.buildTypesInfo();

    const schema = new GraphQLSchema({
      query: this.buildRootQueryType(),
      mutation: this.buildRootMutationType(),
      subscription: this.buildRootSubscriptionType(),
      types: this.buildOtherTypes(),
    });
    return schema;
  }

  private buildTypesInfo() {
    const builder = new TypesInfoBuilder(
      this.typesInfo,
      this.graphqlTypeBuilder,
      this.handlerArgsGenerator,
      this.buildContext,
    );
    builder.buildTypesInfo();
  }

  private buildRootQueryType(): GraphQLObjectType {
    return new GraphQLObjectType({
      name: "Query",
      fields: this.handlerFieldsGenerator.generateHandlerFields(getMetadataStorage().queries),
    });
  }

  private buildRootMutationType(): GraphQLObjectType | undefined {
    if (getMetadataStorage().mutations.isEmpty) {
      return;
    }
    return new GraphQLObjectType({
      name: "Mutation",
      fields: this.handlerFieldsGenerator.generateHandlerFields(getMetadataStorage().mutations),
    });
  }

  private buildRootSubscriptionType(): GraphQLObjectType | undefined {
    if (getMetadataStorage().subscriptions.isEmpty) {
      return;
    }
    return new GraphQLObjectType({
      name: "Subscription",
      fields: this.generateSubscriptionsFields(getMetadataStorage().subscriptions),
    });
  }

  private buildOtherTypes(): GraphQLNamedType[] {
    // TODO: investigate the need of directly providing this types
    // maybe GraphQL can use only the types provided indirectly
    return [
      ...this.typesInfo.objectTypesInfo.getTypes(),
      ...this.typesInfo.interfaceTypesInfo.getTypes(),
    ];
  }

  private generateSubscriptionsFields<T = any, U = any>(
    subscriptionsHandlers: SubscriptionResolverMetadataStorage,
  ): GraphQLFieldConfigMap<T, U> {
    const { pubSub } = this.buildContext;
    const basicFields = this.handlerFieldsGenerator.generateHandlerFields(subscriptionsHandlers);
    const fields = basicFields;
    for (const handler of subscriptionsHandlers) {
      if (handler.resolverClassMetadata && handler.resolverClassMetadata.isAbstract) {
        continue;
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
    }
    return fields;
  }
}
