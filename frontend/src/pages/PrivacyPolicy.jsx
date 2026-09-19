import LegalPage from '../components/LegalPage';

export default function PrivacyPolicy() {
  return (
    <LegalPage eyebrow="Legal" title={<>Privacy <em>Policy</em></>} updated="September 19, 2026">
      <p>
        North Eastern Mindanao State University, Cantilan Campus ("the University", "we", "us")
        operates NEMSUonePortal. We respect your privacy and handle personal data in accordance with
        Republic Act No. 10173, the Data Privacy Act of 2012, its implementing rules, and the issuances
        of the National Privacy Commission.
      </p>

      <h2>1. Information we collect</h2>
      <p>To provide portal services, we collect and process:</p>
      <ul>
        <li><strong>Identity and academic records:</strong> name, student or employee number, program, year level, grades, schedules, and enrollment history.</li>
        <li><strong>Contact details:</strong> institutional email, personal email, and mobile number.</li>
        <li><strong>Account data:</strong> role, encrypted password, and login activity.</li>
        <li><strong>Admission documents:</strong> files uploaded by applicants for validation.</li>
        <li><strong>Technical data:</strong> IP address and audit-log entries recorded for security.</li>
      </ul>

      <h2>2. How we use your information</h2>
      <p>Your data is used only to deliver and secure academic services, including enrollment, grade viewing, scheduling, document requests, announcements, and account management. We also use audit logs to detect and investigate misuse.</p>

      <h2>3. Legal basis</h2>
      <p>We process personal data on the basis of your enrollment or employment relationship with the University, compliance with legal obligations, and, where required, your consent. Consent may be withdrawn subject to the limits of records the University is required to keep.</p>

      <h2>4. Sharing and disclosure</h2>
      <p>We do not sell personal data. Information is shared only with authorized University offices, and with government agencies such as the Commission on Higher Education where law requires it. Any service provider that processes data on our behalf is bound by confidentiality and data-protection obligations.</p>

      <h2>5. Data retention</h2>
      <p>Academic records are retained for the periods prescribed by University policy and applicable regulations. Admission documents for applicants who do not enroll are kept only as long as needed for the admission cycle, then securely disposed of.</p>

      <h2>6. Security</h2>
      <p>We apply organizational, physical, and technical safeguards, including role-based access control, encryption of credentials, and continuous audit logging. No system is perfectly secure, but we work to protect your data against unauthorized access, alteration, or loss.</p>

      <h2>7. Your rights</h2>
      <p>Under the Data Privacy Act, you have the right to be informed, to access and correct your data, to object to processing, to erasure or blocking where allowed, to data portability, and to lodge a complaint with the National Privacy Commission.</p>

      <h2>8. Cookies</h2>
      <p>NEMSUonePortal uses one essential cookie to keep you signed in securely. See our <a href="/cookies">Cookie Policy</a> for details.</p>

      <h2>9. Contact</h2>
      <p>For privacy concerns or to exercise your rights, contact the University Data Protection Officer at the Cantilan Campus, Cantilan, Surigao del Sur, or through the official campus email published on the University website.</p>
    </LegalPage>
  );
}
