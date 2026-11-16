import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { fixSrtTool, lintSrtTool, srtStatsTool } from "../tools.js";

const fixture = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../../fixtures/sample-issues.srt"),
  "utf8"
);

test("lint_srt reports numbering, overlap, CPS, and line-length issues on the sample", () => {
  const result = lintSrtTool(fixture);
  const codes = result.issues.map((i) => i.code);
  for (const needed of [
    "badNumber",
    "longLine",
    "missingNumber",
    "overlap",
    "endBeforeStart",
    "tsFormat",
    "cps",
    "empty",
  ]) {
    assert.ok(codes.includes(needed), `missing ${needed}, got ${codes.join(",")}`);
  }
  assert.ok(result.stats.errors > 0);
});

test("fix_srt renumbers, normalizes timestamps, and wraps long English lines", () => {
  const fixed = fixSrtTool(fixture);
  assert.ok(fixed.applied.some((a) => a.fix === "renumber" && a.edits > 0));
  assert.ok(fixed.applied.some((a) => a.fix === "normalize_timestamps" && a.edits > 0));
  assert.ok(fixed.applied.some((a) => a.fix === "wrap_lines" && a.edits > 0));
  const after = lintSrtTool(fixed.srt);
  const codes = after.issues.map((i) => i.code);
  assert.equal(codes.filter((c) => c === "missingNumber" || c === "badNumber").length, 0);
  assert.equal(codes.filter((c) => c === "tsFormat").length, 0);
  assert.equal(codes.filter((c) => c === "longLine").length, 0);
  // Unsafe issues remain.
  assert.ok(codes.includes("overlap"));
  assert.ok(codes.includes("endBeforeStart"));
  assert.ok(fixed.remainingIssues < lintSrtTool(fixture).issues.length);
});

test("fix_srt can apply a single fix kind", () => {
  const only = fixSrtTool(fixture, ["renumber"]);
  assert.deepEqual(
    only.applied.map((a) => a.fix),
    ["renumber"]
  );
  const after = lintSrtTool(only.srt);
  assert.equal(
    after.issues.filter((i) => i.code === "missingNumber" || i.code === "badNumber").length,
    0
  );
  assert.ok(after.issues.some((i) => i.code === "tsFormat"));
});

test("srt_stats reports durations and CPS for valid cues", () => {
  const text = `1
00:00:01,000 --> 00:00:03,000
Hello

2
00:00:03,000 --> 00:00:05,000
World
`;
  const stats = srtStatsTool(text);
  assert.equal(stats.stats.cues, 2);
  assert.equal(stats.totalDurationMs, 4000);
  assert.equal(stats.spanMs, 4000);
  assert.equal(stats.cues[0].durationMs, 2000);
  assert.equal(stats.cues[0].chars, 5);
  assert.equal(stats.cues[0].cps, 2.5);
  assert.equal(stats.avgCps, 2.5);
});

test("srt_stats flags a high-CPS cue without inventing a duration for a negative one", () => {
  const stats = srtStatsTool(fixture);
  const fast = stats.cues.find((c) => c.cps != null && c.cps > 21);
  assert.ok(fast);
  const negative = stats.cues.find((c) => c.cue === 3);
  assert.ok(negative);
  assert.equal(negative!.durationMs, null);
});
