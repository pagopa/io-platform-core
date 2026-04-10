export type Brand<T> = T & {
  readonly __brand: unique symbol;
};
