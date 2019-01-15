import "reflect-metadata";
import { graphql } from "graphql";
import { Container, Service } from "typedi";

import { IOCContainer } from "../../src/utils/container";
import { getMetadataStorage } from "../../src/metadata/getMetadataStorage";
import {
  ObjectType,
  Field,
  Resolver,
  Query,
  useContainer,
  buildSchema,
  ResolverData,
  ContainerType,
} from "../../src";

describe("IOC container", () => {
  beforeEach(() => {
    getMetadataStorage().clear();
    IOCContainer.restoreDefault();
    Container.reset();
  });

  it("should use provided container to load resolver class dependencies", async () => {
    let serviceValue: number | undefined;
    const initValue = 5;

    @Service()
    class SampleService {
      value = initValue;
    }

    @ObjectType()
    class SampleObject {
      @Field({ nullable: true })
      field?: string;
    }

    @Resolver(of => SampleObject)
    class SampleResolver {
      constructor(private service: SampleService) {}

      @Query()
      sampleQuery(): SampleObject {
        serviceValue = this.service.value;
        return {};
      }
    }

    useContainer(Container);
    const schema = await buildSchema({
      resolvers: [SampleResolver],
    });
    const query = /* graphql */ `
      query {
        sampleQuery {
          field
        }
      }
    `;
    await graphql(schema, query);

    expect(serviceValue).toEqual(initValue);
  });

  it("should use default container to instantiate resolver class", async () => {
    let resolverValue: number | undefined;

    @ObjectType()
    class SampleObject {
      @Field({ nullable: true })
      field?: string;
    }

    @Resolver(of => SampleObject)
    class SampleResolver {
      value = Math.random();

      @Query()
      sampleQuery(): SampleObject {
        resolverValue = this.value;
        return {};
      }
    }

    const schema = await buildSchema({
      resolvers: [SampleResolver],
    });
    const query = /* graphql */ `
      query {
        sampleQuery {
          field
        }
      }
    `;
    await graphql(schema, query);
    const firstCallValue = resolverValue;
    resolverValue = undefined;
    await graphql(schema, query);
    const secondCallValue = resolverValue;

    expect(firstCallValue).toBeDefined();
    expect(secondCallValue).toBeDefined();
    expect(firstCallValue).toEqual(secondCallValue);
  });

  it("should pass resolver's data to container's get", async () => {
    let contextRequestId!: number;
    useContainer({
      get(someClass, resolverData: ResolverData<{ requestId: number }>) {
        contextRequestId = resolverData.context.requestId;
        return Container.get(someClass);
      },
    });

    @Resolver()
    class SampleResolver {
      @Query()
      sampleQuery(): string {
        return "sampleQuery";
      }
    }

    const schema = await buildSchema({
      resolvers: [SampleResolver],
    });

    const query = /* graphql */ `
      query {
        sampleQuery
      }
    `;

    const requestId = Math.random();
    await graphql(schema, query, null, { requestId });
    expect(contextRequestId).toEqual(requestId);
  });

  it("should properly get container from container getter function", async () => {
    let called: boolean = false;

    interface TestContext {
      container: ContainerType;
    }

    useContainer<TestContext>(({ context }) => context.container);

    @Resolver()
    class SampleResolver {
      @Query()
      sampleQuery(): string {
        return "sampleQuery";
      }
    }

    const schema = await buildSchema({
      resolvers: [SampleResolver],
    });

    const query = /* graphql */ `
      query {
        sampleQuery
      }
    `;

    const mockedContainer: ContainerType = {
      get(someClass: any) {
        called = true;
        return Container.get(someClass);
      },
    };
    const queryContext: TestContext = {
      container: mockedContainer,
    };

    await graphql(schema, query, null, queryContext);

    expect(called).toEqual(true);
  });
  it.skip("should be able to work with instances", async () => {
    @Resolver()
    class SampleResolver {
      constructor(private url: string) {}

      @Query()
      getUrl(): string {
        return this.url || "";
      }
    }

    const query = /* graphql */ `
      query {
        getUrl
      }
    `;

    const resolverInstance = new SampleResolver("www.github.com");
    const schema = await buildSchema({
      resolvers: [resolverInstance],
    });

    const result = await graphql(schema, query);
    expect(result.errors).toBeFalsy();
    expect(result.data && result.data.getUrl).toBe("www.github.com");
  });
});
