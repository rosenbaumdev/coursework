# coursework

Public, read-only mirror of prompt files from the [coursework tracker](https://coursework.rosenbaum.us).

## What this is for

This repo exists so that AI tools with domain allowlists (e.g. claude.ai's web fetcher) can pull instructor prompts via their CDN. The authoring CMS lives at `coursework.rosenbaum.us/dad/files` — files in the `claude-prompt` category there are auto-mirrored here.

## Don't edit here

Edits to this repo will be overwritten on the next sync from the authoring CMS. Make changes in the CMS, not in git.

## Structure

```
day-<id>/
  <prompt file>.md
```

Where `<id>` is the day number (e.g. `day-0`, `day-1`, `day-0.1`).

## Public URLs

Prompts are fetchable at `https://raw.githubusercontent.com/rosenbaumdev/coursework/main/day-<id>/<filename>`.
