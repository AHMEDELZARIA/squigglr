# Traceability between code files and design modules

Module numbers are those of the Module Guide and the MIS. Modules not listed are not part of the proof of concept.

| Module | Code |
| --- | --- |
| M01 Input Device | `components/DrawingCanvas.tsx` (pointer events to strokes) |
| M02 Display | `components/DrawingCanvas.tsx` (painting), `components/StrokePreview.tsx`, `components/LessonIcon.tsx`, `components/icons.tsx` |
| M03 Audio Output | `lib/audio.ts` |
| M04 Guided Lesson Control | `lib/lessonControl.ts`, `lib/stages.ts` (the stages, in order) |
| M05 Lesson Catalogue | `lib/catalogue.ts` |
| M06 Attempt | `lib/attempt.ts` |
| M07 Attempt Evaluation | `lib/evaluation.ts` |
| M08 Feedback | `lib/feedback.ts` |
| M09 Improvement Measure | `lib/improvement.ts` |
| M13 Child Screen | `app/lesson/[id]/page.tsx` |
| M16 Learner Settings | `lib/settings.ts` (kept only while the app is open), `lib/examples.ts` (example drawings for the pass mark) |
| M18 Adult View | `app/page.tsx`, `app/lessons/[id]/page.tsx`, `components/Screen.tsx`, `components/NeatnessInfo.tsx`, `components/Squiggle.tsx` |
| M19 Stroke | the `Stroke` type in `lib/types.ts` |
| M20 Geometry | `lib/geometry.ts` |

Not in the proof of concept: M10 Attempt Record, M14 Adult Access, M15 Learner Profile, M23 Storage (nothing is saved; the full version with these is on the `POC-extra` branch), M11 Creative Drawing, M12 Refinement Control, M17 Progress Summary, M21 Edit History, M22 Refinement Engine, M24 Connection Recovery, M25 Audit Log.

The types shared between modules are in `lib/types.ts`. The unit tests are `lib/evaluation.test.ts`, `lib/rules.test.ts` and `lib/examples.test.ts`, with their helpers in `lib/testHelpers.ts`.
