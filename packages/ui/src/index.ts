import type { ReactNode } from "react";

export type BoxProps = { children?: ReactNode };

/** Shared UI primitives land here as duplication appears (Phase I). */
export function UiPackageName(): string {
  return "@microlead-crm/ui";
}
