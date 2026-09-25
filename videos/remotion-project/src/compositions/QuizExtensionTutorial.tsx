import React from 'react';
import { useVideoConfig } from 'remotion';
import { COLORS, BRAND_COLORS } from '../lib/brandColors';
import {
  fadeIn,
  fadeOut,
  slideInLeft,
  slideInRight,
  scaleUp,
} from '../lib/animations';

/**
 * VIDEO 3: "How to Request an Extension" (60 seconds, 1080p)
 *
 * Script (60 words, ~30 seconds):
 * "Need more time? Click 'Request Extension' on your expired assignment. Write a brief
 * reason explaining why you need more time. Submit your request. Your instructor will
 * review and either approve with a new deadline or explain why they can't extend.
 * You'll receive a notification once they respond. If approved, you'll see the new due
 * date on your assignment."
 *
 * Visual sequence:
 * 1. DailyAgile branding + title (0-90 frames, 0-3 sec)
 * 2. Show expired quiz screen (90-450 frames, 3-15 sec)
 * 3. Click "Request Extension" → form appears (450-900 frames, 15-30 sec)
 * 4. Fill form + submit (900-1350 frames, 30-45 sec)
 * 5. Confirmation message + closing (1350-1800 frames, 45-60 sec)
 *
 * Audio: Voiceover throughout, synced to animation timing
 */
