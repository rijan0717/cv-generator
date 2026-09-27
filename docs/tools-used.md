# Tools Used

Supports report section **4.1.1 Tools used**. Keep this table in sync as
dependencies are added in later phases.

## Languages

| Language                        | Where it is used                             |
| ------------------------------- | -------------------------------------------- |
| JavaScript (ES2023, ES modules) | Both the Express server and the React client |
| HTML5                           | Page shell and CV template markup            |
| CSS3 (via Tailwind CSS)         | All styling, including the CV templates      |

## Frameworks and runtimes

| Tool          | Version   | Purpose                                                |
| ------------- | --------- | ------------------------------------------------------ |
| WSL2 / Ubuntu | 26.04 LTS | Linux environment hosting the whole toolchain          |
| Node.js       | 22.22.1   | JavaScript runtime for the server                      |
| npm           | 11.20.0   | Package manager                                        |
| Express       | 4.x       | HTTP server, routing and middleware                    |
| React         | 18.x      | Component-based user interface                         |
| Vite          | 6.x       | Development server with hot reload, production bundler |
| MongoDB       | 8.0.32    | Document database                                      |
| Mongoose      | 8.x       | Schema definition, validation and queries              |

## Libraries

### Server

| Library            | Purpose                                                   |
| ------------------ | --------------------------------------------------------- |
| bcryptjs           | Hashing passwords before storage                          |
| jsonwebtoken       | Signing and verifying login and print tokens              |
| cookie-parser      | Reading the httpOnly authentication cookie                |
| helmet             | Sets secure HTTP response headers                         |
| cors               | Allows the client origin to call the API with credentials |
| express-rate-limit | Limits repeated login and register attempts               |
| express-validator  | Server-side validation of request bodies                  |
| multer             | Handling multipart photo and avatar uploads               |
| dotenv             | Loading configuration from `.env`                         |
| morgan             | HTTP request logging during development                   |
| puppeteer          | Rendering the print page to a PDF                         |
| exceljs            | Writing the multi-sheet Excel export                      |

### Client

| Library          | Purpose                                             |
| ---------------- | --------------------------------------------------- |
| react-router-dom | Client-side routing and protected routes            |
| axios            | HTTP requests to the API, with a shared instance    |
| tailwindcss      | Utility-first styling                               |
| recharts         | Charts on the admin business-intelligence dashboard |

## Testing tools

| Tool                  | Purpose                                             |
| --------------------- | --------------------------------------------------- |
| Vitest                | Test runner for both the server and the client      |
| Supertest             | Sends HTTP requests to the Express app inside tests |
| mongodb-memory-server | Temporary in-memory MongoDB for integration tests   |
| React Testing Library | Rendering and asserting on React components         |

## Development and CASE tools

| Tool               | Purpose                                                                          |
| ------------------ | -------------------------------------------------------------------------------- |
| Visual Studio Code | Code editor                                                                      |
| Git                | Version control                                                                  |
| ESLint             | Static analysis and code-style enforcement                                       |
| Prettier           | Automatic code formatting                                                        |
| nodemon            | Restarts the server on file changes                                              |
| concurrently       | Runs the client and server with one command                                      |
| PlantUML           | UML diagrams (use case, class, sequence, state, activity, component, deployment) |
| Mermaid            | ER-style collection diagram and algorithm flowcharts                             |
| MongoDB Compass    | Inspecting the database during development                                       |
| Postman            | Manual API testing                                                               |

## Own modules (not libraries)

These are written from scratch and are the algorithmic core of the project:

| Module                                      | Purpose                                                         |
| ------------------------------------------- | --------------------------------------------------------------- |
| `server/src/algorithms/textProcessor.js`    | Normalising, tokenising, stop-word removal, stemming, bigrams   |
| `server/src/algorithms/tfidf.js`            | Term frequency and smoothed inverse document frequency          |
| `server/src/algorithms/cosineSimilarity.js` | Cosine similarity between two term vectors                      |
| `server/src/algorithms/cvStrengthScorer.js` | Weighted rule-based CV strength score out of 100                |
| `server/src/algorithms/jobMatcher.js`       | CV-to-job-description match score, keyword gaps, skill coverage |
