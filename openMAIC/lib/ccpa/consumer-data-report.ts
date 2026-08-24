/**
 * CCPA California Consumer Data Report Generator
 *
 * Generates a California Consumer Privacy Act (CCPA §1798.100) compliant
 * data access report showing:
 * - Personal information collected
 * - Categories of personal information
 * - Sources of the information
 * - Business purposes for collection
 * - Third parties the information is shared with
 * - Data retention periods
 */

interface StudentRecord {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  student_profiles?: any;
  student_quiz_history?: any[];
  student_progress?: any;
  student_consents?: any[];
  marketing_preferences?: any;
  student_badges?: any[];
  student_streaks?: any[];
}

interface CCPADataReport {
  request_date: string;
  consumer_email: string;
  report_title: string;

  // Section 1: Personal Information Collected
  personal_information_collected: {
    contact_information: string[];
    account_information: string[];
    authentication_data: string[];
    profile_data: string[];
    learning_data: string[];
    technical_data: string[];
    usage_data: string[];
    preference_data: string[];
  };

  // Section 2: Categories of Personal Information (CCPA Definitions)
  categories_of_personal_information: {
    identifiers: {
      collected: boolean;
      examples: string[];
      retention_period: string;
    };
    commercial_information: {
      collected: boolean;
      examples: string[];
      retention_period: string;
    };
    biometric_information: {
      collected: boolean;
      examples: string[];
      retention_period: string;
    };
    internet_activity: {
      collected: boolean;
      examples: string[];
      retention_period: string;
    };
    geolocation_data: {
      collected: boolean;
      examples: string[];
      retention_period: string;
    };
    sensory_information: {
      collected: boolean;
      examples: string[];
      retention_period: string;
    };
    professional_information: {
      collected: boolean;
      examples: string[];
      retention_period: string;
    };
    education_information: {
      collected: boolean;
      examples: string[];
      retention_period: string;
    };
    inferred_information: {
      collected: boolean;
      examples: string[];
      retention_period: string;
    };
  };

  // Section 3: Sources of Personal Information
  sources_of_information: {
    directly_from_consumer: string[];
    automatically_collected: string[];
    third_party_sources: string[];
  };

  // Section 4: Business Purposes for Collection
  business_purposes: string[];

  // Section 5: Third Parties Shared With
  third_parties_shared_with: {
    service_providers: string[];
    business_partners: string[];
    legal_entities: string;
  };

  // Section 6: Consumer Activity Data
  consumer_activity: {
    account_created_date: string;
    last_login_date?: string;
    total_quizzes_attempted: number;
    total_badges_earned: number;
    current_streak_days: number;
    average_quiz_score: number | null;
    account_status: string;
  };

  // Section 7: Retention Periods
  retention_periods: {
    [key: string]: string;
  };

  // Section 8: Consumer Rights
  consumer_rights: {
    right_to_access: string;
    right_to_deletion: string;
    right_to_opt_out: string;
    right_to_non_discrimination: string;
    how_to_exercise: string;
  };

  // Section 9: Verification & Legal
  verification_information: {
    request_received_date: string;
    verification_method: string;
    data_source: string;
    legal_basis: string;
    ccpa_section: string;
  };
}

/**
 * Generate CCPA California Consumer Data Report
 * Complies with CCPA §1798.100 (Right to Know)
 */
