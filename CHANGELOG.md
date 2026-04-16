# Changelog

## 2.0.0 - 2026-04-16

### ⚠️ Breaking Changes

- SDK and CLI default API base URL is now `https://api.hargos.ai` (rebrand from xeops.ai).
- Package major versions bumped:
  - `@xeopsai/sdk`: `2.0.0`
  - `@xeopsai/cli`: `2.0.0`

### Migration Guide

- If you relied on old defaults, no action is required besides upgrading.
- If you pinned a custom endpoint, keep passing `apiEndpoint` in the SDK config or `--endpoint` in CLI commands.
- For explicit compatibility, update documentation and CI examples to reference `https://api.hargos.ai`.
