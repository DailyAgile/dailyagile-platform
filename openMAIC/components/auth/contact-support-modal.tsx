'use client';

import { useState } from 'react';
import { motion } from 'motion/react';

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  darkGray: '#1E293B',
  border: '#E2E8F0',
  white: '#FFFFFF',
};

interface ContactSupportModalProps {
  onClose: () => void;
}

export function ContactSupportModal({ onClose }: ContactSupportModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !subject || !message) {
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, role, company, phone, subject, message }),
      });

      if (response.ok) {
        setSubmitStatus('success');
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Contact form error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 9999,
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: BRAND_COLORS.white,
          borderRadius: '12px',
          boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)',
          maxWidth: '500px',
          width: '100%',
          padding: '32px',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: BRAND_COLORS.navy, margin: 0 }}>
            Contact Support
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '32px',
              color: BRAND_COLORS.gray,
              cursor: 'pointer',
              padding: 0,
              lineHeight: 1,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = BRAND_COLORS.navy)}
            onMouseLeave={(e) => (e.currentTarget.style.color = BRAND_COLORS.gray)}
          >
            ×
          </button>
        </div>

        {submitStatus === 'success' ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <p style={{ fontSize: '18px', fontWeight: '600', color: BRAND_COLORS.navy, margin: '0 0 8px 0' }}>
              Thank you for contacting us!
            </p>
            <p style={{ fontSize: '14px', color: BRAND_COLORS.gray, margin: 0 }}>
              We'll get back to you within 24 hours.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Name Field */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: BRAND_COLORS.navy, marginBottom: '6px' }}>
                Full Name <span style={{ color: BRAND_COLORS.orange }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: `1px solid ${BRAND_COLORS.border}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.teal)}
                onBlur={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.border)}
                disabled={isSubmitting}
                required
              />
            </div>

            {/* Email Field */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: BRAND_COLORS.navy, marginBottom: '6px' }}>
                Email Address <span style={{ color: BRAND_COLORS.orange }}>*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: `1px solid ${BRAND_COLORS.border}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.teal)}
                onBlur={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.border)}
                disabled={isSubmitting}
                required
              />
            </div>

            {/* Role Field (Optional) */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: BRAND_COLORS.navy, marginBottom: '6px' }}>
                Role <span style={{ fontSize: '12px', color: BRAND_COLORS.gray }}>(Optional)</span>
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g., Product Manager, Developer"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: `1px solid ${BRAND_COLORS.border}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.teal)}
                onBlur={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.border)}
                disabled={isSubmitting}
              />
            </div>

            {/* Company Field (Optional) */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: BRAND_COLORS.navy, marginBottom: '6px' }}>
                Company <span style={{ fontSize: '12px', color: BRAND_COLORS.gray }}>(Optional)</span>
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Your company name"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: `1px solid ${BRAND_COLORS.border}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.teal)}
                onBlur={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.border)}
                disabled={isSubmitting}
              />
            </div>

            {/* Phone Field (Optional) */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: BRAND_COLORS.navy, marginBottom: '6px' }}>
                Phone <span style={{ fontSize: '12px', color: BRAND_COLORS.gray }}>(Optional)</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: `1px solid ${BRAND_COLORS.border}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.teal)}
                onBlur={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.border)}
                disabled={isSubmitting}
              />
            </div>

            {/* Subject Field */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: BRAND_COLORS.navy, marginBottom: '6px' }}>
                Subject <span style={{ color: BRAND_COLORS.orange }}>*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="How can we help?"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: `1px solid ${BRAND_COLORS.border}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.teal)}
                onBlur={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.border)}
                disabled={isSubmitting}
                required
              />
            </div>

            {/* Message Field */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: BRAND_COLORS.navy, marginBottom: '6px' }}>
                Message <span style={{ color: BRAND_COLORS.orange }}>*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us more about your issue..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: `1px solid ${BRAND_COLORS.border}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s',
                  resize: 'none',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.teal)}
                onBlur={(e) => (e.currentTarget.style.borderColor = BRAND_COLORS.border)}
                disabled={isSubmitting}
                required
              />
            </div>

            {submitStatus === 'error' && (
              <div
                style={{
                  backgroundColor: '#FEE2E2',
                  border: `1px solid #FECACA`,
                  color: '#DC2626',
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              >
                Please fill in all required fields or try again later.
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: `1px solid ${BRAND_COLORS.border}`,
                  borderRadius: '8px',
                  color: BRAND_COLORS.darkGray,
                  fontWeight: '600',
                  fontSize: '14px',
                  background: BRAND_COLORS.white,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = BRAND_COLORS.light)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = BRAND_COLORS.white)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  backgroundColor: BRAND_COLORS.orange,
                  color: BRAND_COLORS.white,
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  opacity: isSubmitting ? 0.7 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.backgroundColor = '#D94903';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = BRAND_COLORS.orange;
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}
