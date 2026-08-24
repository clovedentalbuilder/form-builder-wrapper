/**
 * Asset URL sanitising (package-level).
 *
 * S3 object keys are derived from user-supplied file names, so they routinely
 * contain characters that are legal in a key but not in a URL path — spaces,
 * `&`, `#`, `?`, `+`, `(`, `)`, non-ASCII. Pasted straight into an `<img src>`
 * or an iframe those either truncate the key (`#`, `?`) or fail to resolve.
 *
 * `sanitizeAssetUrl` percent-encodes each path segment while leaving already
 * encoded sequences (`%20`) alone, so it is safe to call twice on the same URL.
 *
 * NOTE: it escapes `?` and `#` as literal path characters, which means it must
 * NOT be used on a pre-signed URL — that would destroy the `X-Amz-*` query
 * string. Only apply it to URLs we build ourselves from a bucket + object key.
 */

/** Characters RFC 3986 allows in a path segment without escaping. */
const UNRESERVED_CHARS = /[A-Za-z0-9\-_.~]/;

/** Percent-encode one path segment, preserving existing `%XX` escapes. */
function encodePathSegment(segment: string): string {
  let result = '';
  for (let i = 0; i < segment.length; i++) {
    const ch = segment[i];
    if (ch === '%' && /^[0-9a-fA-F]{2}$/.test(segment.slice(i + 1, i + 3))) {
      result += segment.slice(i, i + 3);
      i += 2;
      continue;
    }
    if (UNRESERVED_CHARS.test(ch)) {
      result += ch;
      continue;
    }
    try {
      result += encodeURIComponent(ch);
    } catch {
      // Lone surrogate — encodeURIComponent throws; fall back to its code unit.
      result += '%' + ch.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0');
    }
  }
  return result;
}

/**
 * Make a self-built asset URL safe to use as an `src` / `href`.
 * Returns '' for a null/undefined/empty input.
 */
export function sanitizeAssetUrl(url: string | null | undefined): string {
  if (!url) return '';

  // Treat these as part of the object key, not as URL delimiters.
  const withEscapedDelimiters = url
    .replace(/#/g, '%23')
    .replace(/\?/g, '%3F')
    .replace(/\\/g, '%5C');

  try {
    const parsed = new URL(withEscapedDelimiters);
    parsed.pathname = parsed.pathname.split('/').map(encodePathSegment).join('/');
    return parsed.toString();
  } catch {
    // Not an absolute URL (relative path / malformed) - escape the risky
    // characters in place rather than dropping the value.
    return withEscapedDelimiters
      .replace(/%(?![0-9a-fA-F]{2})/g, '%25')
      .replace(/[ &$@()]/g, (ch) => encodeURIComponent(ch));
  }
}
