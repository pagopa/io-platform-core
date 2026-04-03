import {
  mountGetGreetingHandler,
  mountInfoHandler,
} from "./adapters/inbound/azure-functions-v4/index.js";
import { mountPostGreetingHandler } from "./adapters/inbound/azure-functions-v4/post-greeting.handler.js";
import { InMemoryGreetingRepository } from "./adapters/outbound/persistence/in-memory-greeting.repository.js";
import { makeGreetingUseCase } from "./application/use-cases/greeting.use-case.js";
import { getInfoUseCase } from "./application/use-cases/info.use-case.js";

// --- Dependency wiring ---

const greetingRepository = new InMemoryGreetingRepository();
const greetingUseCase = makeGreetingUseCase(greetingRepository);

// --- HTTP function registrations ---

mountInfoHandler(getInfoUseCase);

mountGetGreetingHandler(greetingUseCase);

mountPostGreetingHandler(greetingUseCase);
