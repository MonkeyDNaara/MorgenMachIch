// Vitest stand-in for the `server-only` package (#404): the real one throws outside
// Next's server bundle, so tests of `server/` modules alias it to this empty module.
export {};