export const QuizExtensionTutorial: React.FC = () => {
  const { fps } = useVideoConfig();

  const INTRO_END = 90;
  const EXPIRED_END = 450;
  const FORM_START_END = 900;
  const FORM_FILL_END = 1350;
  const CLOSING_END = 1800;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: COLORS.background,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: '"Calibri", sans-serif',
      }}
    >
      {/* SECTION 1: Introduction (0-90 frames) */}
      <div
        style={{
          opacity: fadeIn(Math.floor(fps * 0), 0, 30),
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: BRAND_COLORS.orange,
        }}
      >
        <h1
          style={{
            fontSize: 80,
            fontWeight: 'bold',
            color: COLORS.background,
            margin: 0,
            textAlign: 'center',
            transform: `translateY(${slideInLeft(Math.floor(fps * 0), 0, 40)}px)`,
          }}
        >
          Request an Extension
        </h1>
        <p
          style={{
            fontSize: 36,
            color: BRAND_COLORS.navy,
            marginTop: 20,
            textAlign: 'center',
            opacity: fadeIn(Math.floor(fps * 0), 30, 30),
          }}
        >
          Need More Time?
        </p>
      </div>

      {/* SECTION 2: Expired Quiz (90-450 frames) */}
      <div
        style={{
          opacity: fadeIn(Math.floor(fps * 0), INTRO_END, 30),
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'center',
          padding: 60,
          backgroundColor: COLORS.background,
        }}
      >
        <h2
          style={{
            fontSize: 48,
            color: BRAND_COLORS.navy,
            margin: 0,
            marginBottom: 40,
          }}
        >
          Quiz Expired
        </h2>

        <div
          style={{
            backgroundColor: '#FEE2E2',
            borderRadius: 8,
            padding: 40,
            width: '100%',
            maxWidth: 600,
            borderLeft: `6px solid ${BRAND_COLORS.orange}`,
            opacity: fadeIn(Math.floor(fps * 0), INTRO_END + 30, 30),
          }}
        >
          <div
            style={{
              fontSize: 20,
              color: BRAND_COLORS.orange,
              fontWeight: 'bold',
              marginBottom: 15,
            }}
          >
            ⚠ Time's Up
          </div>
          <p
            style={{
              fontSize: 18,
              color: COLORS.text,
              margin: '0 0 15px 0',
            }}
          >
            The due date for "JavaScript Basics" was August 20, 2026 at 5:00 PM.
          </p>
          <p
            style={{
              fontSize: 18,
              color: COLORS.text,
              margin: 0,
            }}
          >
            No problem! You can request an extension from your instructor.
          </p>
        </div>
      </div>

      {/* SECTION 3: Request Extension Button (450-900 frames) */}
      <div
        style={{
          opacity: fadeIn(Math.floor(fps * 0), EXPIRED_END, 30),
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 60,
          backgroundColor: COLORS.background,
        }}
      >
        <h2
          style={{
            fontSize: 48,
            color: BRAND_COLORS.navy,
            margin: 0,
            marginBottom: 60,
            textAlign: 'center',
          }}
        >
          Click "Request Extension"
        </h2>

        <button
          style={{
            backgroundColor: BRAND_COLORS.orange,
            color: 'white',
            border: 'none',
            padding: '20px 60px',
            fontSize: 24,
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 'bold',
            opacity: fadeIn(Math.floor(fps * 0), EXPIRED_END + 30, 30),
            transform: `scale(${scaleUp(Math.floor(fps * 0), EXPIRED_END + 30, 30)})`,
            boxShadow: '0 4px 12px rgba(234, 88, 12, 0.3)',
          }}
        >
          Request Extension
        </button>

        <p
          style={{
            fontSize: 18,
            color: COLORS.textSecondary,
            marginTop: 40,
            textAlign: 'center',
          }}
        >
          A form will appear where you can explain why you need more time
        </p>
      </div>

      {/* SECTION 4: Extension Form (900-1350 frames) */}
      <div
        style={{
          opacity: fadeIn(Math.floor(fps * 0), FORM_START_END, 30),
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'center',
          padding: 60,
          backgroundColor: COLORS.background,
        }}
      >
        <h2
          style={{
            fontSize: 48,
            color: BRAND_COLORS.navy,
            margin: 0,
            marginBottom: 40,
          }}
        >
          Extension Request Form
        </h2>

        <div
          style={{
            backgroundColor: BRAND_COLORS.light,
            borderRadius: 8,
            padding: 40,
            width: '100%',
            maxWidth: 600,
          }}
        >
          <div style={{ marginBottom: 30 }}>
            <label
              style={{
                fontSize: 18,
                color: COLORS.text,
                display: 'block',
                marginBottom: 10,
                fontWeight: 'bold',
              }}
            >
              Why do you need an extension?
            </label>
            <textarea
              placeholder="Tell your instructor why you need more time..."
              style={{
                width: '100%',
                minHeight: 100,
                padding: 12,
                fontSize: 16,
                border: `2px solid ${BRAND_COLORS.teal}`,
                borderRadius: 6,
                fontFamily: '"Calibri", sans-serif',
                opacity: fadeIn(Math.floor(fps * 0), FORM_START_END + 30, 30),
                resize: 'vertical',
              }}
              disabled
            />
          </div>

          <div style={{ marginBottom: 30 }}>
            <label
              style={{
                fontSize: 18,
                color: COLORS.text,
                display: 'block',
                marginBottom: 10,
                fontWeight: 'bold',
              }}
            >
              New Deadline
            </label>
            <input
              type="datetime-local"
              value="2026-08-22T17:00"
              style={{
                width: '100%',
                padding: 12,
                fontSize: 16,
                border: `2px solid ${BRAND_COLORS.teal}`,
                borderRadius: 6,
                opacity: fadeIn(Math.floor(fps * 0), FORM_START_END + 60, 30),
              }}
              disabled
            />
          </div>

          <button
            style={{
              width: '100%',
              backgroundColor: BRAND_COLORS.teal,
              color: 'white',
              border: 'none',
              padding: '15px 40px',
              fontSize: 18,
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 'bold',
              opacity: fadeIn(Math.floor(fps * 0), FORM_START_END + 90, 30),
            }}
          >
            Submit Request
          </button>
        </div>
      </div>

      {/* SECTION 5: Confirmation (1350-1800 frames) */}
      <div
        style={{
          opacity: fadeIn(Math.floor(fps * 0), FORM_FILL_END, 30),
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: BRAND_COLORS.light,
        }}
      >
        <div
          style={{
            fontSize: 100,
            marginBottom: 30,
            opacity: scaleUp(Math.floor(fps * 0), FORM_FILL_END, 40),
          }}
        >
          ✓
        </div>

        <h2
          style={{
            fontSize: 56,
            color: BRAND_COLORS.teal,
            textAlign: 'center',
            margin: 0,
            marginBottom: 20,
          }}
        >
          Request Sent!
        </h2>

        <p
          style={{
            fontSize: 24,
            color: COLORS.text,
            textAlign: 'center',
            marginBottom: 30,
            maxWidth: 700,
          }}
        >
          Your instructor will review your request and respond within 24 hours.
        </p>

        <div
          style={{
            backgroundColor: BRAND_COLORS.white,
            borderRadius: 8,
            padding: 30,
            maxWidth: 500,
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            opacity: fadeIn(Math.floor(fps * 0), FORM_FILL_END + 30, 30),
          }}
        >
          <p
            style={{
              fontSize: 16,
              color: COLORS.text,
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            You'll receive an email notification when your instructor responds. Check your inbox or the dashboard for updates.
          </p>
        </div>
      </div>
    </div>
  );
};
