import LegalPage from '../components/LegalPage';

export default function TermsConditions() {
  return (
    <LegalPage eyebrow="Legal" title={<>Terms &amp; <em>Conditions</em></>} updated="September 19, 2026">
      <p>
        These Terms govern your use of NEMSUonePortal, the online student portal of North Eastern
        Mindanao State University, Cantilan Campus. By accessing or using the portal, you agree to
        these Terms. If you do not agree, please do not use the portal.
      </p>

      <h2>1. Eligibility and accounts</h2>
      <p>Access is limited to enrolled students, faculty, staff, and authorized administrators of the University, and to applicants for the purpose of admission. You are responsible for keeping your credentials confidential and for all activity under your account. Notify the University immediately if you suspect unauthorized use.</p>

      <h2>2. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Access data or functions outside the role assigned to your account.</li>
        <li>Attempt to disrupt, probe, or bypass the security of the portal.</li>
        <li>Upload malicious files or content that is unlawful, misleading, or infringing.</li>
        <li>Share, sell, or misuse information obtained through the portal.</li>
      </ul>

      <h2>3. Academic records</h2>
      <p>Grades, enrollment status, and other records displayed in the portal are for your reference. The University's official records prevail in case of any discrepancy. Physical release of documents remains subject to the procedures of the Office of the Registrar.</p>

      <h2>4. Availability</h2>
      <p>We aim to keep the portal available at all times but do not guarantee uninterrupted service. Access may be suspended for maintenance, upgrades, or reasons beyond our control.</p>

      <h2>5. Intellectual property</h2>
      <p>The portal, its design, and its content are the property of the University or its licensors and are protected by law. You may not copy, modify, or redistribute them without permission.</p>

      <h2>6. Limitation of liability</h2>
      <p>The portal is provided on an "as is" basis. To the extent permitted by law, the University is not liable for indirect or consequential loss arising from use of, or inability to use, the portal.</p>

      <h2>7. Suspension and termination</h2>
      <p>The University may suspend or terminate access for violation of these Terms, University policy, or applicable law.</p>

      <h2>8. Changes to these Terms</h2>
      <p>We may update these Terms from time to time. Continued use of the portal after changes take effect constitutes acceptance of the revised Terms.</p>

      <h2>9. Governing law</h2>
      <p>These Terms are governed by the laws of the Republic of the Philippines. Disputes are subject to the competent courts of Surigao del Sur.</p>

      <h2>10. Contact</h2>
      <p>Questions about these Terms may be directed to the Office of the Registrar, NEMSU Cantilan Campus, Cantilan, Surigao del Sur.</p>
    </LegalPage>
  );
}
