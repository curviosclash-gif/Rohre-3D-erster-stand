---
trigger: file_access_*
description: Rule for efficient file access and context management
---

- ALWAYS try to use `view_file_outline` or `grep_search` first to identify the exact location of the code you need.
- When calling `view_file`, ALWAYS use the `StartLine` and `EndLine` parameters to read only the specific chunk of code you need.
- Avoid reading entire files into your context unless absolutely necessary.
- For finding things, use `find_by_name` rather than recursively listing directories.
