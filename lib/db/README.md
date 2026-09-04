Dexie (IndexedDB) schema (`db.ts`) and the repository functions built on
top of it: `tasks.ts`, `taskSeries.ts`, `labels.ts`. This is the only
place that talks to storage — components and pages never import Dexie
directly, they call these functions.

Every read validates rows with the matching Zod schema from `lib/types`
and skips (with a `console.warn`) any row that fails, so one corrupted
row can't take down a whole list. Every write validates before it hits
Dexie. Deleting a label cascades: it's stripped from every task's and
series' `labelIds` before the label row itself is removed.
