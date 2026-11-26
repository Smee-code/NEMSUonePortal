/*
  The line under the login-code box: how long the emailed code is still good
  for, then a clear "expired" notice pointing at Resend code.

  The ticking number is hidden from screen readers (a value announced every
  second is noise); the expiry itself is announced once, as a status.
*/
export default function OtpClock({ id, secondsLeft, expired }) {
  if (expired) {
    return (
      <p id={id} role="status" style={{ fontSize: 12.5, color: '#b91c1c', fontWeight: 600, margin: '.45rem 0 0', textAlign: 'left' }}>
        This code has expired. Choose “Resend code” to get a new one.
      </p>
    );
  }
  const m = Math.floor(secondsLeft / 60);
  const s = String(secondsLeft % 60).padStart(2, '0');
  const urgent = secondsLeft <= 15;
  return (
    <p id={id} style={{ fontSize: 12.5, color: urgent ? '#92400e' : '#475569', fontWeight: urgent ? 600 : 400, margin: '.45rem 0 0', textAlign: 'left' }}>
      <span aria-hidden="true">This code expires in <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{m}:{s}</strong>.</span>
      <span style={SR_ONLY}>This code is valid for a short time only.</span>
    </p>
  );
}

const SR_ONLY = { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 };
