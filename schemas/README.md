# Manifest schemas

Placeholder for M2. The M1 source of truth for the location-manifest shape is the zod
schema in `src/engine/manifest.ts`, which validates all content at load time. In M2 this
directory gains generated JSON Schema files plus a CI check so bad contributions fail
loudly at PR time.
