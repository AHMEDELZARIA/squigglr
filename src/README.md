# Squigglr source code

The proof of concept: a Next.js app, written in TypeScript, in which a child practises the Square and Circle lessons and an adult sets the values that control them. It runs entirely in the browser and keeps its data in the browser's `localStorage`.

[`POC-Implementation-Plan.md`](POC-Implementation-Plan.md) explains the design, every file and the demo.

## Folders

- `lib/`: the lesson rules, the scoring and the data, as plain TypeScript with unit tests
- `components/`: the drawing canvas, the adult check and the shared page parts
- `app/`: one folder per page
- `plan-img/`: screenshots used by the plan

## Running it

Needs Node.js 20 or later. From this folder:

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:3000.

## Checks

```bash
npm test
```

```bash
npm run typecheck
```

```bash
npm run build
```
