/**
 * Generates a PDF of a CV with Puppeteer.
 *
 * The PDF must match the on-screen preview exactly, so rather than
 * re-drawing the CV server-side, Puppeteer opens the real React print page
 * and prints it. The same template components produce both, which is the
 * only way to guarantee they agree.
 *
 * The flow, as specified:
 *   1. The server signs a short-lived print token scoped to one CV.
 *   2. Puppeteer opens /print/:cvId?token=…
 *   3. The page fetches the CV with that token and, once the fonts have
 *      loaded, sets a flag the server is waiting for.
 *   4. The server prints to A4 and streams the file back.
 *
 * Because it renders real HTML, the text in the PDF stays selectable.
 */
import puppeteer from 'puppeteer';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * One shared browser instance.
 *
 * Launching Chromium takes a second or two, which would blow the five-second
 * budget on every download. The browser is started on first use and reused
 * afterwards; only a lightweight page is created per request.
 */
let browserPromise = null;

/**
 * True when the print page is served over HTTPS with a certificate Chromium
 * will not trust on its own (the development setup).
 * @returns {boolean}
 */
function usesSelfSignedHttps() {
  return env.clientUrl.startsWith('https://') && env.https.allowSelfSigned;
}

/**
 * Returns the shared browser, starting it if necessary.
 * @returns {Promise<import('puppeteer').Browser>}
 */
async function getBrowser() {
  if (!browserPromise) {
    const args = ['--no-sandbox', '--disable-dev-shm-usage'];

    // When the developer runs the client over HTTPS with a locally generated
    // certificate, Chromium would refuse to open the print page because no
    // authority it trusts signed it. Accepting it is safe here: the only page
    // this browser ever opens is our own print route.
    if (usesSelfSignedHttps()) {
      args.push('--ignore-certificate-errors');
    }

    browserPromise = puppeteer
      .launch({
        headless: true,
        // Required to run as root inside a container, and harmless locally.
        args,
        acceptInsecureCerts: usesSelfSignedHttps(),
      })
      .catch((error) => {
        // Clear the cached promise so the next request can try again rather
        // than being stuck with a permanently rejected one.
        browserPromise = null;
        throw error;
      });
  }

  return browserPromise;
}

/**
 * Turns a Chromium launch failure into a message that says what to do next.
 *
 * There are two quite different causes and they need different advice. If the
 * binary is not there at all, it has to be downloaded. If it is there but
 * will not start, it is almost always because Puppeteer downloads Chromium
 * without the system libraries it links against — the usual symptom on a bare
 * Ubuntu, Debian or WSL install is a missing libnspr4/libnss3/libasound2.
 *
 * @param {Error} error - The error puppeteer.launch() rejected with.
 * @returns {string} A message for the client.
 */
function describeLaunchFailure(error) {
  const message = error?.message ?? '';

  if (/error while loading shared libraries|libnspr4|libnss3|libatk|libgbm/i.test(message)) {
    return (
      'The PDF service is unavailable: Chromium is installed but cannot start because ' +
      'some system libraries are missing. Run "npm run setup:chrome" once on this machine.'
    );
  }

  if (/Could not find (Chrome|browser)|executablePath|ENOENT/i.test(message)) {
    return (
      'The PDF service is unavailable: Chromium is not installed. Run ' +
      '"npx puppeteer browsers install chrome".'
    );
  }

  return 'The PDF service is unavailable: Chromium could not be started.';
}

/**
 * Closes the shared browser. Called during graceful shutdown.
 * @returns {Promise<void>}
 */
export async function closeBrowser() {
  if (!browserPromise) return;

  try {
    const browser = await browserPromise;
    await browser.close();
  } catch {
    // Already gone; nothing to do.
  } finally {
    browserPromise = null;
  }
}

/**
 * Renders a self-contained HTML string as a PDF.
 *
 * Used by the admin reports, which are plain tables: there is nothing for
 * the React application to contribute to one, so they are printed
 * directly rather than through a client route. That also means a report
 * can still be exported when the client is not running.
 *
 * It shares the same browser instance as the CV export, so a report does
 * not pay the cost of launching Chromium again.
 *
 * @param {string} html - A complete document, with its styles inline.
 * @param {{landscape?: boolean}} [options] - Page orientation.
 * @returns {Promise<Buffer>} The PDF.
 */
