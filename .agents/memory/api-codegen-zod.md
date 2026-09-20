---
name: API codegen and Zod compatibility
description: Codegen can emit Zod APIs newer than the installed package exposes.
---

When regenerating API schemas, verify the emitted Zod helpers against the workspace’s installed Zod version before relying on the generated output.

**Why:** The generated client passed its own source check but emitted a helper unavailable in the installed Zod version, which surfaced later during API-server typechecking.

**How to apply:** Run the shared-library check and API-server typecheck immediately after codegen; prefer the smallest generated-source compatibility correction when the OpenAPI contract itself is valid.