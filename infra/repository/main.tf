module "github_repository" {
  source  = "pagopa-dx/github-environment-bootstrap/github"
  version = "~> 1.0"

  repository = {
    name                   = "io-platform-core"
    description            = "The central monorepo for the IO platform ecosystem. Centralizing SDKs and shared packages to ensure developer productivity."
    topics                 = []
    reviewers_teams        = []
  }
}
