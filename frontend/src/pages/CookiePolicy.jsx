import LegalPage from '../components/LegalPage';

export default function CookiePolicy() {
  return (
    <LegalPage eyebrow="Legal" title={<>Cookie <em>Policy</em></>} updated="September 19, 2026">
      <p>
        This policy explains how NEMSUonePortal uses cookies. We keep our use of cookies to the
        minimum needed to run the portal securely. We do not use advertising, tracking, or
        third-party analytics cookies.
      </p>

      <h2>1. What cookies we use</h2>
      <p>NEMSUonePortal uses a single <strong>essential</strong> cookie:</p>
      <ul>
        <li>
          <strong>Authentication (refresh token):</strong> a secure, HttpOnly cookie that keeps you
          signed in and lets the portal renew your session. It cannot be read by scripts and is used
          only for authentication.
        </li>
      </ul>
      <p>Your short-lived access token is kept in the app's memory only and is never stored in a cookie or in browser storage.</p>

      <h2>2. Why consent works this way</h2>
      <p>Because this cookie is strictly necessary to provide a service you have requested (signing in), it does not require opt-in consent under data-privacy rules. If you disable it in your browser, you will not be able to stay logged in.</p>

      <h2>3. Managing cookies</h2>
      <p>You can delete or block cookies through your browser settings at any time. Blocking the essential cookie will prevent sign-in from working correctly.</p>

      <h2>4. Changes</h2>
      <p>If we ever introduce additional cookies, we will update this policy and, where required, ask for your consent first.</p>

      <h2>5. More information</h2>
      <p>See our <a href="/privacy">Privacy Policy</a> for how we handle personal data, or contact the University Data Protection Officer with any questions.</p>
    </LegalPage>
  );
}
