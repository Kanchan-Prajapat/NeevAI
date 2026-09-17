export type DateValue =
  | string
  | Date
  | {
      toDate?: () => Date;
    }
  | null
  | undefined;

export const toDate = (
  value: DateValue
): Date | null => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : value;
  }

  if (typeof value === "string") {
    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  if (
    typeof value === "object" &&
    typeof value.toDate === "function"
  ) {
    const date = value.toDate();

    return Number.isNaN(date.getTime())
      ? null
      : date;
  }

  return null;
};

export const daysBetween = (
  start: Date | null,
  end: Date | null
): number => {
  if (!start || !end) return 0;

  const difference =
    end.getTime() - start.getTime();

  return Math.max(
    0,
    difference / (1000 * 60 * 60 * 24)
  );
};