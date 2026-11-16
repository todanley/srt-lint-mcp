#!/usr/bin/env node
/**
 * SRT Lint MCP server — stdio transport.
 * Tools: lint_srt, fix_srt, srt_stats.
 * This is a free side project by Stanley J (MIT).
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { ALL_SAFE_FIXES, capsFromArgs, fixSrtTool, lintSrtTool, srtStatsTool, type SafeFix } from "./tools.js";

const capsShape = {
  maxCharsEn: z.number().positive().optional().describe("Max characters per Latin line (default 42)"),
  maxCharsCjk: z.number().positive().optional().describe("Max characters per CJK line (default 16)"),
  maxCpsEn: z.number().positive().optional().describe("Max characters per second for Latin cues (default 21)"),
  maxCpsCjk: z.number().positive().optional().describe("Max characters per second for CJK cues (default 9)"),
};

function jsonResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function errorResult(message: string) {
  return { isError: true, content: [{ type: "text" as const, text: message }] };
}

const server = new McpServer({
  name: "srt-lint-mcp",
  version: "0.0.1",
});

server.registerTool(
  "lint_srt",
  {
    title: "Lint an SRT file",
    description:
      "Parse a SubRip (.srt) document and return diagnostics for cue numbering, invalid or odd timestamps, end-before-start (negative duration), zero duration, overlaps, reading speed (CPS), line length, empty cues, too many lines, and WebVTT mislabelled as SRT. Character counts use Intl.Segmenter graphemes and ignore simple subtitle markup.",
    inputSchema: {
      srt: z.string().describe("Full SRT file contents"),
      ...capsShape,
    },
  },
  async (args) => {
    try {
      return jsonResult(lintSrtTool(args.srt, capsFromArgs(args)));
    } catch (err) {
      return errorResult(`lint_srt failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
);

server.registerTool(
  "fix_srt",
  {
    title: "Apply safe SRT fixes",
    description:
      "Apply only safe, mechanical fixes to an SRT document: renumber cues to 1…n (inserting a missing index), normalize timestamps to HH:MM:SS,mmm, and wrap long lines at spaces (English) or at a character (CJK). Does not change overlaps, negative/zero duration, or high CPS — those need a human look. Returns the updated SRT text and remaining issue counts.",
    inputSchema: {
      srt: z.string().describe("Full SRT file contents"),
      fixes: z
        .array(z.enum(["renumber", "normalize_timestamps", "wrap_lines"]))
        .optional()
        .describe("Which safe fixes to apply. Defaults to all three."),
      ...capsShape,
    },
  },
  async (args) => {
    try {
      const fixes = (args.fixes?.length ? args.fixes : ALL_SAFE_FIXES) as SafeFix[];
      return jsonResult(fixSrtTool(args.srt, fixes, capsFromArgs(args)));
    } catch (err) {
      return errorResult(`fix_srt failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
);

server.registerTool(
  "srt_stats",
  {
    title: "SRT timing and CPS stats",
    description:
      "Summarise an SRT document: cue count, total on-screen duration, span from first start to last end, average and max characters-per-second, and a per-cue breakdown of start/end, duration, character count, and CPS. Uses the same grapheme rules as lint_srt.",
    inputSchema: {
      srt: z.string().describe("Full SRT file contents"),
      ...capsShape,
    },
  },
  async (args) => {
    try {
      return jsonResult(srtStatsTool(args.srt, capsFromArgs(args)));
    } catch (err) {
      return errorResult(`srt_stats failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
