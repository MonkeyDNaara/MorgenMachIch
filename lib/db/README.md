Dexie (IndexedDB) schema and the repository functions built on it
(`getTasks()`, `createTask()`, ...). This is the only place that talks to
storage — components and pages never import Dexie directly. Schema
defined in issue #20; repository functions follow in issue #21.
