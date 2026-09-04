Shared domain schemas (Zod) and their inferred types: `Task`, `TaskSeries`,
`Subtask`, `Label`. Single source of truth — defined in issue #19, imported
everywhere else. `lib/db` also uses these schemas to validate data at the
storage boundary.
