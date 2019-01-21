import * as glob from "glob";
import { ResolverMarker } from "../utils/resolver-marker";

export function findFileNamesFromGlob(globString: string) {
  return glob.sync(globString);
}

export function loadResolversFromGlob(globString: string): Function[] {
  const filePaths = findFileNamesFromGlob(globString);
  const modules = filePaths.map(fileName => require(fileName));
  const resolvers = [];
  for (const module of modules) {
    resolvers.push(...loadResolversFromModule(module));
  }
  return resolvers;
}
function loadResolversFromModule(module: any): Function[] {
  if (ResolverMarker.isResolver(module)) {
    return [module];
  }
  const resolvers = [];
  for (const name of Object.keys(module)) {
    const potentialResolver = module[name];
    if (ResolverMarker.isResolver(potentialResolver)) {
      resolvers.push(potentialResolver);
    }
  }
  return resolvers;
}
