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
 * VIDEO 2: "How to Take a Quiz" (60 seconds, 1080p)
 *
 * Script (61 words, ~30 seconds):
 * "Taking a quiz is easy. When you receive an assignment, open the link or enter
 * the access code. Read each question carefully. Choose your answers or write your
 * response. For code challenges, write clean code that demonstrates the concept.
 * Submit when ready. You'll immediately see your score and feedback. If you need more
 * time, request an extension from your instructor."
 *
 * Visual sequence:
 * 1. DailyAgile branding + title (0-90 frames, 0-3 sec)
 * 2. Show email with assignment code (90-450 frames, 3-15 sec)
 * 3. Enter code → quiz loads (450-900 frames, 15-30 sec)
 * 4. Answer question + submit (900-1350 frames, 30-45 sec)
 * 5. Score display + closing (1350-1800 frames, 45-60 sec)
 *
 * Audio: Voiceover throughout, synced to animation timing
 */
export const QuizTakeTutorial: React.FC = () => {
  const { fps } = useVideoConfig();

  const INTRO_END = 90;
  const EMAIL_END = 450;
  const ENTER_CODE_END = 900;
  const ANSWER_END = 1350;
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
          backgroundColor: BRAND_COLORS.teal,
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
          How to Take a Quiz
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
          Student Guide
        </p>
      </div>

      {/* SECTION 2: Email Notification (90-450 frames) */}
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
          Step 1: Check Your Email
        </h2>

        <div
          style={{
            backgroundColor: BRAND_COLORS.light,
            borderRadius: 8,
            padding: 40,
            width: '100%',
            maxWidth: 700,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            opacity: fadeIn(Math.floor(fps * 0), INTRO_END + 30, 30),
          }}
        >
          <div style={{ marginBottom: 20 }}>
            <strong style={{ fontSize: 18, color: COLORS.text }}>
              From: instructor@dailyagile.com
            </strong>
          </div>
          <div style={{ marginBottom: 20 }}>
            <strong style={{ fontSize: 18, color: COLORS.text }}>
              Subject: Take Quiz: JavaScript Basics
            </strong>
          </div>
          <div
            style={{
              fontSize: 16,
              color: COLORS.text,
              lineHeight: 1.6,
              marginBottom: 20,
            }}
          >
            <p>Hi Student,</p>
            <p>A new quiz is ready for you to complete.</p>
            <p>
              <strong>Your assignment code: AB12CD</strong>
            </p>
            <p>Due: August 20, 2026 at 5:00 PM</p>
          </div>
          <div
            style={{
              backgroundColor: BRAND_COLORS.orange,
              color: 'white',
              padding: 12,
              borderRadius: 6,
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: 16,
              opacity: fadeIn(Math.floor(fps * 0), INTRO_END + 60, 30),
            }}
          >
            Visit: dailyagile.com/quiz/enter-code
          </div>
        </div>
      </div>

      {/* SECTION 3: Enter Code (450-900 frames) */}
      <div
        style={{
          opacity: fadeIn(Math.floor(fps * 0), EMAIL_END, 30),
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
            marginBottom: 40,
          }}
        >
          Step 2: Enter Your Code
        </h2>

        <div
          style={{
            backgroundColor: BRAND_COLORS.light,
            borderRadius: 8,
            padding: 60,
            maxWidth: 500,
            width: '100%',
            textAlign: 'center',
          }}
        >
          <label
            style={{
              fontSize: 20,
              color: COLORS.text,
              display: 'block',
              marginBottom: 20,
            }}
          >
            Quiz Code:
          </label>
          <input
            type="text"
            value="AB12CD"
            style={{
              width: '100%',
              padding: 20,
              fontSize: 28,
              border: `3px solid ${BRAND_COLORS.teal}`,
              borderRadius: 8,
              textAlign: 'center',
              fontWeight: 'bold',
              letterSpacing: 4,
              opacity: fadeIn(Math.floor(fps * 0), EMAIL_END + 30, 30),
              marginBottom: 30,
            }}
              disabled
            />
            <button
              style={{
                backgroundColor: BRAND_COLORS.teal,
                color: 'white',
                border: 'none',
                padding: '15px 60px',
                fontSize: 18,
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 'bold',
                opacity: fadeIn(Math.floor(fps * 0), EMAIL_END + 60, 30),
              }}
            >
              Load Quiz
            </button>
        </div>
      </div>

      {/* SECTION 4: Answer Question (900-1350 frames) */}
      <div
        style={{
          opacity: fadeIn(Math.floor(fps * 0), ENTER_CODE_END, 30),
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
          padding: 60,
          backgroundColor: COLORS.background,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            marginBottom: 40,
          }}
        >
          <h2
            style={{
              fontSize: 32,
              color: BRAND_COLORS.navy,
              margin: 0,
            }}
          >
            Question 1 of 20
          </h2>
          <div
            style={{
              fontSize: 24,
              color: BRAND_COLORS.orange,
              fontWeight: 'bold',
            }}
          >
            ⏱ 45:30
          </div>
        </div>

        <div
          style={{
            backgroundColor: BRAND_COLORS.light,
            borderRadius: 8,
            padding: 40,
            width: '100%',
            marginBottom: 30,
          }}
        >
          <h3
            style={{
              fontSize: 24,
              color: COLORS.text,
              margin: 0,
              marginBottom: 20,
            }}
          >
            What is a closure in JavaScript?
          </h3>

          <div style={{ marginTop: 20 }}>
            {[
              'A programming language',
              'A function with access to outer scope variables',
              'An error in JavaScript',
              'A deprecated feature',
            ].map((option, index) => (
              <label
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: 15,
                  cursor: 'pointer',
                  opacity:
                    fadeIn(
                      Math.floor(fps * 0),
                      ENTER_CODE_END + 30 + index * 15,
                      30
                    ) *
                    (1 - fadeOut(Math.floor(fps * 0), ANSWER_END - 30, 30)),
                }}
              >
                <input
                  type="radio"
                  name="question-1"
                  value={option}
                  style={{
                    marginRight: 15,
                    width: 20,
                    height: 20,
                    cursor: 'pointer',
                  }}
                  disabled
                />
                <span style={{ fontSize: 18, color: COLORS.text }}>
                  {option}
                </span>
              </label>
            ))}
          </div>
        </div>

        <button
          style={{
            backgroundColor: BRAND_COLORS.teal,
            color: 'white',
            border: 'none',
            padding: '15px 60px',
            fontSize: 18,
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 'bold',
            opacity: fadeIn(
              Math.floor(fps * 0),
              ENTER_CODE_END + 90,
              30
            ),
          }}
        >
          Next Question
        </button>
      </div>

      {/* SECTION 5: Results (1350-1800 frames) */}
      <div
        style={{
          opacity: fadeIn(Math.floor(fps * 0), ANSWER_END, 30),
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: BRAND_COLORS.navy,
        }}
      >
        <h2
          style={{
            fontSize: 56,
            color: COLORS.background,
            textAlign: 'center',
            margin: 0,
            marginBottom: 30,
          }}
        >
          Quiz Complete!
        </h2>

        <div
          style={{
            backgroundColor: BRAND_COLORS.teal,
            borderRadius: 12,
            padding: 40,
            textAlign: 'center',
            maxWidth: 400,
            opacity: scaleUp(Math.floor(fps * 0), ANSWER_END + 30, 40),
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 'bold',
              color: 'white',
              marginBottom: 15,
            }}
          >
            85%
          </div>
          <div
            style={{
              fontSize: 24,
              color: 'white',
              marginBottom: 20,
            }}
          >
            17 out of 20 correct
          </div>
          <div
            style={{
              fontSize: 18,
              color: BRAND_COLORS.light,
            }}
          >
            ✓ Certificate Earned
          </div>
        </div>
      </div>
    </div>
  );
};
