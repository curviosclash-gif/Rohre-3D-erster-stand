---
trigger: bug_fixing_or_debugging
description: Rule for systematic debugging
---

- When debugging, do not guess. Systematically narrow down the root cause by analyzing logic flow and existing state.
- Before suggesting a fix, verify if the proposed change could have unintended side effects in related components.
- Automated test execution is user-owned. Do not run tests during debugging unless the user explicitly requests it; instead identify the smallest relevant command and wait for user feedback/results.
- If an error is caused by invalid data, prefer fixing the source of the invalid data over just adding a generic null check at the destination, unless the data comes from an untrusted source.
