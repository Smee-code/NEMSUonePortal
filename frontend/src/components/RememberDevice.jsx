/*
  "Remember this device" option on the login-code screen.

  Ticked: after this code is verified, this browser signs in with the password
  alone for the next 30 days. Unticked: the code is asked on every sign-in here.
  The server enforces both; a new device, an expired 30 days, or a changed
  password always brings the code back.
*/
export default function RememberDevice({ checked, onChange, id = 'remember-device' }) {
  return (
    <label htmlFor={id} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, margin: '.85rem 0 .9rem', cursor: 'pointer', textAlign: 'left', fontWeight: 400 }}>
      <input
        id={id} type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        style={{ width: 17, height: 17, margin: '2px 0 0', flexShrink: 0, accentColor: '#0B1B2E', cursor: 'pointer' }}
      />
      <span style={{ fontSize: 13, lineHeight: 1.45, color: '#334155' }}>
        Don’t ask for a code on this device for 30 days
        <span style={{ display: 'block', fontSize: 12, color: '#64748b' }}>
          Uncheck this on a shared or public computer.
        </span>
      </span>
    </label>
  );
}
