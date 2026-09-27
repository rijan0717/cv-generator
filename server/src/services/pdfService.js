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
 * Returns the shared browser, starting it if necessary.
 * @returns {Promise<import('puppeteer').Browser>}
 */
async function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer
      .launch({
        headless: true,
        // Required to run as root inside a container, and harmless locally.
        args: ['--no-sandbox', '--disable-dev-shm-usage'],
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
    throw new ApiError(
      503,
      'The PDF service is unavailable. Chromium may not be installed: run "npx puppeteer browsers install chrome".',
    );
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

    return await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: false,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
  } catch (error) {
    console.error('[pdfService] render failed:', error.message);
    throw new ApiError(500, 'The CV could not be rendered as a PDF. Please try again.');
  } finally {
    // The page is always closed, even on failure, or the shared browser
    // would leak a tab per failed download.
    await page.close().catch(() => {});
  }
}
