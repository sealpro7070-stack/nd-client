import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function Privacy() {
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
            <h1 className="font-display text-3xl font-extrabold text-heading">Privacy Policy</h1>
            <p className="text-muted text-sm mt-2">Last updated: April 2026</p>
          </div>

          <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 text-sm text-brand-700 font-medium">
            Nilam Auto is an independent tool built for Malaysian students. We are not affiliated with, endorsed by, or connected to the Ministry of Education Malaysia (KPM) or the AINS platform.
          </div>

          <Section title="1. What We Collect">
            <p>When you use Nilam Auto, we collect and store the following information:</p>
            <ul>
              <li><strong>Email address</strong> — used to create and identify your account.</li>
              <li><strong>AINS session cookie (encrypted)</strong> — captured when you log in through our Connect AINS flow. Stored using AES-256-GCM encryption. This allows the bot to submit records on your behalf.</li>
              <li><strong>AINS email address (encrypted)</strong> — stored alongside the session to identify your AINS account.</li>
              <li><strong>Reading preferences</strong> — language, book type, and books per month target that you configure in Settings.</li>
              <li><strong>Submission history</strong> — a log of books submitted, including title, language, date, and status (success/failed).</li>
            </ul>
          </Section>

          <Section title="2. What We Do NOT Collect">
            <ul>
              <li><strong>Your AINS password is never stored.</strong> It is entered by you, used once to log in and capture a session cookie, then immediately discarded. It is never written to our database.</li>
              <li>We do not collect payment card details. Payments are processed manually via Touch n Go QR, and only a receipt image is stored for admin review.</li>
            </ul>
          </Section>

          <Section title="3. How We Use Your Data">
            <ul>
              <li>To automate your NILAM reading record submissions on ains.moe.gov.my using the session you provide.</li>
              <li>To display your submission history and statistics on your dashboard.</li>
              <li>To enforce plan limits (free, Pro, Family).</li>
              <li>To send account verification emails via Supabase.</li>
              <li>To send monthly email reminders (when this feature is enabled).</li>
            </ul>
          </Section>

          <Section title="4. Data Storage and Security">
            <ul>
              <li>Your account and submission data is stored on <strong>Supabase</strong> (hosted in Singapore), protected by Row-Level Security (RLS) policies — only you can access your own data.</li>
              <li>The bot backend runs on <strong>Railway</strong> (cloud hosting). AINS session cookies are decrypted in memory only when a submission is running and are never logged or exposed in API responses.</li>
              <li>Receipt images uploaded during payment are stored temporarily for admin review and not shared.</li>
            </ul>
          </Section>

          <Section title="5. Data Sharing">
            <p>We do not sell, rent, or share your personal data with any third party for marketing or advertising purposes. Your data is only shared with infrastructure providers (Supabase, Railway) necessary to operate the service.</p>
          </Section>

          <Section title="6. Session Expiry and Data Deletion">
            <ul>
              <li>AINS session cookies expire naturally (typically within 30 minutes of capture). You will need to reconnect your account periodically.</li>
              <li>You may request deletion of your account and all associated data by contacting us. We will remove your record within 7 days.</li>
            </ul>
          </Section>

          <Section title="7. Children's Privacy">
            <p>Nilam Auto is designed for use by students and parents of students in Malaysia. If you are under 13, a parent or guardian must create and manage your account. We do not knowingly collect data from children without parental consent.</p>
          </Section>

          <Section title="8. Contact">
            <p>For privacy-related concerns or data deletion requests, please contact the developer through the Nilam Auto platform.</p>
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
