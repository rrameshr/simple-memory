import mongoose from "mongoose";
import { HttpError } from "../utils/httpError.js";

/** validate(schema, "body" | "query") -> replaces req[source] with the parsed (trimmed, coerced) data. */
export const validate = (schema, source = "body") => (req, _res, next) => {
  const parsed = schema.safeParse(req[source]);
  if (!parsed.success) return next(parsed.error);
  if (source === "query") Object.defineProperty(req, "query", { value: parsed.data, writable: true });
  else req[source] = parsed.data;
  next();
};

export const idParams = (...names) => (req, _res, next) => {
  for (const n of names) {
    if (!mongoose.isValidObjectId(req.params[n])) return next(new HttpError(400, `Invalid ${n}.`));
  }
  next();
};
