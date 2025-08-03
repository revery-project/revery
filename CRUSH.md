# CRUSH.md - Development Guide

## Build/Test/Lint Commands

```bash
# Development (Tauri app with hot reload)
just dev
just dev 2  # Run second instance

# Build
just build
cargo build --workspace
npm run build --workspace packages/app

# Test
cargo test                    # All tests
cargo test auth              # Tests matching "auth"
cargo test --package revery  # Single crate tests
npm run test --workspace packages/app        # Frontend tests
npm run test:run --workspace packages/app    # Frontend tests (run once)
npm run test:ui --workspace packages/app     # Frontend tests (with UI)

# Lint/Format
cargo fmt --all
cargo clippy --workspace --all-targets
npm run build --workspace packages/app  # TypeScript check
```

## Code Style Guidelines

### Rust
- Use `cargo fmt` for formatting (edition 2024)
- Follow standard Rust naming: `snake_case` for functions/variables, `PascalCase` for types
- Prefer `Result<T, E>` over panics, use custom error types
- Module structure: `mod.rs` exports public API, implementation in separate files
- Use `//!` for module docs, `///` for item docs

### TypeScript/React
- Use TypeScript strict mode, explicit types for props/hooks
- Functional components with hooks, destructured props
- Import order: external libs, internal components, hooks, types
- Use `interface` for props, `type` for unions/aliases
- TailwindCSS for styling, HeroUI components