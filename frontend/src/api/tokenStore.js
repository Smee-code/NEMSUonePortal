/**
 * Module-level access token store.
 *
 * The access token lives in JavaScript module memory ONLY.
 * It is never written to localStorage, sessionStorage, or any cookie.
 * It is cleared automatically on page reload, requiring re-authentication
 * via the HttpOnly refresh token cookie (set by the backend).
 *
 * OWASP A07 — Authentication Failures
 */
let _accessToken = null;

export const setAccessToken = (token) => { _accessToken = token; };
export const getAccessToken = () => _accessToken;
export const clearAccessToken = () => { _accessToken = null; };
