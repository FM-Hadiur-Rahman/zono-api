import { ZodError, ZodObject } from 'zod';

/**
 * Flexible validator:
 * 1) Single schema:  validate(schema, ['body','query','params'])
 *    - Merges picked parts and parses once. Result in req.validated (merged) and req.validatedParts.
 * 2) Sectioned schemas: validate({ body, query, params })
 *    - Parses each section separately. Results in req.validatedParts.{body,query,params} and merged req.validated.
 */
export const validate =
  (schemaOrMap, pick = ['body']) =>
  (req, res, next) => {
    try {
      const parts = {
        body: req.body ?? {},
        query: req.query ?? {},
        params: req.params ?? {},
      };

      let validatedParts = {};
      if (schemaOrMap && typeof schemaOrMap.parse === 'function') {
        // Case 1: single Zod schema
        const merged = Object.fromEntries(
          pick.map((k) => [k, parts[k]]).flatMap(([k, v]) => Object.entries(v)),
        );
        const parsed = schemaOrMap.parse(merged);
        validatedParts = Object.fromEntries(pick.map((k) => [k, {}]));
        req.validated = parsed;
      } else {
        // Case 2: sectioned schemas { body?, query?, params? }
        const map = schemaOrMap ?? {};
        const out = {};
        for (const key of /** @type {const} */ (['body', 'query', 'params'])) {
          if (map[key] instanceof ZodObject) {
            out[key] = map[key].parse(parts[key]);
          } else {
            out[key] = parts[key];
          }
        }
        validatedParts = out;
        req.validated = { ...out.params, ...out.query, ...out.body };
      }

      req.validatedParts = validatedParts; // access cleanly per section if needed
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res
          .status(400)
          .json({ error: 'ValidationError', details: err.flatten() });
      }
      next(err);
    }
  };
