'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'motion/react';
import { EmailLoginForm } from '@/components/auth/email-login-form';
import { OTPVerifyForm } from '@/components/auth/otp-verify-form';
import { ContactSupportModal } from '@/components/auth/contact-support-modal';

export default function LoginPage() {
  const router = useRouter();
  const [authStep, setAuthStep] = useState<'email' | 'otp'>('email');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [isChecking, setIsChecking] = useState(true);
  const [showContactModal, setShowContactModal] = useState(false);
  const [isInstructorLogin, setIsInstructorLogin] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const redirect = searchParams.get('redirect') || '';
    setIsInstructorLogin(redirect.includes('/teach') || redirect.includes('instructor'));
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/status');
        const data = await res.json();
        if (data.authenticated) {
          router.replace('/classroom');
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isChecking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center' }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            style={{
              width: '32px',
              height: '32px',
              border: '4px solid #0891b2',
              borderTop: '4px solid transparent',
              borderRadius: '50%',
              margin: '0 auto 12px',
            }}
          />
          <p style={{ fontSize: '14px', color: '#64748b' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated Background Elements */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        right: '-10%',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(8, 145, 178, 0.15) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-30%',
        left: '-5%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(30, 58, 95, 0.1) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none',
      }} />

      <motion.div
        style={{
          width: '100%',
          maxWidth: '480px',
          position: 'relative',
          zIndex: 10,
        }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        {/* Logo & Header */}
        <div style={{ marginBottom: '40px', textAlign: 'center' }}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            style={{ marginBottom: '24px' }}
          >
            <Link href="/" style={{ display: 'inline-block', textDecoration: 'none' }}>
              <img
                src="/assets/dailyagile_logo.png"
                alt="DailyAgile"
                style={{ height: '50px', width: 'auto', maxWidth: '100%' }}
              />
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <h1 style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#1e3a5f',
              margin: '0 0 12px 0',
              fontFamily: 'Cambria, serif',
            }}>
              {isInstructorLogin ? '👨‍🏫 Instructor' : '📚 Access'} {isInstructorLogin ? 'Portal' : 'Classroom'}
            </h1>
            <p style={{
              fontSize: '16px',
              color: '#64748b',
              margin: '0',
              lineHeight: '1.6',
            }}>
              {isInstructorLogin
                ? 'Securely manage quizzes and track student progress'
                : 'Sign in to your learning dashboard'}
            </p>
          </motion.div>
        </div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)',
            padding: '40px 32px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(8, 145, 178, 0.1)',
            marginBottom: '24px',
          }}
        >
          {authStep === 'email' ? (
            <EmailLoginForm
              onEmailSubmitted={(email) => {
                setSubmittedEmail(email);
                setAuthStep('otp');
              }}
            />
          ) : (
            <OTPVerifyForm
              email={submittedEmail}
              onSuccess={() => {
                router.replace('/classroom');
              }}
              onBackClick={() => {
                setAuthStep('email');
                setSubmittedEmail('');
              }}
              onShowContactSupport={() => setShowContactModal(true)}
            />
          )}
        </motion.div>

        {/* Footer Help Text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          style={{
            textAlign: 'center',
            fontSize: '13px',
            color: '#64748b',
            margin: '0',
            lineHeight: '1.6',
          }}
        >
          Secured with OTP verification. Your data is encrypted end-to-end.{' '}
          <button
            onClick={() => setShowContactModal(true)}
            style={{
              color: '#0891b2',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
              font: 'inherit',
              fontWeight: '500',
            }}
          >
            Need help?
          </button>
        </motion.p>
      </motion.div>

      {/* Contact Support Modal */}
      {showContactModal && (
        <ContactSupportModal onClose={() => setShowContactModal(false)} />
      )}
    </div>
  );
}