export async function generateCCPADataReport(
  student: StudentRecord,
  supabase: any
): Promise<CCPADataReport> {
  // Calculate derived statistics
  const quizHistory = student.student_quiz_history || [];
  const badges = student.student_badges || [];
  const streaks = student.student_streaks || [];
  const progress = student.student_progress;

  const totalQuizzes = quizHistory.length;
  const totalBadges = badges.length;
  const currentStreak = streaks.length > 0 ? streaks[0]?.days || 0 : 0;
  const averageScore =
    totalQuizzes > 0
      ? quizHistory.reduce((sum: number, q: any) => sum + (q.score || 0), 0) / totalQuizzes
      : null;

  const report: CCPADataReport = {
    request_date: new Date().toISOString(),
    consumer_email: student.email,
    report_title: 'California Consumer Privacy Act (CCPA) Data Access Report',

    // ========================================================================
    // SECTION 1: Personal Information Collected
    // ========================================================================
    personal_information_collected: {
      contact_information: [
        'Email address (primary identifier)',
        'Associated phone number (if provided)',
      ],
      account_information: [
        'DailyAgile account ID',
        'Account creation date',
        'Account status (active/inactive)',
        'Last login date/time',
        'Account modification history',
      ],
      authentication_data: [
        'Password hash (never stored in plain text)',
        'Two-factor authentication (2FA) enabled status',
        'Login history and timestamps',
        'Failed login attempts',
      ],
      profile_data: [
        `First name: ${student.first_name || 'not provided'}`,
        `Last name: ${student.last_name || 'not provided'}`,
        'Profile avatar/image (if uploaded)',
        'Bio/about me text',
        'Timezone preference',
        'Language preference',
        'Display name',
      ],
      learning_data: [
        `Total quizzes attempted: ${totalQuizzes}`,
        'Quiz responses and answers',
        'Quiz scores and percentages',
        'Time spent per quiz',
        'Pass/fail status per quiz',
        'Learning progress by module',
        'Course completion status',
        'Estimated time to completion',
      ],
      technical_data: [
        'IP address(es) used to access platform',
        'Browser type and version',
        'Operating system',
        'Device type (desktop/mobile/tablet)',
        'Device identifiers',
        'Referring website/URL',
      ],
      usage_data: [
        'Pages visited and timestamps',
        'Features used',
        'Session duration',
        'Interaction timestamps',
        'Clicks and navigation patterns',
        'Video playback progress',
        'Time spent per page',
      ],
      preference_data: [
        'Email marketing opt-in/out status',
        'SMS marketing opt-in/out status',
        'Push notification preferences',
        'Leaderboard visibility preference',
        'Analytics tracking consent',
        'Third-party sharing consent',
      ],
    },

    // ========================================================================
    // SECTION 2: Categories per CCPA §1798.100
    // ========================================================================
    categories_of_personal_information: {
      identifiers: {
        collected: true,
        examples: [
          'Email address',
          'Account ID',
          'IP addresses',
          'Cookie identifiers',
          'Device identifiers',
        ],
        retention_period: 'Until account deletion + 30 day grace period',
      },
      commercial_information: {
        collected: false,
        examples: [],
        retention_period: 'Not applicable',
      },
      biometric_information: {
        collected: false,
        examples: [],
        retention_period: 'Not applicable',
      },
      internet_activity: {
        collected: true,
        examples: [
          'Browsing history on our platform',
          'Quiz attempt records',
          'Click data',
          'Session activity',
          'Interaction logs',
        ],
        retention_period: '90 days for usage logs; 3 years for quiz records',
      },
      geolocation_data: {
        collected: false,
        examples: [],
        retention_period: 'Not applicable',
      },
      sensory_information: {
        collected: false,
        examples: [],
        retention_period: 'Not applicable',
      },
      professional_information: {
        collected: false,
        examples: [],
        retention_period: 'Not applicable',
      },
      education_information: {
        collected: true,
        examples: [
          'Quiz scores and performance',
          'Course progress',
          'Badges earned',
          'Learning achievements',
          'Time spent on modules',
        ],
        retention_period: '3 years (regulatory requirement for educational records)',
      },
      inferred_information: {
        collected: true,
        examples: [
          'Learning level (inferred from quiz scores)',
          'Topics of interest (inferred from courses taken)',
          'Learning pace (inferred from activity patterns)',
          'Preferred time to learn (inferred from login times)',
        ],
        retention_period: '90 days',
      },
    },

    // ========================================================================
    // SECTION 3: Sources of Personal Information
    // ========================================================================
    sources_of_information: {
      directly_from_consumer: [
        'Email address (during signup/login)',
        'Name (if provided in profile)',
        'Profile information (bio, avatar)',
        'Quiz responses and answers',
        'Feedback and support messages',
      ],
      automatically_collected: [
        'IP address and location data',
        'Browser and device information',
        'Cookies and tracking pixels',
        'Login and activity timestamps',
        'Usage analytics',
      ],
      third_party_sources: [
        'Payment processors (if applicable): Stripe',
        'Cloud hosting provider: Vercel',
        'Database provider: Supabase',
        'Email service provider: SendGrid',
        'Analytics service: Custom logging',
      ],
    },

    // ========================================================================
    // SECTION 4: Business Purposes for Collection
    // ========================================================================
    business_purposes: [
      'Providing quiz platform services and features',
      'Authenticating users and managing accounts',
      'Delivering personalized learning experiences',
      'Tracking student progress and awarding badges',
      'Generating and analyzing performance reports',
      'Ensuring platform security and preventing fraud',
      'Complying with legal and regulatory requirements',
      'Improving platform features based on user behavior',
      'Troubleshooting technical issues',
      'Sending educational content and updates',
      'Understanding user engagement patterns',
      'Maintaining audit trails for compliance',
    ],

    // ========================================================================
    // SECTION 5: Third Parties Shared With
    // ========================================================================
    third_parties_shared_with: {
      service_providers: [
        'Supabase (database hosting & authentication)',
        'Vercel (web hosting & CDN)',
        'SendGrid (email delivery)',
        'Anthropic Claude (for AI quiz generation)',
        'Stripe (payment processing, if applicable)',
      ],
      business_partners: ['None currently - all data is DailyAgile owned'],
      legal_entities:
        'Data may be disclosed to law enforcement or as required by law. DailyAgile will notify consumers where legally permissible.',
    },

    // ========================================================================
    // SECTION 6: Consumer Activity Snapshot
    // ========================================================================
    consumer_activity: {
      account_created_date: student.created_at,
      last_login_date: student.last_login_at || 'Never logged in',
      total_quizzes_attempted: totalQuizzes,
      total_badges_earned: totalBadges,
      current_streak_days: currentStreak,
      average_quiz_score: averageScore ? Math.round(averageScore * 100) / 100 : null,
      account_status: 'active',
    },

    // ========================================================================
    // SECTION 7: Data Retention Periods (CCPA Requirement)
    // ========================================================================
    retention_periods: {
      'Account & Profile Data':
        'Retained until account deletion is requested. Deleted within 30 days of deletion request.',
      'Quiz Attempts & Scores':
        '3 years from attempt date (educational regulatory requirement)',
      'Audit & Security Logs':
        '7 years from creation (legal/compliance requirement). Anonymized upon account deletion.',
      'Technical/Usage Data': '90 days (then automatically deleted)',
      'Consent Records': 'Permanently retained for CCPA/GDPR accountability (anonymized after deletion)',
      'Marketing Preferences': 'Until account deletion or preference update',
      'Two-Factor Authentication': 'Until account deletion',
      'Payment Records': 'Retained per payment processor (Stripe) terms for dispute resolution',
    },

    // ========================================================================
    // SECTION 8: Your CCPA Rights
    // ========================================================================
    consumer_rights: {
      right_to_access:
        'You have the right to request what personal information we collect, use, share, and sell. This report fulfills that right.',
      right_to_deletion:
        'You have the right to request deletion of personal information we have collected from you, subject to exceptions. We will delete within 45 days.',
      right_to_opt_out:
        'You have the right to opt out of the sale or sharing of your personal information. We do not currently sell or share your data.',
      right_to_non_discrimination:
        'We will not discriminate against you for exercising your CCPA rights. You will not receive different prices or quality of service.',
      how_to_exercise:
        'Email support@dailyagile.com or call [phone TBD]. Include "California Consumer Request" in the subject line. We will respond within 45 days.',
    },

    // ========================================================================
    // SECTION 9: Verification Information
    // ========================================================================
    verification_information: {
      request_received_date: new Date().toISOString(),
      verification_method: 'Email address match + CCPA request endpoint',
      data_source: 'DailyAgile Supabase database',
      legal_basis: 'California Consumer Privacy Act (CCPA) §1798.100 - Right to Know',
      ccpa_section: 'Cal. Code §1798.100 et seq.',
    },
  };

  return report;
}

/**
 * Generate CCPA Deletion Confirmation
 * Sent after deletion is processed
 */
export function generateCCPADeletionConfirmation(
  email: string,
  requestId: string,
  deletedAt: string
): string {
  return `
CCPA Data Deletion Confirmation
================================

Request ID: ${requestId}
Email: ${email}
Deletion Completed: ${deletedAt}

The following personal information has been deleted:
- Account profile and credentials
- Quiz attempt history and scores
- Learning progress data
- Badges and achievements
- Preferences and settings

Retained Information (per regulatory requirements):
- Anonymized audit logs (7 years, as required by law)
- Quiz records for educational compliance (3 years)
- Consent records (anonymized, for CCPA accountability)

This deletion cannot be undone. If you have questions, contact support@dailyagile.com.

For more information about your CCPA rights, see our privacy policy at:
https://dailyagile.com/legal/privacy-policy
  `.trim();
}
