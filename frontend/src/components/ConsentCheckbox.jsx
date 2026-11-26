/*
  Terms and Conditions + Data Privacy consent (RA 10173, Data Privacy Act of 2012).

  Shown wherever a person first hands the system their personal data: the
  admission application and every account-creation form. The server refuses the
  request unless `privacy_consent` is true and records when it was given, so this
  checkbox is the UI for that rule, not the rule itself.

  Props:
    checked, onChange(bool)
    purpose  'application' | 'account'  — picks the sentence describing the use
    invalid  highlight the box after a submit attempt without consent
    id       unique per form (for the label)
*/
const PURPOSE = {
  application:
    'collecting and using the personal information and documents I submit to process my ' +
    'admission and enrollment and to keep my academic records',
  account:
    'collecting and using the personal information in my account to provide enrollment, ' +
    'grades, class schedules, document requests, and announcements',
};

export default function ConsentCheckbox({ checked, onChange, purpose = 'application', invalid = false, id = 'privacy-consent' }) {
  return (
    <div className={`consent${invalid ? ' is-invalid' : ''}`}>
      <style>{CSS}</style>
      <div className="consent-title">Terms and Data Privacy Consent</div>
      <label className="consent-row" htmlFor={id}>
        <input
          id={id} type="checkbox" required
          checked={checked} onChange={e => onChange(e.target.checked)}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${id}-err` : undefined}
        />
        <span>
          I have read and agree to the{' '}
          <a href="/terms" target="_blank" rel="noopener noreferrer">Terms and Conditions</a> and the{' '}
          <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>, and I consent to
          NEMSU Cantilan Campus {PURPOSE[purpose] || PURPOSE.application}, in accordance with the
          Data Privacy Act of 2012 (Republic Act No. 10173).
          <span className="consent-star" aria-hidden="true"> *</span>
        </span>
      </label>
      {invalid && (
        <p className="consent-err" id={`${id}-err`} role="alert">
          Check the box to agree before you continue.
        </p>
      )}
    </div>
  );
}

const CSS = `
  .consent{border:1px solid #d0dcea;background:#f8fafc;padding:12px 14px;margin:12px 0;text-align:left;border-radius:6px;}
  .consent.is-invalid{border-color:#dc2626;background:#fef2f2;}
  .consent-title{font-size:12px;font-weight:700;color:#0b1b2e;margin-bottom:6px;}
  .consent-row{display:flex;align-items:flex-start;gap:10px;font-size:12.5px;line-height:1.55;color:#334155;cursor:pointer;margin:0;font-weight:400;text-transform:none;letter-spacing:0;}
  .consent-row input{flex-shrink:0;width:18px;height:18px;margin:2px 0 0;accent-color:#0B1B2E;cursor:pointer;}
  .consent-row a{color:#1d4ed8;font-weight:600;text-decoration:underline;}
  .consent-star{color:#dc2626;font-weight:700;}
  .consent-err{color:#dc2626;font-size:12px;margin:8px 0 0 28px;font-weight:500;}
`;
