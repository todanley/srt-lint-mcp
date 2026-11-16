# SRT Lint MCP

An [MCP](https://modelcontextprotocol.io/) server that lints and safely fixes SubRip (`.srt`) subtitle files. It reuses the same engine as the [SRT Subtitle Lint](https://github.com/todanley/srt-subtitle-checker) VS Code extension and the free in-browser [SRT Subtitle Checker](https://todanley.github.io/srt-subtitle-checker/).

This is a free side project by Stanley J. MIT licensed. It is not published to npm yet (an npm account is still needed for that).

## Tools

| Tool | What it does |
| --- | --- |
| `lint_srt` | Diagnostics for cue numbering, invalid or odd timestamps, end-before-start, zero duration, overlaps, reading speed (CPS), line length, empty cues, too many lines, and WebVTT labelled as SRT |
| `fix_srt` | Safe fixes only: renumber cues, normalize timestamps to `HH:MM:SS,mmm`, wrap long lines. Does not change overlaps, negative/zero duration, or high CPS |
| `srt_stats` | Cue count, total duration, span, average/max CPS, and a per-cue breakdown |

Character counts use `Intl.Segmenter` graphemes and ignore simple subtitle markup (`{\an8}`, `<i>…</i>`). Defaults: 42 / 16 characters per line (Latin / CJK) and 21 / 9 CPS.

Pass the **file contents** in the `srt` argument (not a path — the server does not read the client’s disk).

## Run

Requires Node.js 18+. From a clone:

```bash
npm install
npm test
npm start
```

`npm start` (or `npx srt-lint-mcp` once the package is installed) speaks MCP on stdio. Do not type into that process yourself; a client such as Claude Desktop or Cursor launches it.

Until the package is on npm, you can point a client at a clone, or run from GitHub:

```bash
npx -y github:todanley/srt-lint-mcp
```

(`npx` will run `prepare` / `tsc` on first install from GitHub.)

## Claude Desktop

Add this to the Claude Desktop config (`claude_desktop_config.json` on macOS: `~/Library/Application Support/Claude/`; on Windows: `%APPDATA%\Claude\`).

From a local clone:

```json
{
  "mcpServers": {
    "srt-lint": {
      "command": "node",
      "args": ["/ABS/PATH/TO/srt-lint-mcp/dist/index.js"]
    }
  }
}
```

Or, after a GitHub install:

```json
{
  "mcpServers": {
    "srt-lint": {
      "command": "npx",
      "args": ["-y", "github:todanley/srt-lint-mcp"]
    }
  }
}
```

Restart Claude Desktop after saving.

## Cursor

In Cursor, add an MCP server in **Settings → MCP**, or put this in `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (user):

```json
{
  "mcpServers": {
    "srt-lint": {
      "command": "node",
      "args": ["/ABS/PATH/TO/srt-lint-mcp/dist/index.js"]
    }
  }
}
```

The `npx -y github:todanley/srt-lint-mcp` form works here too. Reload MCP (or restart Cursor) after saving.

## Docker (stdio)

```bash
docker build -t srt-lint-mcp .
docker run --rm -i srt-lint-mcp
```

`glama.json` names `todanley` as the maintainer. Smithery config is in `smithery.yaml`. The server has **not** been submitted to mcp.so, Glama, or Smithery, and it is not on npm.

## Related

- Live checker (also converts Simplified ↔ Traditional Chinese): https://todanley.github.io/srt-subtitle-checker/
- This server does not bundle Chinese conversion.
