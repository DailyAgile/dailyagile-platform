'use client';

import { useState } from 'react';

export default function PilotSignup() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [accessToken, setAccessToken] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/pilot-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setMessage(`✅ Access granted! Redirecting to lesson...`);
        setAccessToken(data.data.access_token);

        setTimeout(() => {
          window.location.href = `/pilot-lesson?access_token=${data.data.access_token}`;
        }, 2000);
      } else {
        setStatus('error');
        setMessage(`❌ ${data.error || 'Something went wrong'}`);
      }
    } catch (error) {
      setStatus('error');
      setMessage(`❌ Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>🎓 DailyAgile Pilot</h1>
          <p style={styles.subtitle}>Free 15-minute self-paced lesson</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Your Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              style={styles.input}
              disabled={status === 'loading'}
            />
          </div>

          <button
            type="submit"
            style={{
              ...styles.button,
              opacity: status === 'loading' ? 0.7 : 1,
              cursor: status === 'loading' ? 'not-allowed' : 'pointer',
            }}
            disabled={status === 'loading'}
          >
            {status === 'loading' ? '⏳ Starting...' : '🚀 Start Free Preview'}
          </button>
        </form>

        {message && (
          <div
            style={{
              ...styles.message,
              ...(status === 'success' ? styles.messageSuccess : styles.messageError),
            }}
          >
            {message}
          </div>
        )}

        {accessToken && (
          <div style={styles.tokenDisplay}>
            <p><strong>Access Token:</strong></p>
            <code style={styles.code}>{accessToken.substring(0, 50)}...</code>
          </div>
        )}

        <div style={styles.info}>
          <h3>What You'll Get:</h3>
          <ul>
            <li>✅ 15-minute self-paced lesson</li>
            <li>✅ Interactive quiz</li>
            <li>✅ Certificate on completion</li>
            <li>✅ 90-day access window</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1E3A5F 0%, #0891B2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    padding: '40px',
    maxWidth: '500px',
    width: '100%',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '30px',
  },
  title: {
    color: '#1E3A5F',
    fontSize: '32px',
    margin: '0 0 10px 0',
  },
  subtitle: {
    color: '#64748B',
    fontSize: '16px',
    margin: '0',
  },
  form: {
    marginBottom: '30px',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    color: '#1E3A5F',
    fontWeight: '600',
    marginBottom: '8px',
    fontSize: '14px',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '16px',
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  },
  button: {
    width: '100%',
    padding: '14px',
    background: '#0891B2',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  message: {
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
  },
  messageSuccess: {
    background: '#d1fae5',
    border: '1px solid #6ee7b7',
    color: '#065f46',
  },
  messageError: {
    background: '#fee2e2',
    border: '1px solid #fca5a5',
    color: '#991b1b',
  },
  tokenDisplay: {
    background: '#f0f7fa',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '20px',
    fontSize: '12px',
  },
  code: {
    background: '#e5e7eb',
    padding: '4px 8px',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '12px',
  },
  info: {
    background: '#f0f7fa',
    padding: '20px',
    borderRadius: '8px',
    borderLeft: '4px solid #0891B2',
  },
};
