# Traceability between code files and design modules

Module numbers are those of the Module Guide and the MIS. Modules not listed are not part of the proof of concept.

| Module | Code |
| --- | --- |
| M01 Input Device | `components/DrawingCanvas.tsx` (pointer events to strokes) |
| M02 Display | `components/DrawingCanvas.tsx` (painting), `components/StrokePreview.tsx`, `components/LessonIcon.tsx` |
| M04 Guided Lesson Control | `lib/lessonControl.ts` |
| M05 Lesson Catalogue | `lib/catalogue.ts` |
| M06 Attempt | `lib/attempt.ts` |
| M07 Attempt Evaluation | `lib/evaluation.ts` |
| M08 Feedback | `lib/feedback.ts` |
| M09 Improvement Measure | `lib/improvement.ts` |
| M10 Attempt Record | `lib/records.ts` |
| M13 Child Screen | `app/lesson/[id]/page.tsx` |
| M14 Adult Access | `components/AdultCheck.tsx` (the adult check only; there are no accounts yet) |
| M15 Learner Profile | `lib/profiles.ts` |
| M16 Learner Settings | `lib/settings.ts` |
| M18 Adult View | `app/page.tsx`, `app/lessons/page.tsx`, `app/settings/page.tsx`, `app/records/page.tsx`, `components/Header.tsx`, `components/useActiveLearner.ts`, `components/Squiggle.tsx` |
| M19 Stroke | the `Stroke` type in `lib/types.ts` |
| M20 Geometry | `lib/geometry.ts` |
| M23 Storage | `lib/storage.ts` |

Not in the proof of concept: M03 Audio Output, M11 Creative Drawing, M12 Refinement Control, M17 Progress Summary, M21 Edit History, M22 Refinement Engine, M24 Connection Recovery, M25 Audit Log.

The types shared between modules are in `lib/types.ts`. The unit tests are `lib/evaluation.test.ts` and `lib/rules.test.ts`, with their helpers in `lib/testHelpers.ts`.
