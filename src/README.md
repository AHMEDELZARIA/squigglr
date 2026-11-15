# Squigglr source code

The proof of concept: a Next.js app, written in TypeScript, in which a child practises the Square and Circle lessons and an adult sets the values that control them. It runs entirely in the browser and keeps its data in the browser's `localStorage`.

[`POC-Implementation-Plan.md`](POC-Implementation-Plan.md) explains the design, every file and the demo. The screens follow the team's lo-fi prototype; the colours and fonts follow the A-Sense presentation.

## Folders

- `lib/`: the lesson rules, the scoring and the data, as plain TypeScript with unit tests
- `components/`: the drawing canvas, the adult check, the screen frame and the pictures
- `app/`: one folder per screen (who's practising, pick a lesson, lesson ready, the lesson, grown-ups, practice story)
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

To try it on a tablet, put the tablet on the same Wi-Fi as the laptop and open the "Network" address that `npm run dev` prints (for example `http://192.168.1.20:3000`).

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
