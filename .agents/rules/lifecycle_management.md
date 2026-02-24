---
trigger: creating_or_deleting_entities
description: Rule for strict lifecycle and state management
---

- Whenever an entity (like a trail segment, projectile, or bot) is created, immediately consider how and when it will be destroyed.
- Ensure proper cleanup to prevent memory leaks, phantom collisions, or orphaned logic blocks when a game round restarts or an object "dies".
- Validate that spatial grids and entity managers correctly remove references to deleted objects.
