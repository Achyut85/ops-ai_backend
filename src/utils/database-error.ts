export type UniqueConstraintError = {
  sqlState: "23505";
  constraint?: string;
};

export const isUniqueConstraintError = (
  error: unknown,
): error is UniqueConstraintError => {
  return (
    typeof error === "object" &&
    error !== null &&
    "sqlState" in error &&
    error.sqlState === "23505"
  );
};