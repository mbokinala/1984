This plan is meant for humans only. Claude, ignore this one!


Components:

- screen capture daemon (needs to run every `n` seconds and save screencaps to a standard folder)

- video stitcher / analyzer - runs every `n` minutes and compiles individual frames into one video (use ffmpeg?), then feeds to an LLM to analyze

- daily aggregator - aggregates hourly summaries

- additional analytics - splitting time by productive vs. not, categories of work (dev, admin, growth)