import Router from 'koa-router';
import { Observable } from 'rxjs';

type Schema = {
  format: string;
  type: string;
};

type Parameter = {
  description?: string;
  name: string;
  required?: boolean;
  in: 'query' | 'body';
  schema: Schema
}

type Method = {
  operationId?: string;
  parameters: Array<Parameter>;
  summary?: string;
}

type Path = {
  [key: string] : Method
}

type Paths = {
  [key: string]: Path
}

const insertParamsToUrl = (path: string): string => path.replace(/{(\w+)}/g, `:$1`);

const addPathToRouter = (router) => ([path, params]) => {
  const methods = Object.entries(params);
  const pathWithParams = insertParamsToUrl(path);
  methods.forEach(([name, config]) => {
    router[name.toLowerCase()](config.operationId, pathWithParams, (ctx, next) => {
      ctx.body = `${config.summary}; ${JSON.stringify(ctx.params)}`;
      next();
    });
  });
};

export const createRouter = (paths: Paths, config = {}) => {
  const router = new Router(config);
  Object.entries(paths).forEach(addPathToRouter(router));
  return router;
};