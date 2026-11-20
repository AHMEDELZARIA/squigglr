# Known limits of the proof of concept

Things the app does not do yet, or does loosely, that the team has seen and chosen to leave for now. None of them is a bug in what the POC sets out to show. Each has what it would take to close it.

Found in the audit of November 15, 2026. For how the app compares with the SRS, see section 13 of [`POC-Implementation-Plan.md`](POC-Implementation-Plan.md).

## Left out of the POC by decision: the creative space

Decided by the team on November 16, 2026. The Development Plan's POC has four experiments; two are not being done for the POC:

- **Experiment 2, reversible geometric refinement:** tidy a child's free drawing with geometry, keep the result editable, and undo it exactly.
- **Experiment 3, model-based creative enhancement:** have a pretrained model return drawing instructions that the app applies to the child's strokes.

Why: the guided lesson does not depend on either, the lesson took the time there was, and neither experiment can be run properly in the days left. The full reasoning is in section 2 of [`POC-Implementation-Plan.md`](POC-Implementation-Plan.md).

What it leaves to do:

| To do | Why |
| --- | --- |
| Investigate editable refinement first after the POC | The Development Plan calls it "the main technical uncertainty", and goal G.4 has no evidence behind it yet. |
| Update the Development Plan's POC section | It still lists four experiments. |
| Move FR-CRT-001 to FR-CRT-007 out of PH-1 in the SRS phase table | The SRS schedules basic creative drawing for the POC. |
| Tell the supervisor and the TA | The Development Plan says a change to what the POC covers is agreed with the supervisor. |

## Changed on the evidence of the peer session, against the SRS

Decided on November 16, 2026, after running the paper prototype with a member of another group. Each needs the SRS changed to match, or the app changed back. Section 13 of the plan has the detail.

| In the app | SRS |
| --- | --- |
| After the pause, a drawing with a part missing is kept and the child can finish it, up to two hints an attempt. | FR-LRN-024 ends the attempt at the first pause. |
| A practice sticker ends the lesson. | No reward is specified. |
| A moving arrow and a picture of the shape at the dots. | FR-LRN-005 and FR-LRN-027 show only the endpoints. |

Liked in the session but not changed, because the SRS or the POC plan says otherwise: the child's first name on the avatar (BR-001), and the weekly page with stickers for the days practised (the progress summary is outside the POC).

## To close before a child uses the app

| Limit | What happens | Requirement | What it would take |
| --- | --- | --- | --- |
| The browser's back button leaves a lesson | A child can swipe or tap back out of a lesson with no adult check. The lesson is saved as unfinished. | SAF-RAY-001, CON-007 | Catch the back navigation on the lesson screen and ask for the adult check first. |
| Direct links skip the adult check | Typing `/grown-ups`, `/records` or `/lessons/square` into the address bar opens the screen with no check. | SAF-RAY-001, SAF-RAY-008 | Remember, for the session, that the adult check was passed, and send anyone without it back to "Who's practising?". Becomes moot once there are accounts. |
| The demo panel shows a result | The live result and counters are on the lesson screen. | BR-006, FR-LRN-022 | Hide it by default, or remove it. |

## To close before Revision 0

| Limit | What happens | Requirement | What it would take |
| --- | --- | --- | --- |
| Nothing can be deleted | A child, or a child's records, cannot be removed except by clearing the browser's site data. | Open issue OI-02 (who may delete records) | Decide OI-02, then add delete to the Storage module and the grown-ups area. |
| Everything is saved in one browser | A child's settings and records exist only on the device and browser they were made in. | Module Guide (hosted database) | Replace the inside of `lib/storage.ts` with the database. |
| A record that cannot be saved is lost | If the browser's storage is full, the lesson carries on and the demo panel counts the records not saved, but they are not kept for later. | SAF-RAY-003 | Build the Connection Recovery module (M24). |
| Switching apps ends the lesson | If the tablet goes to another app for longer than the lesson's idle end, the lesson ends for inactivity on return. | SAF-RAY-009 | Decide whether time in the background counts. If not, pause the idle clocks while the page is hidden. |
| The helper's voice is the browser's own | The lines are spoken by whatever voice the device has, which differs between devices and can sound flat. The chime and the tune are made by the browser too. | NFR-UX-010, NFR-UX-002 | Record or generate one clip per line. Try it on the target tablet: sound has only been checked in an automated run, by counting what the page asked to play. |
| No notice for an unsupported device | Any device and browser can start a lesson. | SAF-RAY-002 | Decide `SUPPORTED_DEVICES`, then check it on the Lesson ready screen. |

## Not tested yet

| What | Why it matters |
| --- | --- |
| A stylus, in depth | The team drew with a stylus on an iPad on November 16, 2026 and it worked. That was a first try, not a test: experiment 1 of the POC plan asks for the hardware and browser versions to be recorded, a second device and browser, and notes on delays, broken strokes and a resting palm. Every automated run used a mouse. |
| Browsers other than Chromium and Safari on iPad | The automated runs use Chromium only. |
| Hand-drawn attempts at the pass mark | The scoring tests use prepared shapes. The calibration of `TRACE_TOL`, `PART_COVER` and `MIN_DRAW_SCALE` with adult-made drawings (OI-05) has not been done. |
