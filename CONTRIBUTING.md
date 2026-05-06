# Contributing

## Scope

This project is intentionally local-first. Changes should preserve these constraints:

- SQLite only unless there is an explicit decision to change storage
- no paid dependencies
- no cloud-only workflow requirements
- no hidden background services required for the MVP

## Local Setup

```bash
npm install
npm run setup
npm run dev
```

## Development Expectations

- prefer existing project structure and naming patterns
- keep validation in `src/lib/validation.ts`
- keep database logic in `src/lib/emails.ts` and related library files
- keep route handlers thin
- do not introduce telemetry or hosted dependencies

## Before Opening a PR

Run:

```bash
npm run lint
npm run build
npm run test
```

If you change the schema:

```bash
npx prisma migrate dev --name <change-name>
```

## Documentation Standard

Public-facing behavior changes should update:

- `README.md` if they affect setup, usage, or core features
- `docs/IMPORTING.md` if mailbox import behavior changes
- `docs/DATASET.md` if export shape or labeling contract changes
