# Frontier Workflow

Frontier/Work is used manually or through eligible ChatGPT scheduling/agent workflows. This repository does not require an LLM API.

## Daily Short run

1. Research candidate stories.
2. Select one story with strong curiosity/tension/reveal/payoff.
3. Build/update story bible.
4. Identify characters, locations and props.
5. Write 60–90s narration.
6. Produce visual beat plan.
7. Produce asset-generation prompts only for missing masters.
8. Produce render manifest.
9. Validate all JSON against schemas.
10. Hand the package to the local runner.

## Long-form run

Do not produce a giant single artifact. Work episode-by-episode and scene-by-scene. Maintain a series bible for continuity.

## Required output bundle

```text
project/
  story.md
  source-notes.md
  characters.json
  locations.json
  props.json
  script.json
  storyboard.json
  render-manifest.json
```
