import type { ContentType, Method, Schema } from "../../types/Swagger";
import { entries, objectPath } from "../../utils/utils";
import { allOf, anyOf, oneOf } from "./combiners";

export type MutatorItems = (schema: Schema) => Array<any>;
export type Mutators = {
  items?: MutatorItems
};

let SPEC = null;

const getSpec = () => {
  if (SPEC === undefined) { throw new Error(`Spec didn't loaded (or passed to parser). Use setSpec()`); }
  return SPEC;
};

// $FlowFixMe
const parseRef = (ref: string): Schema => objectPath(getSpec(), ref.slice(2), '/');

export const setSpec = (spec: Schema) => SPEC = spec;

export const getMethodModel: (path: string, method: string) => Method =
  (path, method) =>
    // $FlowFixMe
    getSpec().paths[path][method.toLowerCase()];

export const resolveRef = (schema: Schema) => {
  if (schema.$ref) { return parseRef(schema.$ref); }
  return schema;
};

export const getResponse: (method: Method, status?: number, contentType?: ContentType) => Schema
  = (method, status = 200, contentType = 'application/json') => {
  const schema = method.responses[status].content[contentType].schema;
  return resolveRef(schema);
};

export const processor: (cb: (data: Schema) => any, mutators: Mutators, schema: Schema) => any
  = (cb, mutators, schema) => {
  const next = processor.bind(this, cb, mutators);
  if ('$ref' in schema) {
    return next(resolveRef(schema));
  }

  if (schema.properties) {
    return entries(schema.properties).reduce((result, [key, property]) => {
      result[key] = next(property);
      return result;
    }, {});
  }

  if (schema.items) {
    if (mutators.items) {
      return mutators.items(schema).map(item => next(item));
    }
    return next(schema.items);
  }

  if ('oneOf' in schema || 'anyOf' in schema || 'allOf' in schema) {
    let combiner = () => schema;
    if (schema.oneOf) {combiner = oneOf(schema.oneOf)}
    if (schema.anyOf) {combiner = anyOf(schema.anyOf)}
    if (schema.allOf) {combiner = allOf(schema.allOf.map(resolveRef))}

    return next(combiner());
  }

  return cb(schema);
};
