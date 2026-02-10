export function assertDefined<T>(
  value: T,
  message = "Value is required",
): asserts value is NonNullable<T> {
  if (value === undefined || value === null) {
    throw new Error(message);
  }
}
