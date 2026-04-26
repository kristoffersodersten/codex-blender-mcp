# Contributing

Thanks for improving Codex Blender MCP.

## Development Setup

```bash
pnpm install
pnpm build
pnpm lint
pnpm test
```

## Standards

- Keep TypeScript strict.
- Validate public tool inputs with Zod.
- Keep Blender execution local by default.
- Add tests for new contracts, validation rules, and failure paths.
- Document new public tools in `README.md` and `docs/blender-mcp.md`.

## Pull Request Checklist

- [ ] `pnpm build` passes.
- [ ] `pnpm lint` passes.
- [ ] `pnpm test` passes.
- [ ] New tool contracts are documented.
- [ ] Security implications are described for new execution paths.

## Release Notes

Update `CHANGELOG.md` for user-visible changes.
