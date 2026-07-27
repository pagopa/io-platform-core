import { ConflictError } from "@pagopa/hexagonal-core/domain/errors";

export class WidgetAlreadyExistsError extends ConflictError {
  override readonly tag = "widget-already-exists" as const;

  constructor() {
    super("A widget with the supplied name already exists");
  }
}
