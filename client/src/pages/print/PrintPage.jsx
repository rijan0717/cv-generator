import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { getTemplate } from '../../templates/index.js';
import { buildTemplateVariables } from '../../templates/templateUtils.js';

/**
 * The page Puppeteer prints.
 *
 * It renders exactly the same template component as the editor preview, at
 * true A4 size with no scaling, no navigation and no application chrome —
 * which is what makes the PDF match what the user saw.
 *
 * Authorisation comes from the short-lived print token in the query string,
 * not from the session cookie, because headless Chromium has no session.
 *
 * When everything is rendered and the fonts have finished loading it sets
 * `window.__CV_READY__`, and the server waits for that flag before printing.
 * Waiting on a real signal rather than a fixed delay is what stops a PDF
 * being captured mid-render with fallback fonts.
 */
export default function PrintPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [cv, setCv] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data } = await axios.get(`/api/cvs/${id}/print-data`, { params: { token } });
        if (!cancelled) setCv(data.data.cv);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message ?? err.message);
          // Let the server stop waiting rather than time out.
          window.__CV_READY__ = true;
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [id, token]);

  useEffect(() => {
    if (!cv) return;

    // Two things must finish before the page is safe to print: React has to
    // have painted this render, and the web fonts have to have loaded.
    document.fonts.ready.then(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.__CV_READY__ = true;
        });
      });
    });
  }, [cv]);

  if (error) {
    return <div style={{ padding: 40, fontFamily: 'sans-serif' }}>Could not load CV: {error}</div>;
  }

  if (!cv) return null;

  const { Component } = getTemplate(cv.templateKey);

  return (
    <div style={buildTemplateVariables(cv.settings)}>
      <Component cv={cv} />
    </div>
  );
}
