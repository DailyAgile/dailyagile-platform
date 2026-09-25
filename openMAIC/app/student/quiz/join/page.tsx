'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function QuizJoinPage() {
  const router = useRouter();
  const [quizCode, setQuizCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Validate code format (8 characters)
      if (!quizCode || quizCode.length !== 8) {
        setError('Quiz code must be 8 characters');
        setIsLoading(false);
        return;
      }

      // Check if quiz exists
      const response = await fetch(`/api/quizzes/by-code/${quizCode}`);
      if (!response.ok) {
        setError('Quiz code not found. Please check and try again.');
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      if (!data.quiz_id) {
        setError('Invalid quiz code');
        setIsLoading(false);
        return;
      }

      // Redirect to quiz practice mode
      router.push(`/student/quiz/${data.quiz_id}/practice`);
    } catch (err) {
      setError('Failed to join quiz. Please try again.');
      console.error(err);
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1E3A5F 0%, #0891B2 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '40px',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{
            color: '#1E3A5F',
            fontSize: '28px',
            fontWeight: 'bold',
            margin: '0 0 10px 0'
          }}>DailyAgile</h1>
          <p style={{
            color: '#64748B',
            fontSize: '14px',
            margin: '0'
          }}>Accelerate Business Agility</p>
        </div>

        {/* Heading */}
        <h2 style={{
          color: '#1E3A5F',
          fontSize: '24px',
          fontWeight: '600',
          margin: '0 0 10px 0'
        }}>Join a Quiz</h2>

        <p style={{
          color: '#64748B',
          fontSize: '14px',
          margin: '0 0 30px 0'
        }}>Enter the 8-digit quiz code from your instructor</p>

        {/* Form */}
        <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {/* Code Input */}
          <div>
            <label style={{
              display: 'block',
              color: '#1E293B',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '8px'
            }}>Quiz Code</label>
            <input
              type="text"
              value={quizCode.toUpperCase()}
              onChange={(e) => setQuizCode(e.target.value.toUpperCase().slice(0, 8))}
              placeholder="e.g. A1B2C3D4"
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '2px solid #E2E8F0',
                borderRadius: '8px',
                fontSize: '16px',
                fontFamily: 'monospace',
                boxSizing: 'border-box',
                transition: 'all 0.2s'
              }}
              maxLength={8}
              disabled={isLoading}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              background: '#FEE2E2',
              border: '1px solid #FECACA',
              borderRadius: '8px',
              padding: '12px',
              color: '#DC2626',
              fontSize: '14px'
            }}>
              ❌ {error}
            </div>
          )}

          {/* Join Button */}
          <button
            type="submit"
            disabled={isLoading || !quizCode}
            style={{
              background: '#0891B2',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isLoading || !quizCode ? 'not-allowed' : 'pointer',
              opacity: isLoading || !quizCode ? 0.5 : 1,
              transition: 'all 0.2s'
            }}
          >
            {isLoading ? '⏳ Joining...' : '→ Join Quiz'}
          </button>
        </form>

        {/* Help Text */}
        <div style={{
          marginTop: '20px',
          padding: '15px',
          background: '#F0F7FA',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#64748B',
          lineHeight: '1.6'
        }}>
          <strong style={{ color: '#1E3A5F' }}>Need help?</strong>
          <br />Ask your instructor for the 8-digit quiz code. It should be displayed in your email or shared in class.
        </div>
      </div>
    </div>
  );
}
