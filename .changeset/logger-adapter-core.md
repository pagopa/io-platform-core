---
"@pagopa/hexagonal-core": minor
---

Add a technology-agnostic `Logger` outbound port (`domain/ports/outbound`) and an
opt-in Application Insights adapter (`@pagopa/hexagonal-core/adapters/logger`)
that wraps the corporate `@pagopa/azure-tracing` library behind a narrow
`AppInsightsTelemetryClient` seam. Ships `makeApplicationInsightsLogger`,
`noopLogger` and the `LogLevel` → App Insights severity mapping. The corporate
library is an optional peer dependency, so consumers that don't use App Insights
never load it; the generic `./adapters` barrel stays vendor-free.
