import { customType } from "drizzle-orm/pg-core";

/** Raw binary column — used for encrypted secrets (never selected by default). */
export const bytea = customType<{ data: Buffer; notNull: false; default: false }>(
  {
    dataType() {
      return "bytea";
    },
  },
);
