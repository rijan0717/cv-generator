/**
 * Sample popularity figures for the template cards on the home page.
 *
 * **These numbers are generated, not measured.** Nothing in the system
 * records a view or a like on a template yet, so they are sample data in
 * the same spirit as the invented CV the hero renders — there to show what
 * the card looks like with content in it.
 *
 * Two things follow from that, and both are deliberate:
 *
 *   1. They are **derived from the template key**, not from `Math.random()`.
 *      A figure that changed on every render — jumping as you scrolled past
 *      the same card twice — would read as a broken page rather than as a
 *      number. Derived from the key, a template has the same figure on
 *      every visit, on every machine, and in every test.
 *   2. They are **labelled as samples** by the caller. A fabricated count
 *      shown as though it were real is a small lie that the site has no
 *      reason to tell.
 *
 * Replace the whole module with a real count the day views are recorded;
 * nothing outside it knows how the numbers are made.
 */

/**
 * A small, stable string hash (FNV-1a, 32-bit).
 *
 * Chosen because it is six lines and has no dependencies, not because the
 * distribution has to be good — it only has to be the same every time.
 *
 * @param {string} text - The template key.
 * @returns {number} A non-negative 32-bit integer.
 */
function hash(text) {
  let value = 0x811c9dc5;

  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    // The FNV prime, as shifts, because `value * 16777619` overflows a
    // double's exact-integer range and stops being reproducible.
    value += (value << 1) + (value << 4) + (value << 7) + (value << 8) + (value << 24);
  }

  return value >>> 0;
}

/**
 * Maps a hash into a range, so the figures look varied but never absurd.
 * @param {number} seed - A hash.
 * @param {number} min - Lowest value, inclusive.
 * @param {number} max - Highest value, inclusive.
 * @returns {number}
 */
function between(seed, min, max) {
  return min + (seed % (max - min + 1));
}

/**
 * "2.9k" for 2,931; "840" for 840.
 *
 * One decimal place above a thousand, which is how every site writes these
 * and therefore what a reader expects to see.
 *
 * @param {number} count
 * @returns {string}
 */
export function formatCount(count) {
  if (count < 1000) return String(count);
  return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`;
}

/**
 * Sample likes and views for one template.
 *
 * Views are derived from a second hash of the key rather than from the
 * likes, so the ratio varies between templates the way a real one would
 * instead of every card showing the same multiple.
 *
 * @param {string} key - The template key.
 * @returns {{likes: number, views: number}}
 */
export function engagementFor(key) {
  const seed = hash(key);

  return {
    likes: between(seed, 24, 320),
    views: between(hash(`${key}:views`), 1200, 28000),
  };
}
