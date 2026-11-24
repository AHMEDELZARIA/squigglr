# Squigglr source code

The proof of concept: a Next.js app, written in TypeScript, in which a child practises the Square and Circle lessons and an adult sets the values that control them. It runs entirely in the browser and saves nothing: there are no profiles, no saved records and no adult check, because the POC only has to show that the risky part, judging a child's drawing and running the lesson rules, works. Those parts come after the POC.

[`POC-Implementation-Plan.md`](POC-Implementation-Plan.md) walks through the code from top to bottom, then gives the design decisions, the comparison with the SRS and the demo script. [`KNOWN-LIMITS.md`](KNOWN-LIMITS.md) lists what is left to do. The screen layouts follow the team's lo-fi prototype and the colours follow the A-Sense presentation. What the app does follows the SRS; the plan gives the requirement behind each decision.

## Folders

- `lib/`: the lesson rules, the scoring and the data, as plain TypeScript with unit tests
- `components/`: the drawing canvas, the screen frame and the pictures
- `app/`: one folder per screen (pick a lesson, lesson ready, the lesson)
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

To use it on the iPad for the demonstration, put the tablet on the same Wi-Fi as the laptop and open the "Network" address that `npm run dev` prints (for example `http://192.168.1.20:3000`).

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
