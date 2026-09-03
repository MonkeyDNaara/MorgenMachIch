Dexie.js schema and the repository layer (`getTasks`, `createTask`,
`updateTask`, ...). This is the ONLY place in the app that talks to
storage directly — components and pages call these functions, never
Dexie itself. Set up in issue #20.
