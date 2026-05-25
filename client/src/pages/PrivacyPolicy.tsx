import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';

export function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-amber-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to JS Visualizer
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Title */}
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">Privacy Policy</h1>
          <p className="text-sm text-zinc-500">Last updated: May 2026</p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-zinc-100 mb-3">1. Overview</h2>
            <p>
              JS Visualizer (<strong className="text-zinc-200">jsvisualizer.bytefront.dev</strong>) is
              a free, browser-based JavaScript execution visualizer built and maintained by{' '}
              <strong className="text-zinc-200">Bytefront</strong>. This policy explains what data we
              collect, why we collect it, and how you can control it.
            </p>
            <p className="mt-3">
              We keep things minimal. We do not sell your data. We do not require an account.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-100 mb-3">2. Data We Collect</h2>

            <h3 className="text-sm font-semibold text-zinc-300 mb-2 mt-4">
              a) Analytics (Google Analytics 4)
            </h3>
            <p>
              If you accept cookies, we use Google Analytics 4 to collect anonymous usage data:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-400">
              <li>Pages visited and time spent</li>
              <li>Country / region (not precise location)</li>
              <li>Browser and device type</li>
              <li>How you found the site (search, direct, referral)</li>
              <li>Which features you use (Run, Step, examples, panels)</li>
            </ul>
            <p className="mt-3 text-zinc-400">
              This data is aggregated and anonymous. We cannot identify individual users from it.
              If you <strong className="text-zinc-300">decline cookies</strong>, Google Analytics
              is disabled entirely — no tracking data is collected.
            </p>

            <h3 className="text-sm font-semibold text-zinc-300 mb-2 mt-5">
              b) Feedback Form (Web3Forms)
            </h3>
            <p>
              If you voluntarily submit feedback via the Feedback button, we collect:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-400">
              <li>Name (optional — only if you provide it)</li>
              <li>Email address (optional — only if you provide it)</li>
              <li>Your feedback message and category</li>
            </ul>
            <p className="mt-3 text-zinc-400">
              This is sent via{' '}
              <a
                href="https://web3forms.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 hover:text-amber-300 underline underline-offset-2"
              >
                Web3Forms
              </a>{' '}
              and delivered to our email inbox. We use it solely to improve the tool. We do not add
              you to any mailing list without your explicit consent.
            </p>

            <h3 className="text-sm font-semibold text-zinc-300 mb-2 mt-5">
              c) Local Storage
            </h3>
            <p>
              We store the following data in your browser's local storage (never sent to a server):
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-400">
              <li>Your cookie consent choice</li>
              <li>Whether you've seen the onboarding dialog</li>
              <li>UI preferences (theme, speed, panel states)</li>
              <li>Custom examples you create</li>
            </ul>
            <p className="mt-3 text-zinc-400">
              You can clear this at any time via your browser's "Clear site data" option.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-100 mb-3">3. Cookies</h2>
            <p>
              We only set cookies if you <strong className="text-zinc-200">accept</strong> via the
              consent banner. The cookies are set by Google Analytics 4 for session and measurement
              purposes. No advertising or third-party tracking cookies are used.
            </p>
            <p className="mt-3">
              You can change your cookie preference at any time by clearing your browser's site data
              for this domain — the consent banner will reappear on your next visit.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-100 mb-3">4. Third-Party Services</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse mt-2">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Service</th>
                    <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Purpose</th>
                    <th className="text-left py-2 text-zinc-400 font-medium">Privacy Policy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  <tr>
                    <td className="py-2 pr-4 text-zinc-300">Google Analytics 4</td>
                    <td className="py-2 pr-4 text-zinc-400">Usage analytics</td>
                    <td className="py-2">
                      <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 underline underline-offset-2">
                        policies.google.com
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-zinc-300">Web3Forms</td>
                    <td className="py-2 pr-4 text-zinc-400">Feedback form delivery</td>
                    <td className="py-2">
                      <a href="https://web3forms.com/privacy" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 underline underline-offset-2">
                        web3forms.com/privacy
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-zinc-300">Vercel</td>
                    <td className="py-2 pr-4 text-zinc-400">Hosting & CDN</td>
                    <td className="py-2">
                      <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 underline underline-offset-2">
                        vercel.com/legal
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-100 mb-3">5. Your Rights (GDPR)</h2>
            <p>If you are based in the EU / EEA, you have the right to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-400">
              <li><strong className="text-zinc-300">Access</strong> — request a copy of data we hold about you</li>
              <li><strong className="text-zinc-300">Erasure</strong> — request deletion of your data</li>
              <li><strong className="text-zinc-300">Object</strong> — opt out of analytics at any time by declining cookies</li>
              <li><strong className="text-zinc-300">Portability</strong> — receive your data in a portable format</li>
            </ul>
            <p className="mt-3 text-zinc-400">
              To exercise any of these rights, contact us at the email below. We will respond within
              30 days.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-100 mb-3">6. Data Retention</h2>
            <p className="text-zinc-400">
              Google Analytics data is retained for 14 months (GA4 default). Feedback emails are
              kept in our inbox until manually deleted. Local storage data stays on your device until
              you clear it.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-100 mb-3">7. Children's Privacy</h2>
            <p className="text-zinc-400">
              JS Visualizer is intended for developers and learners aged 13 and older. We do not
              knowingly collect data from children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-100 mb-3">8. Changes to This Policy</h2>
            <p className="text-zinc-400">
              We may update this policy occasionally. The "Last updated" date at the top of this
              page will reflect any changes. Continued use of the site after changes constitutes
              acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-100 mb-3">9. Contact</h2>
            <p className="text-zinc-400">
              Questions or requests regarding this policy:
            </p>
            <p className="mt-2">
              <strong className="text-zinc-200">Bytefront</strong><br />
              <a
                href="mailto:supratikdas01@gmail.com"
                className="text-amber-400 hover:text-amber-300 underline underline-offset-2"
              >
                supratikdas01@gmail.com
              </a>
            </p>
          </section>

        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-600">
          <span>© 2026 Bytefront</span>
          <Link href="/" className="text-amber-500 hover:text-amber-400 transition-colors">
            ← Back to JS Visualizer
          </Link>
        </div>
      </main>
    </div>
  );
}
