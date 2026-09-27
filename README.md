# Project Name

Developer Names: Ahmed Elzaria, Rayan Nasrallah, Moustafa Moustafa, Muhammad Huzaifah, Shamil Canbolat

Date of project start: Friday September 18, 2026

This project is squigglr

The folders and files for this project are as follows:

docs - Documentation for the project
refs - Reference material used for the project, including papers
src - Source code
test - Test cases
etc.

The documentation for this project is updated on the project's [GitHub page](https://ahmedelzaria.github.io/squigglr/).

## Git Conventions

### Branch naming

```
<type>/<issue-number>-<short-kebab-case-description>
```

Append your first name when several people work separate parts of the same
issue. Branch off `main`, one branch per issue, and open a pull request into
`main` when the work is ready.

Examples from this repo:

```
docs/14-workflow-process
docs/23-problem-statement
docs/16-dev-plan-reflection-ahmed
docs/30-psg-reflection-shamil
```

### Commit messages

```
<type>: <short action describing the change> (#<issue-number>)

<optional explanation of why the change was needed>
```

Write the subject in the imperative ("add", not "added"), keep it under about
70 characters, and leave a blank line before the body. The body is optional:
include it when the reason for the change is not obvious from the subject.

Example:

```
docs: add Problem Statement section (#23)

Port the drafted problem, inputs and outputs, stakeholders, and environment
content into the capstone template, add the supporting references, and drop
the template guidance comments from the completed section.
```

### Types

| Type | Use for |
| --- | --- |
| `docs` | Documentation and deliverables under `docs/` |
| `feat` | New functionality in `src/` |
| `fix` | Bug fixes |
| `refactor` | Restructuring with no change in behaviour |
| `test` | Test cases under `test/` |
| `ci` | Workflows under `.github/` |
| `chore` | Tooling, dependencies, and repo housekeeping |

### Generated PDFs

Do not commit PDFs. The `latex-pages.yml` workflow compiles every changed
document, commits the results to `pdfs/`, and publishes them to the GitHub
page. Run `git pull` after a merge to pick up that commit.
