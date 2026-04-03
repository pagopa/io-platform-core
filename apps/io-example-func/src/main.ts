import {
  mountGetGreetingHandler,
  mountInfoHandler,
} from "./adapters/inbound/azure-functions-v4/index.js";
import { InMemoryGreetingRepository } from "./adapters/outbound/persistence/in-memory-greeting.repository.js";
import { makeGetGreetingUseCase } from "./application/use-cases/get-greeting.use-case.js";
import { getInfoUseCase } from "./application/use-cases/get-info.use-case.js";

// --- Dependency wiring ---

const greetingRepository = new InMemoryGreetingRepository();
const getGreetingUseCase = makeGetGreetingUseCase(greetingRepository);

// --- HTTP function registrations ---

mountInfoHandler(getInfoUseCase);

mountGetGreetingHandler(getGreetingUseCase);
