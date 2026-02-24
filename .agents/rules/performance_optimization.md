---
trigger: modify_game_loop_or_entities
description: Rule for strict performance and allocation management in game loops
---

- When modifying or adding code to a `update` or `render` loop (the "hot path"), strictly minimize garbage collection and object allocation.
- Reuse objects, variables, and vectors (e.g., Object Pooling) instead of creating new instances every frame.
- Prioritize efficient algorithms (like fast AABB/OBB collision checks) over heavy math operations in repeating logic.
