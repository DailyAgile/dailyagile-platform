'use client';

/**
 * Terms of Service Page
 * CCPA and GDPR compliant
 * Accessible via /legal/terms-of-service
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

export default function TermsOfServicePage() {
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
            Terms of Service
          </h1>
          <p
            style={{
              fontSize: '14px',
              color: COLORS.gray,
              margin: 0,
              fontFamily: 'Calibri, sans-serif',
            }}
          >
            Last updated: August 24, 2026 • GDPR & CCPA compliant
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
            <li><a href="#service" style={{ color: COLORS.teal, textDecoration: 'none' }}>Service Description</a></li>
            <li><a href="#acceptance" style={{ color: COLORS.teal, textDecoration: 'none' }}>Acceptance of Terms</a></li>
            <li><a href="#account" style={{ color: COLORS.teal, textDecoration: 'none' }}>Your Account</a></li>
            <li><a href="#content" style={{ color: COLORS.teal, textDecoration: 'none' }}>User Content</a></li>
            <li><a href="#license" style={{ color: COLORS.teal, textDecoration: 'none' }}>License Grant</a></li>
            <li><a href="#restrictions" style={{ color: COLORS.teal, textDecoration: 'none' }}>Restrictions</a></li>
            <li><a href="#liability" style={{ color: COLORS.teal, textDecoration: 'none' }}>Limitation of Liability</a></li>
            <li><a href="#ccpa" style={{ color: COLORS.teal, textDecoration: 'none' }}>CCPA & Privacy Rights</a></li>
            <li><a href="#changes" style={{ color: COLORS.teal, textDecoration: 'none' }}>Changes to Terms</a></li>
            <li><a href="#contact" style={{ color: COLORS.teal, textDecoration: 'none' }}>Contact Us</a></li>
          </ul>
        </div>

        {/* Content Sections */}
        <div style={{ lineHeight: '1.8', fontFamily: 'Calibri, sans-serif', color: COLORS.darkGray, fontSize: '14px' }}>
          {/* Section 1: Service Description */}
          <section style={{ marginBottom: '36px' }}>
            <h2
              id="service"
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: COLORS.navy,
                margin: '0 0 12px 0',
                paddingTop: '12px',
                fontFamily: 'Cambria, serif',
              }}
            >
              1. Service Description
            </h2>
            <p style={{ margin: '0 0 12px 0' }}>
              DailyAgile provides an interactive online platform for learning AI and Agile skills. The platform includes:
            </p>
            <ul style={{ margin: '0 0 12px 0', paddingLeft: '20px' }}>
              <li>Interactive quiz modules with AI-powered content</li>
              <li>Progress tracking and achievement badges</li>
              <li>Leaderboards and gamification features</li>
              <li>Learning resources and course materials</li>
              <li>Student performance analytics</li>
            </ul>
            <p style={{ margin: '0 0 12px 0' }}>
              <strong>"Service"</strong> refers to our website, mobile app, APIs, and all related features and content.
            </p>
          </section>

          {/* Section 2: Acceptance */}
          <section style={{ marginBottom: '36px' }}>
            <h2
              id="acceptance"
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: COLORS.navy,
                margin: '0 0 12px 0',
                paddingTop: '12px',
                fontFamily: 'Cambria, serif',
              }}
            >
              2. Acceptance of Terms
            </h2>
            <p style={{ margin: '0 0 12px 0' }}>
              By accessing or using DailyAgile, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to any part of these terms, you may not use the Service.
            </p>
            <p style={{ margin: '0 0 12px 0' }}>
              You represent that you are at least 18 years old (or have parental/guardian consent) and have the legal capacity to enter into this agreement.
            </p>
          </section>

          {/* Section 3: Your Account */}
          <section style={{ marginBottom: '36px' }}>
            <h2
              id="account"
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: COLORS.navy,
                margin: '0 0 12px 0',
                paddingTop: '12px',
                fontFamily: 'Cambria, serif',
              }}
            >
              3. Your Account
            </h2>
            <p style={{ margin: '0 0 12px 0' }}>
              <strong>Registration:</strong> You may need to create an account to access certain features. You are responsible for:
            </p>
            <ul style={{ margin: '0 0 12px 0', paddingLeft: '20px' }}>
              <li>Maintaining the confidentiality of your password</li>
              <li>All activity under your account</li>
              <li>Notifying us of unauthorized access</li>
              <li>Keeping your account information accurate and current</li>
            </ul>
            <p style={{ margin: '0 0 12px 0' }}>
              <strong>Account Deletion:</strong> You may request deletion of your account anytime. Your personal data will be deleted within 30 days of your request, subject to legal retention requirements.
            </p>
          </section>

          {/* Section 4: User Content */}
          <section style={{ marginBottom: '36px' }}>
            <h2
              id="content"
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: COLORS.navy,
                margin: '0 0 12px 0',
                paddingTop: '12px',
                fontFamily: 'Cambria, serif',
              }}
            >
              4. User Content
            </h2>
            <p style={{ margin: '0 0 12px 0' }}>
              <strong>Your Submissions:</strong> Any content you submit (quiz answers, feedback, messages) may be used to improve the Service. We will not identify you without consent.
            </p>
            <p style={{ margin: '0 0 12px 0' }}>
              <strong>Ownership:</strong> You retain all rights to content you create. By submitting content, you grant us a non-exclusive license to use it for platform improvement and analytics.
            </p>
          </section>

          {/* Section 5: License Grant */}
          <section style={{ marginBottom: '36px' }}>
            <h2
              id="license"
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: COLORS.navy,
                margin: '0 0 12px 0',
                paddingTop: '12px',
                fontFamily: 'Cambria, serif',
              }}
            >
              5. License Grant
            </h2>
            <p style={{ margin: '0 0 12px 0' }}>
              We grant you a limited, non-exclusive, non-transferable license to access and use the Service for personal, educational purposes only. You may not:
            </p>
            <ul style={{ margin: '0 0 12px 0', paddingLeft: '20px' }}>
              <li>Reproduce, distribute, or transmit content without permission</li>
              <li>Reverse engineer or decompile the Service</li>
              <li>Remove or alter any proprietary notices</li>
              <li>Use the Service for commercial purposes without authorization</li>
              <li>Attempt to gain unauthorized access</li>
            </ul>
          </section>

          {/* Section 6: Restrictions */}
          <section style={{ marginBottom: '36px' }}>
            <h2
              id="restrictions"
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: COLORS.navy,
                margin: '0 0 12px 0',
                paddingTop: '12px',
                fontFamily: 'Cambria, serif',
              }}
            >
              6. Prohibited Uses
            </h2>
            <p style={{ margin: '0 0 12px 0' }}>
              You agree not to:
            </p>
            <ul style={{ margin: '0 0 12px 0', paddingLeft: '20px' }}>
              <li>Violate any applicable laws or regulations</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Transmit viruses, malware, or harmful code</li>
              <li>Engage in unauthorized access or hacking</li>
              <li>Spam or send unsolicited messages</li>
              <li>Impersonate other persons or entities</li>
              <li>Violate intellectual property rights</li>
            </ul>
            <p style={{ margin: '0 0 12px 0' }}>
              DailyAgile reserves the right to suspend or terminate your account for violations of these restrictions.
            </p>
          </section>

          {/* Section 7: Limitation of Liability */}
          <section style={{ marginBottom: '36px' }}>
            <h2
              id="liability"
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: COLORS.navy,
                margin: '0 0 12px 0',
                paddingTop: '12px',
                fontFamily: 'Cambria, serif',
              }}
            >
              7. Limitation of Liability
            </h2>
            <p style={{ margin: '0 0 12px 0' }}>
              <strong>DISCLAIMER:</strong> THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.
            </p>
            <p style={{ margin: '0 0 12px 0' }}>
              TO THE FULLEST EXTENT PERMITTED BY LAW, DAILYAGILE SHALL NOT BE LIABLE FOR:
            </p>
            <ul style={{ margin: '0 0 12px 0', paddingLeft: '20px' }}>
              <li>Indirect, incidental, or consequential damages</li>
              <li>Loss of data, revenue, or business opportunities</li>
              <li>Service interruptions or downtime</li>
              <li>Third-party content or actions</li>
            </ul>
            <p style={{ margin: '0 0 12px 0' }}>
              Our total liability shall not exceed the amount you paid for the Service in the last 12 months.
            </p>
          </section>

          {/* Section 8: CCPA & Privacy Rights */}
          <section style={{ marginBottom: '36px' }}>
            <h2
              id="ccpa"
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: COLORS.navy,
                margin: '0 0 12px 0',
                paddingTop: '12px',
                fontFamily: 'Cambria, serif',
              }}
            >
              8. California Consumer Privacy Act (CCPA) & Your Privacy Rights
            </h2>
            <p style={{ margin: '0 0 12px 0', backgroundColor: COLORS.light, padding: '12px', borderRadius: '6px', borderLeft: `4px solid ${COLORS.orange}` }}>
              <strong>California Residents:</strong> If you are a California resident, you have special rights under the California Consumer Privacy Act (CCPA). This section supplements our <Link href="/legal/privacy-policy" style={{ color: COLORS.teal, textDecoration: 'underline' }}>Privacy Policy</Link>.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>
                Your CCPA Rights:
              </p>
              <ul style={{ margin: '0 0 12px 0', paddingLeft: '20px' }}>
                <li><strong>Right to Know:</strong> Request what personal information we collect about you</li>
                <li><strong>Right to Delete:</strong> Request deletion of your personal information</li>
                <li><strong>Right to Correct:</strong> Request correction of inaccurate information</li>
                <li><strong>Right to Opt-Out:</strong> Opt out of sale or sharing of your data (we don't sell or share your data)</li>
                <li><strong>Right to Non-Discrimination:</strong> We cannot discriminate for exercising your rights</li>
              </ul>
            </div>

            <p style={{ margin: '0 0 12px 0' }}>
              <strong>Response Time:</strong> We will respond to your CCPA requests within 45 calendar days.
            </p>

            <p style={{ margin: '0 0 12px 0' }}>
              <strong>How to Exercise Your Rights:</strong>
            </p>
            <ul style={{ margin: '0 0 12px 0', paddingLeft: '20px' }}>
              <li>Email: <strong>support@dailyagile.com</strong> with "California Consumer Request" in the subject line</li>
              <li>Use our online CCPA forms at <strong>/api/ccpa/data-access</strong> or <strong>/api/ccpa/delete</strong></li>
              <li>Call: [Phone number TBD]</li>
            </ul>

            <p style={{ margin: '0 0 12px 0' }}>
              We will verify your identity before responding. For detailed CCPA rights information, see our <Link href="/docs/CCPA_CONSUMER_RIGHTS" style={{ color: COLORS.teal, textDecoration: 'underline' }}>CCPA Consumer Rights Notice</Link>.
            </p>

            <div style={{ backgroundColor: COLORS.light, padding: '12px', borderRadius: '6px', marginBottom: '12px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: COLORS.gray }}>
                <strong>Retention Exceptions:</strong> Some personal information may be retained longer if required by law, including audit logs (7 years), quiz records (3 years for educational compliance), and consent records.
              </p>
            </div>
          </section>

          {/* Section 9: Changes to Terms */}
          <section style={{ marginBottom: '36px' }}>
            <h2
              id="changes"
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: COLORS.navy,
                margin: '0 0 12px 0',
                paddingTop: '12px',
                fontFamily: 'Cambria, serif',
              }}
            >
              9. Changes to Terms
            </h2>
            <p style={{ margin: '0 0 12px 0' }}>
              We may update these Terms of Service at any time. Changes become effective when posted to the website. Your continued use of the Service constitutes acceptance of updated terms.
            </p>
            <p style={{ margin: '0 0 12px 0' }}>
              For material changes, we will notify you by email or prominent website notice.
            </p>
          </section>

          {/* Section 10: Governing Law */}
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
              10. Governing Law & Dispute Resolution
            </h2>
            <p style={{ margin: '0 0 12px 0' }}>
              These Terms are governed by the laws of California, without regard to its conflict of laws principles.
            </p>
            <p style={{ margin: '0 0 12px 0' }}>
              Any legal action or proceeding must be brought exclusively in state or federal courts located in California. You agree to submit to the personal jurisdiction and venue of these courts.
            </p>
          </section>

          {/* Section 11: Contact */}
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
              11. Contact Us
            </h2>
            <p style={{ margin: '0 0 12px 0' }}>
              For questions about these Terms or to exercise your rights:
            </p>
            <ul style={{ margin: '0 0 12px 0', paddingLeft: '20px' }}>
              <li><strong>Email:</strong> support@dailyagile.com</li>
              <li><strong>Data Protection Officer:</strong> tkiran204@gmail.com</li>
              <li><strong>Mailing Address:</strong> DailyAgile, [Address TBD]</li>
            </ul>
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
              These Terms of Service are governed by California law and the California Consumer Privacy Act (CCPA). If there is a conflict between these terms and applicable law, the law prevails. Last updated: August 24, 2026.
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
          <Link href="/legal/privacy-policy" style={{ color: COLORS.teal, textDecoration: 'none', marginRight: '16px' }}>
            Privacy Policy
          </Link>
          <Link href="/legal/terms-of-service" style={{ color: COLORS.teal, textDecoration: 'none' }}>
            Terms of Service
          </Link>
        </p>
      </div>
    </div>
  );
}