export async function renderHtmlToPdf(html, { landscape = false } = {}) {
  let browser;
  try {
    browser = await getBrowser();
  } catch (error) {
    console.error('[pdfService] could not start Chromium:', error.message);
    throw new ApiError(503, describeLaunchFailure(error));
  }

  const page = await browser.newPage();

  try {
    // `domcontentloaded` rather than `networkidle0`: the markup carries its
    // own styles and loads nothing, so waiting for network silence would
    // only add a timeout's worth of delay.
    await page.setContent(html, { waitUntil: 'domcontentloaded' });

    const pdf = await page.pdf({
      format: 'A4',
      landscape,
      printBackground: true,
      // The size and margins come from the document's own @page rule.
      preferCSSPageSize: true,
    });

    // page.pdf() resolves to a Uint8Array; Express only treats a real
    // Buffer as binary.
    return Buffer.from(pdf);
  } catch (error) {
    console.error('[pdfService] report render failed:', error.message);
    throw new ApiError(500, 'The report could not be rendered as a PDF. Please try again.');
  } finally {
    await page.close().catch(() => {});
  }
}

/**
 * Signs a short-lived token that authorises printing exactly one CV.
 *
 * It is scoped to a single CV id and lives about two minutes, so even if the
 * URL were captured it would grant nothing beyond that one document, and not
 * for long.
 *
 * @param {string} cvId - The CV to authorise.
 * @param {string} userId - The owner.
 * @returns {string} The signed token.
 */
export function signPrintToken(cvId, userId) {
  return jwt.sign({ sub: userId, cv: cvId, purpose: 'print' }, env.printTokenSecret, {
    expiresIn: env.printTokenExpiresIn,
  });
}

/**
 * Verifies a print token and checks it is for the CV being requested.
 *
 * @param {string} token - The token from the query string.
 * @param {string} cvId - The CV the caller is trying to read.
 * @returns {{sub: string, cv: string}} The decoded payload.
 * @throws {ApiError} When the token is missing, invalid, expired, not a
 *   print token, or issued for a different CV.
 */
export function verifyPrintToken(token, cvId) {
  if (!token) throw ApiError.unauthorized('A print token is required');

  let payload;
  try {
    payload = jwt.verify(token, env.printTokenSecret);
  } catch {
    throw ApiError.unauthorized('That print link has expired');
  }

  // A login token must not be usable here, and a token for one CV must not
  // open another.
  if (payload.purpose !== 'print' || payload.cv !== String(cvId)) {
    throw ApiError.forbidden('That print token is not valid for this CV');
  }

  return payload;
}

/**
 * Renders a CV to PDF.
 *
 * @param {object} options
 * @param {string} options.cvId - The CV to print.
 * @param {string} options.userId - The owner, encoded into the print token.
 * @returns {Promise<Buffer>} The PDF file.
 */
export async function generatePdf({ cvId, userId }) {
  const token = signPrintToken(cvId, userId);
  const url = `${env.clientUrl}/print/${cvId}?token=${encodeURIComponent(token)}`;

  let browser;
  try {
    browser = await getBrowser();
  } catch (error) {
    console.error('[pdfService] could not start Chromium:', error.message);
    throw new ApiError(503, describeLaunchFailure(error));
  }

  const page = await browser.newPage();

  try {
    // A4 at 96dpi, so the page lays out at exactly the preview's width.
    await page.setViewport({ width: 794, height: 1123 });

    await page.goto(url, { waitUntil: 'networkidle0', timeout: 20000 });

    // The print page sets this once its data has loaded and document.fonts
    // is ready. Waiting for it, rather than for a fixed delay, is what stops
    // a PDF being printed mid-render with fallback fonts.
    await page.waitForFunction('window.__CV_READY__ === true', { timeout: 15000 });

    // The page is printed, not screenshotted: Chromium lays the CV out as a
    // run of A4 sheets and starts a new one whenever the content overflows,
    // obeying the break rules in templates.css. A CV of any length therefore
    // comes out as a correctly paginated, printable document.
    //
    // The sheet size and the margins both come from the @page rules in
    // templates.css rather than from here, because the first sheet needs a
    // different top margin from the rest and only CSS can express that. That
    // is what preferCSSPageSize asks for, and passing no `margin` option is
    // what leaves the CSS margins in charge.
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
    });

    // page.pdf() resolves to a Uint8Array, not a Buffer. Express only treats
    // a real Buffer as binary; anything else that is an object it serialises
    // as JSON, which would send the bytes as {"0":37,"1":80,…} under a
    // Content-Type of application/pdf and produce a file no reader can open.
    return Buffer.from(pdf);
  } catch (error) {
    console.error('[pdfService] render failed:', error.message);
    throw new ApiError(500, 'The CV could not be rendered as a PDF. Please try again.');
  } finally {
    // The page is always closed, even on failure, or the shared browser
    // would leak a tab per failed download.
    await page.close().catch(() => {});
  }
}
