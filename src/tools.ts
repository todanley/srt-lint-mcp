import {
  type AnalyzeOptions,
  applyEdits,
  countChars,
  fixNumberingEdits,
  formatTime,
  lintSrt,
  normalizeTimestampEdits,
  parseSRT,
  visibleText,
  wrapLongLineEdits,
} from "./engine.js";

export type Caps = AnalyzeOptions;

export type SafeFix = "renumber" | "normalize_timestamps" | "wrap_lines";

export const ALL_SAFE_FIXES: SafeFix[] = ["renumber", "normalize_timestamps", "wrap_lines"];

export function lintSrtTool(srt: string, caps: Caps = {}) {
  const { issues, stats, parsed } = lintSrt(srt, caps);
  return {
    stats,
    cues: parsed.cues.length,
    issues: issues.map((issue) => ({
      severity: issue.severity,
      code: issue.code,
      cue: issue.cue,
      message: issue.message,
      range: issue.range,
      params: issue.params ?? null,
    })),
  };
}

export function fixSrtTool(srt: string, fixes: SafeFix[] = ALL_SAFE_FIXES, caps: Caps = {}) {
  const wanted = new Set(fixes);
  let text = srt;
  const applied: { fix: SafeFix; edits: number }[] = [];

  // Apply in a stable order, re-parsing after each kind so offsets stay valid.
  const steps: SafeFix[] = ["normalize_timestamps", "wrap_lines", "renumber"];
  for (const fix of steps) {
    if (!wanted.has(fix)) continue;
    const parsed = parseSRT(text);
    const edits =
      fix === "renumber"
        ? fixNumberingEdits(parsed)
        : fix === "normalize_timestamps"
          ? normalizeTimestampEdits(parsed)
          : wrapLongLineEdits(parsed, caps);
    if (edits.length) text = applyEdits(text, edits);
    applied.push({ fix, edits: edits.length });
  }

  const after = lintSrt(text, caps);
  return {
    srt: text,
    applied,
    remainingIssues: after.issues.length,
    stats: after.stats,
  };
}

export function srtStatsTool(srt: string, caps: Caps = {}) {
  const { parsed, issues, stats } = lintSrt(srt, caps);
  const cues = parsed.cues.map((cue, i) => {
    const durationMs =
      cue.start != null && cue.end != null && cue.end >= cue.start ? cue.end - cue.start : null;
    const chars = countChars(visibleText(cue.text || ""));
    const cps = durationMs && durationMs > 0 && chars > 0 ? chars / (durationMs / 1000) : null;
    return {
      cue: i + 1,
      sourceIndex: cue.sourceIndex,
      startMs: cue.start,
      endMs: cue.end,
      durationMs,
      start: cue.start != null ? formatTime(cue.start) : null,
      end: cue.end != null ? formatTime(cue.end) : null,
      chars,
      cps: cps != null ? Math.round(cps * 10) / 10 : null,
    };
  });

  const timed = cues.filter((c) => c.durationMs != null && c.durationMs > 0);
  const totalDurationMs = timed.reduce((sum, c) => sum + (c.durationMs as number), 0);
  const cpsValues = cues.map((c) => c.cps).filter((n): n is number => n != null);
  const avgCps =
    cpsValues.length > 0
      ? Math.round((cpsValues.reduce((a, b) => a + b, 0) / cpsValues.length) * 10) / 10
      : null;
  const maxCps = cpsValues.length > 0 ? Math.max(...cpsValues) : null;

  return {
    stats,
    totalDurationMs,
    spanMs: stats.spanMs ?? null,
    avgCps,
    maxCps,
    issueCodes: issues.map((i) => i.code),
    cues,
  };
}

export function capsFromArgs(args: {
  maxCharsEn?: number;
  maxCharsCjk?: number;
  maxCpsEn?: number;
  maxCpsCjk?: number;
}): Caps {
  const caps: Caps = {};
  if (args.maxCharsEn != null) caps.maxEn = args.maxCharsEn;
  if (args.maxCharsCjk != null) caps.maxCjk = args.maxCharsCjk;
  if (args.maxCpsEn != null) caps.cpsEn = args.maxCpsEn;
  if (args.maxCpsCjk != null) caps.cpsCjk = args.maxCpsCjk;
  return caps;
}
