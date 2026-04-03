import { NotFoundError } from "@pagopa/io-core-domain/errors";
import { err, ok } from "neverthrow";

import { Greeting } from "../../../domain/entities/greeting.entity.js";
import { IGreetingRepository } from "../../../domain/ports/outbound/persistence/greeting.repository.js";

const seedData = new Map<string, string>([
  ["io", "Welcome to the IO Platform!"],
  ["pagopa", "Ciao from PagoPA!"],
  ["world", "Hello, World!"],
]);

export class InMemoryGreetingRepository implements IGreetingRepository {
  async getByName(name: string) {
    const message = seedData.get(name.toLowerCase());

    if (!message) {
      return err(new NotFoundError("Greeting", name));
    }

    const greeting: Greeting = {
      message,
      timestamp: new Date().toISOString(),
    };

    return ok(greeting);
  }
}
