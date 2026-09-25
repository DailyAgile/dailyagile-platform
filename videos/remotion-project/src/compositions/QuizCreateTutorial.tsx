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
 * VIDEO 1: "How to Create a Quiz" (60 seconds, 1080p)
 *
 * Script (62 words, ~30 seconds):
 * "Creating a quiz in DailyAgile is simple. Click 'Create Quiz' from your dashboard.
 * Add a title and description. Then add your questions one by one—choose between
 * multiple choice, essay, or code challenges. Set the quiz difficulty and time limit.
 * Review your questions and click Save. Your quiz is now ready to assign to students."
 *
 * Visual sequence:
 * 1. DailyAgile branding + title (0-90 frames, 0-3 sec)
 * 2. Show dashboard with "Create Quiz" button (90-450 frames, 3-15 sec)
 * 3. Form fills with sample data (450-900 frames, 15-30 sec)
 * 4. Quiz created confirmation (900-1260 frames, 30-42 sec)
 * 5. Closing text + CTA (1260-1800 frames, 42-60 sec)
 *
 * Audio: Voiceover throughout, synced to animation timing
 */
export const QuizCreateTutorial: React.FC = () => {
  const { fps } = useVideoConfig();

  // Timeline markers (assuming 30 fps, 60 seconds = 1800 frames)
  const INTRO_END = 90;
  const DASHBOARD_END = 450;
  const FORM_FILL_END = 900;
  const SUCCESS_END = 1260;
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
          backgroundColor: BRAND_COLORS.navy,
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
          How to Create a Quiz
        </h1>
        <p
          style={{
            fontSize: 36,
            color: BRAND_COLORS.teal,
            marginTop: 20,
            textAlign: 'center',
            opacity: fadeIn(Math.floor(fps * 0), 30, 30),
          }}
        >
          DailyAgile Tutorial
        </p>
      </div>

      {/* SECTION 2: Dashboard View (90-450 frames) */}
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
          alignItems: 'flex-start',
          padding: 60,
          backgroundColor: COLORS.background,
        }}
      >
        <div
          style={{
            width: '100%',
            marginBottom: 40,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2
            style={{
              fontSize: 48,
              color: BRAND_COLORS.navy,
              margin: 0,
            }}
          >
            Instructor Dashboard
          </h2>
          <button
            style={{
              backgroundColor: BRAND_COLORS.teal,
              color: 'white',
              border: 'none',
              padding: '15px 40px',
              fontSize: 18,
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 'bold',
              opacity: fadeIn(Math.floor(fps * 0), INTRO_END + 30, 30),
              transform: `scale(${scaleUp(Math.floor(fps * 0), INTRO_END + 30, 30)})`,
            }}
          >
            + Create Quiz
          </button>
        </div>

        <div
          style={{
            backgroundColor: BRAND_COLORS.light,
            borderRadius: 8,
            padding: 30,
            width: '100%',
            marginTop: 20,
            opacity: fadeIn(Math.floor(fps * 0), INTRO_END + 60, 30),
          }}
        >
          <p style={{ fontSize: 18, color: COLORS.text }}>
            Click the "Create Quiz" button to get started
          </p>
        </div>
      </div>

      {/* SECTION 3: Form Filling (450-900 frames) */}
      <div
        style={{
          opacity: fadeIn(Math.floor(fps * 0), DASHBOARD_END, 30),
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
        <h2
          style={{
            fontSize: 48,
            color: BRAND_COLORS.navy,
            margin: 0,
            marginBottom: 40,
          }}
        >
          Quiz Creation Form
        </h2>

        <div style={{ width: '100%', maxWidth: 600 }}>
          <div style={{ marginBottom: 30 }}>
            <label
              style={{
                fontSize: 18,
                color: COLORS.text,
                display: 'block',
                marginBottom: 10,
              }}
            >
              Quiz Title
            </label>
            <input
              type="text"
              placeholder="e.g., JavaScript Basics"
              style={{
                width: '100%',
                padding: 12,
                fontSize: 16,
                border: `2px solid ${BRAND_COLORS.teal}`,
                borderRadius: 6,
                opacity: fadeIn(Math.floor(fps * 0), DASHBOARD_END + 30, 30),
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
              }}
            >
              Time Limit (minutes)
            </label>
            <input
              type="number"
              placeholder="60"
              style={{
                width: '100%',
                padding: 12,
                fontSize: 16,
                border: `2px solid ${BRAND_COLORS.teal}`,
                borderRadius: 6,
                opacity: fadeIn(Math.floor(fps * 0), DASHBOARD_END + 60, 30),
              }}
              disabled
            />
          </div>

          <button
            style={{
              backgroundColor: BRAND_COLORS.orange,
              color: 'white',
              border: 'none',
              padding: '15px 40px',
              fontSize: 18,
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 'bold',
              opacity: fadeIn(Math.floor(fps * 0), DASHBOARD_END + 90, 30),
            }}
          >
            Save & Add Questions
          </button>
        </div>
      </div>

      {/* SECTION 4: Success Confirmation (900-1260 frames) */}
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
          backgroundColor: BRAND_COLORS.navy,
        }}
      >
        <div
          style={{
            fontSize: 120,
            marginBottom: 30,
            opacity: scaleUp(Math.floor(fps * 0), FORM_FILL_END, 40),
          }}
        >
          ✓
        </div>
        <h2
          style={{
            fontSize: 60,
            color: BRAND_COLORS.teal,
            textAlign: 'center',
            margin: 0,
            marginBottom: 20,
          }}
        >
          Quiz Created!
        </h2>
        <p
          style={{
            fontSize: 28,
            color: COLORS.background,
            textAlign: 'center',
            marginBottom: 30,
          }}
        >
          Your quiz code: AB12CD
        </p>
        <p
          style={{
            fontSize: 24,
            color: BRAND_COLORS.teal,
            textAlign: 'center',
          }}
        >
          Ready to assign to students
        </p>
      </div>

      {/* SECTION 5: Closing (1260-1800 frames) */}
      <div
        style={{
          opacity: fadeIn(Math.floor(fps * 0), SUCCESS_END, 30),
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
        <h2
          style={{
            fontSize: 56,
            color: BRAND_COLORS.navy,
            textAlign: 'center',
            marginBottom: 30,
          }}
        >
          That's it!
        </h2>
        <p
          style={{
            fontSize: 32,
            color: COLORS.text,
            textAlign: 'center',
            marginBottom: 40,
            maxWidth: 800,
          }}
        >
          You've successfully created your first quiz. Next step: assign it to your students.
        </p>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 24,
            color: BRAND_COLORS.teal,
          }}
        >
          <span>Visit the help center for more tutorials</span>
        </div>
      </div>
    </div>
  );
};
