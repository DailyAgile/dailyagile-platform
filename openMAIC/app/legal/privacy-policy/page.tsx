'use client';

/**
 * Privacy Policy Page
 * GDPR Article 13/14 and CCPA compliant
 * Accessible via /legal/privacy-policy
 */

import Link from 'next/link';

const COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  darkGray: '#475569',
  border: '#E2E8F0',
  white: '#FFFFFF',
};

export default function PrivacyPolicyPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.white }}>
      {/* Navigation Bar */}
      <div
        style={{
          borderBottom: `1px solid ${COLORS.border}`,
          padding: '16px 24px',
          backgroundColor: COLORS.white,
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link
            href="/"
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: COLORS.navy,
              textDecoration: 'none',
              fontFamily: 'Cambria, serif',
            }}
          >
            DailyAgile
          </Link>
          <Link
            href="/auth/signup"
            style={{
              padding: '8px 16px',
              backgroundColor: COLORS.teal,
              color: COLORS.white,
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: 'Calibri, sans-serif',
              transition: 'background-color 150ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#0677A1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = COLORS.teal;
            }}
          >
            Sign Up
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '48px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: '48px', textAlign: 'center' }}>
          <h1
            style={{
              fontSize: '36px',
              fontWeight: 700,
              color: COLORS.navy,
              margin: '0 0 12px 0',
              fontFamily: 'Cambria, serif',
            }}
          >
            Privacy Policy
          </h1>
          <p
            style={{
              fontSize: '14px',
              color: COLORS.gray,
              margin: 0,
              fontFamily: 'Calibri, sans-serif',
            }}
          >
            Last updated: August 15, 2026 • GDPR Article 13/14 & CCPA compliant
          </p>
        </div>

        {/* Table of Contents */}
        <div
          style={{
            backgroundColor: COLORS.light,
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '36px',
            borderLeft: `4px solid ${COLORS.teal}`,
          }}
        >
          <p
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: COLORS.navy,
              textTransform: 'uppercase',
              margin: '0 0 12px 0',
              fontFamily: 'Calibri, sans-serif',
              letterSpacing: '0.5px',
            }}
          >
            Quick Navigation
          </p>
          <ul
            style={{
              margin: 0,
              paddingLeft: '20px',
              fontSize: '13px',
              color: COLORS.darkGray,
              fontFamily: 'Calibri, sans-serif',
              lineHeight: '1.8',
            }}
          >
            <li><a href="#controller" style={{ color: COLORS.teal, textDecoration: 'none' }}>Data Controller</a></li>
            <li><a href="#collect" style={{ color: COLORS.teal, textDecoration: 'none' }}>Data We Collect</a></li>
            <li><a href="#basis" style={{ color: COLORS.teal, textDecoration: 'none' }}>Lawful Basis</a></li>
            <li><a href="#retention" style={{ color: COLORS.teal, textDecoration: 'none' }}>Retention Periods</a></li>
            <li><a href="#rights" style={{ color: COLORS.teal, textDecoration: 'none' }}>Your Rights</a></li>
            <li><a href="#exercise" style={{ color: COLORS.teal, textDecoration: 'none' }}>Exercise Your Rights</a></li>
            <li><a href="#contact" style={{ color: COLORS.teal, textDecoration: 'none' }}>Contact Us</a></li>
          </ul>
        </div>

        {/* Content Sections */}
        <div style={{ lineHeight: '1.8', fontFamily: 'Calibri, sans-serif', color: COLORS.darkGray, fontSize: '14px' }}>
          {/* Section 1: Data Controller */}
          <section style={{ marginBottom: '36px' }}>
            <h2
              id="controller"
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: COLORS.navy,
                margin: '0 0 12px 0',
                paddingTop: '12px',
                fontFamily: 'Cambria, serif',
              }}
            >
              1. Data Controller
            </h2>
            <p style={{ margin: '0 0 12px 0' }}>
              <strong>Organisation:</strong> DailyAgile
            </p>
            <p style={{ margin: '0 0 12px 0' }}>
              <strong>Owner:</strong> Kiran (tkiran204@gmail.com)
            </p>
            <p style={{ margin: '0 0 12px 0' }}>
              <strong>Support Contact:</strong> support@dailyagile.com
            </p>
            <p style={{ margin: '0 0 12px 0' }}>
              <strong>Data Protection Officer:</strong> tkiran204@gmail.com
            </p>
          </section>

          {/* Section 2: Data We Collect */}
          <section style={{ marginBottom: '36px' }}>
            <h2
              id="collect"
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: COLORS.navy,
                margin: '0 0 12px 0',
                paddingTop: '12px',
                fontFamily: 'Cambria, serif',
              }}
            >
              2. Data We Collect
            </h2>
            <p style={{ margin: '0 0 16px 0' }}>
              We collect the following types of personal data:
            </p>
            <ul style={{ margin: '0 0 12px 0', paddingLeft: '20px' }}>
              <li><strong>Contact Information:</strong> Email address (required for signup)</li>
              <li><strong>Authentication Data:</strong> Password hash (if using password login), 2FA codes</li>
              <li><strong>Profile Data:</strong> First name, last name, avatar, bio, timezone, language preferences</li>
              <li><strong>Quiz & Learning Data:</strong> Quiz responses, scores, attempts, time spent, progress tracking</li>
              <li><strong>Gamification Data:</strong> Badges earned, streaks, points, leaderboard position</li>
              <li><strong>Technical Data:</strong> IP address, user agent, browser type, device information</li>
              <li><strong>Usage Data:</strong> Pages visited, features used, session duration, interaction timestamps</li>
              <li><strong>Consent Records:</strong> Which privacy notices you've accepted, when, IP address at consent</li>
            </ul>
          </section>

          {/* Section 3: Lawful Basis */}
          <section style={{ marginBottom: '36px' }}>
            <h2
              id="basis"
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: COLORS.navy,
                margin: '0 0 12px 0',
                paddingTop: '12px',
                fontFamily: 'Cambria, serif',
              }}
            >
              3. Why We Collect It (Lawful Basis)
            </h2>
            <p style={{ margin: '0 0 12px 0' }}>
              <strong>Contract Necessity (GDPR Article 6(1)(b)):</strong> Email and profile data needed to provide the quiz platform service
            </p>
            <p style={{ margin: '0 0 12px 0' }}>
              <strong>Legitimate Interest (GDPR Article 6(1)(f)):</strong>
            </p>
            <ul style={{ margin: '0 0 12px 0', paddingLeft: '20px' }}>
              <li>Platform security and fraud prevention</li>
              <li>Improving platform features and user experience</li>
              <li>Analysing usage patterns (anonymised)</li>
              <li>Complying with legal obligations</li>
            </ul>
            <p style={{ margin: '0 0 12px 0' }}>
              <strong>Consent (GDPR Article 6(1)(a)):</strong>
            </p>
            <ul style={{ margin: '0 0 12px 0', paddingLeft: '20px' }}>
              <li>Marketing emails (you can withdraw at any time)</li>
              <li>Analytics and performance tracking (optional)</li>
              <li>Leaderboard participation (you can opt out)</li>
            </ul>
          </section>

          {/* Section 4: Retention Periods */}
          <section style={{ marginBottom: '36px' }}>
            <h2
              id="retention"
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: COLORS.navy,
                margin: '0 0 12px 0',
                paddingTop: '12px',
                fontFamily: 'Cambria, serif',
              }}
            >
              4. How Long We Keep It
            </h2>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                marginBottom: '12px',
              }}
            >
              <thead>
                <tr style={{ backgroundColor: COLORS.light }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, borderBottom: `1px solid ${COLORS.border}` }}>
                    Data Type
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, borderBottom: `1px solid ${COLORS.border}` }}>
                    Retention Period
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '12px', borderBottom: `1px solid ${COLORS.border}` }}>Account & profile data</td>
                  <td style={{ padding: '12px', borderBottom: `1px solid ${COLORS.border}` }}>Until account deletion (30-day grace period)</td>
                </tr>
                <tr>
                  <td style={{ padding: '12px', borderBottom: `1px solid ${COLORS.border}` }}>Quiz attempts & scores</td>
                  <td style={{ padding: '12px', borderBottom: `1px solid ${COLORS.border}` }}>3 years (regulatory requirement)</td>
                </tr>
                <tr>
                  <td style={{ padding: '12px', borderBottom: `1px solid ${COLORS.border}` }}>Audit & security logs</td>
                  <td style={{ padding: '12px', borderBottom: `1px solid ${COLORS.border}` }}>7 years (legal requirement)</td>
                </tr>
                <tr>
                  <td style={{ padding: '12px', borderBottom: `1px solid ${COLORS.border}` }}>Technical/usage data</td>
                  <td style={{ padding: '12px', borderBottom: `1px solid ${COLORS.border}` }}>90 days</td>
                </tr>
                <tr>
                  <td style={{ padding: '12px', borderBottom: `1px solid ${COLORS.border}` }}>Marketing consent</td>
                  <td style={{ padding: '12px', borderBottom: `1px solid ${COLORS.border}` }}>Until withdrawn</td>
                </tr>
                <tr>
                  <td style={{ padding: '12px' }}>Consent records (privacy audit trail)</td>
                  <td style={{ padding: '12px' }}>Permanently (GDPR Article 5 accountability)</td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Section 5: Your Rights */}
          <section style={{ marginBottom: '36px' }}>
            <h2
              id="rights"
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: COLORS.navy,
                margin: '0 0 12px 0',
                paddingTop: '12px',
                fontFamily: 'Cambria, serif',
              }}
            >
              5. Your Rights Under GDPR & CCPA
            </h2>
            <p style={{ margin: '0 0 16px 0' }}>
              You have the following rights, which you can exercise free of charge:
            </p>
            <div style={{ backgroundColor: COLORS.light, padding: '16px', borderRadius: '8px', marginBottom: '12px' }}>
              <p style={{ margin: '0 0 12px 0', fontWeight: 600 }}>
                ✓ Right to Access (GDPR Article 15, CCPA §1798.100)
              </p>
              <p style={{ margin: 0 }}>
                Request a copy of all personal data we hold about you in a machine-readable format. Response time: 30 days.
              </p>
            </div>
            <div style={{ backgroundColor: COLORS.light, padding: '16px', borderRadius: '8px', marginBottom: '12px' }}>
              <p style={{ margin: '0 0 12px 0', fontWeight: 600 }}>
                ✓ Right to Erasure / Deletion (GDPR Article 17, CCPA §1798.105)
              </p>
              <p style={{ margin: '0 0 8px 0' }}>
                Request deletion of your account and all associated data. We provide a 30-day grace period to cancel the request.
              </p>
              <p style={{ margin: 0, fontSize: '13px', color: COLORS.gray }}>
                Exception: Audit logs are anonymised but retained for 7 years (legal requirement).
              </p>
            </div>
            <div style={{ backgroundColor: COLORS.light, padding: '16px', borderRadius: '8px', marginBottom: '12px' }}>
              <p style={{ margin: '0 0 12px 0', fontWeight: 600 }}>
                ✓ Right to Rectification (GDPR Article 16)
              </p>
              <p style={{ margin: 0 }}>
                Request correction of inaccurate personal data. Update your profile anytime in settings.
              </p>
            </div>
            <div style={{ backgroundColor: COLORS.light, padding: '16px', borderRadius: '8px', marginBottom: '12px' }}>
              <p style={{ margin: '0 0 12px 0', fontWeight: 600 }}>
                ✓ Right to Restrict Processing (GDPR Article 18)
              </p>
              <p style={{ margin: 0 }}>
                Ask us to limit how we use your data (e.g., exclude yourself from leaderboards).
              </p>
            </div>
            <div style={{ backgroundColor: COLORS.light, padding: '16px', borderRadius: '8px', marginBottom: '12px' }}>
              <p style={{ margin: '0 0 12px 0', fontWeight: 600 }}>
                ✓ Right to Portability (GDPR Article 20)
              </p>
              <p style={{ margin: 0 }}>
                Request your quiz scores and progress in CSV format.
              </p>
            </div>
            <div style={{ backgroundColor: COLORS.light, padding: '16px', borderRadius: '8px', marginBottom: '12px' }}>
              <p style={{ margin: '0 0 12px 0', fontWeight: 600 }}>
                ✓ Right to Opt-Out of Marketing (CCPA §1798.120)
              </p>
              <p style={{ margin: 0 }}>
                Unsubscribe from marketing emails anytime. Unsubscribe links in every email.
              </p>
            </div>
            <div style={{ backgroundColor: COLORS.light, padding: '16px', borderRadius: '8px' }}>
              <p style={{ margin: '0 0 12px 0', fontWeight: 600 }}>
                ✓ Right to Non-Discrimination (CCPA §1798.125)
              </p>
              <p style={{ margin: 0 }}>
                We will not discriminate against you for exercising your privacy rights.
              </p>
            </div>
          </section>

          {/* Section 6: Exercise Your Rights */}
          <section style={{ marginBottom: '36px' }}>
            <h2
              id="exercise"
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: COLORS.navy,
                margin: '0 0 12px 0',
                paddingTop: '12px',
                fontFamily: 'Cambria, serif',
              }}
            >
              6. How to Exercise Your Rights
            </h2>
            <p style={{ margin: '0 0 12px 0' }}>
              To exercise any of these rights, email us at: <strong>support@dailyagile.com</strong>
            </p>
            <p style={{ margin: '0 0 12px 0' }}>
              Please include:
            </p>
            <ul style={{ margin: '0 0 12px 0', paddingLeft: '20px' }}>
              <li>Your email address</li>
              <li>The right you wish to exercise (e.g., "request data deletion")</li>
              <li>Any supporting information</li>
            </ul>
            <p style={{ margin: '0 0 12px 0' }}>
              <strong>Response time:</strong> We will respond within 30 calendar days. If your request is complex, we may take up to 90 days.
            </p>
            <p style={{ margin: '0 0 12px 0', backgroundColor: COLORS.light, padding: '12px', borderRadius: '6px', borderLeft: `4px solid ${COLORS.orange}` }}>
              <strong>Right to Lodge Complaint:</strong> If you believe we've violated your rights, you have the right to lodge a complaint with your national data protection authority.
            </p>
          </section>

          {/* Section 7: Data Security */}
          <section style={{ marginBottom: '36px' }}>
            <h2
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: COLORS.navy,
                margin: '0 0 12px 0',
                paddingTop: '12px',
                fontFamily: 'Cambria, serif',
              }}
            >
              7. Data Security
            </h2>
            <ul style={{ margin: '0 0 12px 0', paddingLeft: '20px' }}>
              <li>All data transmitted over HTTPS (encrypted in transit)</li>
              <li>Passwords are hashed with salt (never stored in plain text)</li>
              <li>Sensitive data encrypted at rest in Supabase</li>
              <li>Access limited to authorised personnel only</li>
              <li>Regular security audits and penetration testing</li>
              <li>Incident response plan in place for data breaches</li>
            </ul>
          </section>

          {/* Section 8: Third-Party Services */}
          <section style={{ marginBottom: '36px' }}>
            <h2
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: COLORS.navy,
                margin: '0 0 12px 0',
                paddingTop: '12px',
                fontFamily: 'Cambria, serif',
              }}
            >
              8. Third-Party Services
            </h2>
            <p style={{ margin: '0 0 12px 0' }}>
              We use the following third-party services (Data Processors):
            </p>
            <ul style={{ margin: '0 0 12px 0', paddingLeft: '20px' }}>
              <li><strong>Supabase:</strong> Database hosting (PostgreSQL) — see supabase.com/privacy</li>
              <li><strong>Vercel:</strong> Web hosting & CDN — see vercel.com/privacy</li>
              <li><strong>Anthropic Claude:</strong> AI quiz generation — see anthropic.com/privacy</li>
              <li><strong>Stripe:</strong> Payment processing (if applicable) — see stripe.com/privacy</li>
            </ul>
            <p style={{ margin: '0 0 12px 0', backgroundColor: COLORS.light, padding: '12px', borderRadius: '6px' }}>
              All processors have signed Data Processing Agreements (DPAs) ensuring GDPR compliance.
            </p>
          </section>

          {/* Section 9: Contact */}
          <section style={{ marginBottom: '36px' }}>
            <h2
              id="contact"
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: COLORS.navy,
                margin: '0 0 12px 0',
                paddingTop: '12px',
                fontFamily: 'Cambria, serif',
              }}
            >
              9. Contact Us
            </h2>
            <p style={{ margin: '0 0 12px 0' }}>
              For privacy questions or to exercise your rights:
            </p>
            <ul style={{ margin: '0 0 12px 0', paddingLeft: '20px' }}>
              <li><strong>Email:</strong> support@dailyagile.com</li>
              <li><strong>Data Protection Officer:</strong> tkiran204@gmail.com</li>
              <li><strong>Mailing Address:</strong> DailyAgile, [Address TBD]</li>
            </ul>
            <p style={{ margin: '0 0 12px 0' }}>
              We will acknowledge receipt of your request within 2 business days.
            </p>
          </section>

          {/* Final Note */}
          <div
            style={{
              backgroundColor: COLORS.light,
              padding: '16px',
              borderRadius: '8px',
              borderLeft: `4px solid ${COLORS.teal}`,
              marginTop: '36px',
            }}
          >
            <p style={{ margin: 0, fontSize: '13px', color: COLORS.gray }}>
              This Privacy Policy is governed by GDPR (EU 2016/679) and CCPA (California Consumer Privacy Act). If there is a conflict between this policy and applicable law, the law prevails.
            </p>
          </div>
        </div>

        {/* Footer CTA */}
        <div
          style={{
            marginTop: '48px',
            padding: '24px',
            backgroundColor: COLORS.light,
            borderRadius: '8px',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: '0 0 12px 0', fontSize: '14px', fontFamily: 'Calibri, sans-serif', color: COLORS.darkGray }}>
            Ready to start learning?
          </p>
          <Link
            href="/auth/signup"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: COLORS.teal,
              color: COLORS.white,
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: 600,
              fontFamily: 'Calibri, sans-serif',
              transition: 'background-color 150ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#0677A1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = COLORS.teal;
            }}
          >
            Sign Up Now
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: `1px solid ${COLORS.border}`,
          padding: '24px',
          backgroundColor: COLORS.light,
          textAlign: 'center',
          fontSize: '12px',
          color: COLORS.gray,
          fontFamily: 'Calibri, sans-serif',
          marginTop: '48px',
        }}
      >
        <p style={{ margin: '0 0 8px 0' }}>
          © 2026 DailyAgile. All rights reserved.
        </p>
        <p style={{ margin: 0 }}>
          <Link href="/" style={{ color: COLORS.teal, textDecoration: 'none', marginRight: '16px' }}>
            Home
          </Link>
          <Link href="/legal/privacy-policy" style={{ color: COLORS.teal, textDecoration: 'none' }}>
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
