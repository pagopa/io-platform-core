export type Brand<T, N extends string> = T & { __brand: N };

export type FiscalCode = Brand<string, "FiscalCode">;
