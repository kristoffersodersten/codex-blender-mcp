# Security Policy

## Supported Versions

The current supported version is the latest commit on `main`.

## Local Execution Model

Codex Blender MCP is local-first:

- It starts Blender on the local machine.
- It does not send prompts, files, metadata, or generated assets to remote services.
- It does not include telemetry.
- It does not include cloud fallback.

## Reporting A Vulnerability

Please report vulnerabilities through GitHub Security Advisories or by opening a minimal issue that does not disclose exploit details publicly.

Include:

- affected version or commit
- operating system
- Blender version
- reproduction steps
- expected and actual behavior

## High-Risk Surface

`run_blender_python` executes arbitrary Blender Python. Treat it as a trusted-code tool only. MCP clients should expose it only when the user explicitly intends to run local Blender Python.

## Path Safety

Generated output filenames are constrained to `BLENDER_OUTPUT_DIR`. Path traversal outside that directory is rejected.
