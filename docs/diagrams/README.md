# Diagrams

PlantUML (`.puml`) sources for the UML diagrams required by the report, plus
Mermaid sources for the ER-style collection diagram and the algorithm
flowcharts.

The report follows the **Object-Oriented approach** from the TU guideline.

## Diagrams to produce

| File                         | Diagram                                       | Report section |
| ---------------------------- | --------------------------------------------- | -------------- |
| `use-case.puml`              | Use case diagram (User, Admin)                | 3.1            |
| `class.puml`                 | Class diagram                                 | 3.1            |
| `object.puml`                | Object diagram                                | 3.1            |
| `sequence-login.puml`        | Sequence: login                               | 3.1            |
| `sequence-create-cv.puml`    | Sequence: create a CV                         | 3.1            |
| `sequence-download-pdf.puml` | Sequence: download a PDF                      | 3.1            |
| `sequence-job-match.puml`    | Sequence: run a job match                     | 3.1            |
| `state-cv.puml`              | State diagram: CV lifecycle                   | 3.1            |
| `state-user-account.puml`    | State diagram: user account status            | 3.1            |
| `activity-cv-creation.puml`  | Activity: CV creation through to download     | 3.1            |
| `component.puml`             | Component diagram                             | 3.1            |
| `deployment.puml`            | Deployment diagram                            | 3.1            |
| `er-collections.md`          | Mermaid diagram of collections and references | 3.1            |

## Rendering

- **Visual Studio Code:** install the _PlantUML_ extension, open a `.puml`
  file and press `Alt+D` to preview.
- **Command line:** `java -jar plantuml.jar docs/diagrams/*.puml` produces PNG
  files next to the sources.
- **Mermaid:** renders directly in the GitHub preview of a Markdown file.
