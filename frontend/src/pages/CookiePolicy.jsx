import LegalPage from '../components/LegalPage';

export default function CookiePolicy() {
  return (
    <LegalPage eyebrow="Legal" title={<>Cookie <em>Policy</em></>} updated="November 26, 2026">
      <p>
        This policy explains how NEMSUOne uses cookies. We keep our use of cookies to the
        minimum needed to run the portal securely. We do not use advertising, tracking, or
        third-party analytics cookies.
      </p>

      <h2>1. What cookies we use</h2>
      <p>NEMSUOne uses three cookies. All of them exist to sign you in or to remember a choice you made:</p>
      <ul>
        <li>
          <strong>Sign-in session (refresh token):</strong> a secure, HttpOnly cookie that keeps you
          signed in and lets the portal renew your session. It cannot be read by scripts and is used
          only for authentication. It lasts up to 7 days.
        </li>
        <li>
          <strong>Remembered device:</strong> set only if you leave &ldquo;Don&rsquo;t ask for a code on
          this device for 30 days&rdquo; checked when you enter your sign-in code. It is a secure, HttpOnly
          cookie holding a random token, so this browser can skip the emailed code for 30 days. It is
          removed if you uncheck that option, and it stops working when you change your password.
        </li>
        <li>
          <strong>Cookie notice:</strong> remembers that you dismissed the cookie notice, so it is not
          shown again on every visit.
        </li>
      </ul>
      <p>Your short-lived access token is kept in the app's memory only and is never stored in a cookie or in browser storage.</p>

      <h2>2. Why consent works this way</h2>
      <p>The sign-in cookie is strictly necessary to provide a service you have requested (signing in), and the other two only record a choice you made yourself. None of them tracks you, so they do not require opt-in consent under data-privacy rules. If you block the sign-in cookie in your browser, you will not be able to stay signed in.</p>

      <h2>3. Managing cookies</h2>
      <p>You can delete or block cookies through your browser settings at any time. Blocking the sign-in cookie will prevent sign-in from working correctly. Deleting the remembered-device cookie only means you will be asked for a code the next time you sign in.</p>

      <h2>4. Changes</h2>
      <p>If we ever introduce additional cookies, we will update this policy and, where required, ask for your consent first.</p>

      <h2>5. More information</h2>
      <p>See our <a href="/privacy">Privacy Policy</a> for how we handle personal data, or contact the University Data Protection Officer with any questions.</p>
    </LegalPage>
  );
}
