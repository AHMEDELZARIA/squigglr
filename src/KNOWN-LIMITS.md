# Known limits of the proof of concept

Things the app does not do yet, or does loosely, that the team has seen and chosen to leave for now. None of them is a bug in what the POC sets out to show. Each has what it would take to close it.

Found in the audit of November 15, 2026. For how the app compares with the SRS, see Reference C of [`POC-Implementation-Plan.md`](POC-Implementation-Plan.md).

## Left out of the POC by decision: the creative space

Decided by the team on November 16, 2026. The Development Plan's POC has four experiments; two are not being done for the POC:

- **Experiment 2, reversible geometric refinement:** tidy a child's free drawing with geometry, keep the result editable, and undo it exactly.
- **Experiment 3, model-based creative enhancement:** have a pretrained model return drawing instructions that the app applies to the child's strokes.

Why: the guided lesson does not depend on either, the lesson took the time there was, and neither experiment can be run properly in the days left. The full reasoning is in Reference A of [`POC-Implementation-Plan.md`](POC-Implementation-Plan.md).

What it leaves to do:

| To do | Why |
| --- | --- |
| Investigate editable refinement first after the POC | The Development Plan calls it "the main technical uncertainty", and goal G.4 has no evidence behind it yet. |
| Update the Development Plan's POC section | It still lists four experiments. |
| Move FR-CRT-001 to FR-CRT-007 out of PH-1 in the SRS phase table | The SRS schedules basic creative drawing for the POC. |
| Tell the supervisor and the TA | The Development Plan says a change to what the POC covers is agreed with the supervisor. |

## Changed on the evidence of the peer session, against the SRS

Decided on November 16, 2026, after running the paper prototype with a member of another group. Each needs the SRS changed to match, or the app changed back. Reference C of the plan has the detail.

| In the app | SRS |
| --- | --- |
| After the pause, a drawing with a part missing is kept and the child can finish it, up to two hints an attempt. | FR-LRN-024 ends the attempt at the first pause. |
| A practice sticker ends the lesson. | No reward is specified. |
| A moving arrow and a picture of the shape at the dots. | FR-LRN-005 and FR-LRN-027 show only the endpoints. |

Liked in the session but not changed, because the SRS or the POC plan says otherwise: the child's first name on the avatar (BR-001; the POC now has no avatars at all), and the weekly page with stickers for the days practised (the progress summary is outside the POC).

## Left out of the POC on purpose

The POC shows that the lessons can be judged and run. Everything else waits until after it. The full version, with these parts built, is kept on the `POC-extra` branch.

| Left out | Requirement | Where it comes back |
| --- | --- | --- |
| Child profiles and avatars | BR-001, M15 | PH-1, with adult accounts |
| The adult check (the sum) | SAF-RAY-001, SAF-RAY-008, M14 | PH-1. Until then anyone holding the tablet can leave a lesson, answer the go-back card or change the settings. |
| Saved attempt and lesson records, and the practice history screen | FR-REC-001 to FR-REC-010, M10, M23 | PH-1, with the hosted database |
| Saved settings | BR-008, SAF-RAY-008 | PH-1. In the POC the adult's values last until the page is reloaded. |

## To close before a child uses the app

| Limit | What happens | Requirement | What it would take |
| --- | --- | --- | --- |
| The demo panel shows a result | The live result and counters are on the lesson screen. | BR-006, FR-LRN-022 | Hide it by default, or remove it. |

## To close before Revision 0

| Limit | What happens | Requirement | What it would take |
| --- | --- | --- | --- |
| Switching apps ends the lesson | If the tablet goes to another app for longer than the lesson's idle end, the lesson ends for inactivity on return. | SAF-RAY-009 | Decide whether time in the background counts. If not, pause the idle clocks while the page is hidden. |
| The helper's voice is the browser's own | The lines are spoken by whatever voice the device has, which differs between devices and can sound flat. The chime and the tune are made by the browser too. | NFR-UX-010, NFR-UX-002 | Record or generate one clip per line. Try it on the target tablet: sound has only been checked in an automated run, by counting what the page asked to play. |
| No notice for an unsupported device | Any device and browser can start a lesson. | SAF-RAY-002 | Decide `SUPPORTED_DEVICES`, then check it on the Lesson ready screen. |
| Large extra drawing can move where the shape is laid | With no guide, the shape is laid over everything drawn. Small accidental marks change nothing: a square with a dot still scores 100, and with a short line 97. But when the extra drawing is about as big as the shape (a second shape, for example), the best placement can land between the drawings, and the glow then shows on empty paper. The attempt still fails, with "Some lines went away from the shape", which is the right outcome. Found on Nov. 25, 2026. | FR-LRN-013, SRS Section 9.2 | Collect adult-made drawings with extra marks during the `TRACE_TOL` calibration, then decide whether to lay the shape over the biggest separate drawing only. |

## Not tested yet

| What | Why it matters |
| --- | --- |
| A stylus, in depth | The team drew with a stylus on an iPad on November 16, 2026 and it worked. That was a first try, not a test: experiment 1 of the POC plan asks for the hardware and browser versions to be recorded, a second device and browser, and notes on delays, broken strokes and a resting palm. Every automated run used a mouse. |
| Browsers other than Chromium and Safari on iPad | The automated runs use Chromium only. |
| Hand-drawn attempts at the pass mark | The scoring tests use prepared shapes. The calibration of `TRACE_TOL`, `PART_COVER` and `MIN_DRAW_SCALE` with adult-made drawings (OI-05) has not been done. |
