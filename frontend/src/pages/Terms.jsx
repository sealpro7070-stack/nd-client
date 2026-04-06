import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function Terms() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-page px-5 py-12">
      <div className="max-w-2xl mx-auto">

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-semibold text-muted hover:text-heading transition-colors mb-8"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          <div>
            <h1 className="font-display text-3xl font-extrabold text-heading">Terms of Use</h1>
            <p className="text-muted text-sm mt-2">Last updated: April 2026</p>
          </div>

          <div className="bg-warn-50 border border-warn-200 rounded-xl p-4 text-sm text-warn-800 font-medium">
            By creating an account, you confirm that you have read and agree to these terms. Please read them carefully before using Nilam Auto.
          </div>

          <Section title="1. About the Service">
            <p>Nilam Auto ("the Service") is an independent, third-party automation tool that helps Malaysian students submit their NILAM reading records on the AINS platform (ains.moe.gov.my) using your own account credentials.</p>
            <p><strong>Nilam Auto is not affiliated with, endorsed by, or officially connected to the Ministry of Education Malaysia (KPM), the AINS platform, or any government body.</strong></p>
          </Section>

          <Section title="2. Eligibility">
            <ul>
              <li>You must be a registered student with a valid AINS account, or a parent/guardian managing a student's AINS account.</li>
              <li>You must be at least 13 years old to create an account independently. Users under 13 require parental or guardian consent and oversight.</li>
              <li>By registering, you confirm that the information you provide is accurate and that you are the authorised user of the AINS account you connect.</li>
            </ul>
          </Section>

          <Section title="3. Acceptable Use">
            <p>You agree to use Nilam Auto only for its intended purpose: automating your own legitimate NILAM reading record submissions. You must not:</p>
            <ul>
              <li>Submit records for books you have not actually read.</li>
              <li>Use the service to submit records on behalf of another person without their explicit consent.</li>
              <li>Attempt to reverse-engineer, hack, or abuse the service or the AINS platform.</li>
              <li>Share your account with others or use the service in a way that violates AINS's own terms.</li>
              <li>Use automated scripts, bots, or tools to abuse the Nilam Auto platform itself.</li>
            </ul>
          </Section>

          <Section title="4. Your AINS Credentials">
            <ul>
              <li>You are responsible for your own AINS account. By connecting it to Nilam Auto, you grant the service permission to log in and submit reading records on your behalf.</li>
              <li>Your AINS password is entered once for login purposes and is immediately discarded — it is never stored by Nilam Auto.</li>
              <li>You may disconnect your AINS account at any time by reconnecting with updated credentials or contacting support.</li>
            </ul>
          </Section>

          <Section title="5. Paid Plans">
            <ul>
              <li>Paid plans (Pro and Family) are activated after manual payment verification via Touch n Go QR and admin approval. Payments are non-refundable once a plan is activated.</li>
              <li>Plan access is granted for one (1) year from the date of approval.</li>
              <li>We reserve the right to revoke plan access if the account is found to be in violation of these Terms.</li>
            </ul>
          </Section>

          <Section title="6. Service Availability and Accuracy">
            <ul>
              <li>Nilam Auto depends on the availability and structure of the AINS website. If AINS changes its interface or restricts access, the service may stop functioning partially or completely. We will attempt to restore functionality but cannot guarantee any specific uptime.</li>
              <li>The Service is provided "as is" without warranties of any kind. We are not responsible for any submission failures, missed deadlines, or consequences arising from use of the service.</li>
            </ul>
          </Section>

          <Section title="7. Account Termination">
            <p>We reserve the right to suspend or terminate accounts that violate these Terms, abuse the service, or engage in fraudulent activity (such as submitting records for unread books).</p>
          </Section>

          <Section title="8. Changes to These Terms">
            <p>We may update these Terms from time to time. Continued use of the service after changes are posted constitutes acceptance of the revised Terms.</p>
          </Section>

          <Section title="9. Contact">
            <p>If you have questions about these Terms, please contact us through the Nilam Auto platform.</p>
          </Section>
        </motion.div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="card-p space-y-3">
      <h2 className="font-display text-base font-bold text-heading">{title}</h2>
      <div className="text-sm text-muted space-y-2 [&_ul]:space-y-1.5 [&_ul]:list-disc [&_ul]:pl-4 [&_strong]:font-semibold [&_strong]:text-heading">
        {children}
      </div>
    </div>
  )
}
