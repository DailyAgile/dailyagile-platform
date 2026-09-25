/**
 * Quiz Navigation Page
 * Main page for quiz discovery and management
 * Server component that generates SEO metadata and breadcrumbs
 * Client component inside handles user type detection
 */

import { Metadata } from 'next';
import QuizNavigationClient from '@/components/quiz-navigation/QuizNavigationClient';

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = 'https://dailyagile.com';

  return {
    title: 'Quizzes - DailyAgile | Practice Tests & Self-Assessment',
    description:
      'Take interactive quizzes from DailyAgile instructors or explore public quizzes. Track your progress, get instant feedback, and earn certificates on AI and Agile topics.',
    keywords: 'quizzes, practice tests, self-assessment, learning, AI, Agile, education',
    openGraph: {
      title: 'Take Quizzes - DailyAgile',
      description:
        'Practice quizzes with instant feedback and progress tracking. Access instructor quizzes or browse public tests.',
      url: `${baseUrl}/quizzes`,
      type: 'website',
      siteName: 'DailyAgile',
      images: [
        {
          url: `${baseUrl}/og-quizzes.png`,
          width: 1200,
          height: 630,
          alt: 'DailyAgile Quiz Platform',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Take Quizzes - DailyAgile',
      description:
        'Practice quizzes with instant feedback and progress tracking.',
      images: [`${baseUrl}/og-quizzes.png`],
    },
    robots: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
    alternates: {
    },
  };
}

export default function QuizzesPage() {
  return (
    <>
      {/* Structured Data - JSON-LD for search engines */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Quizzes',
            description:
              'Take interactive quizzes from DailyAgile instructors or explore public quizzes.',
            url: 'https://dailyagile.com/quizzes',
            mainEntity: {
              '@type': 'Organization',
              name: 'DailyAgile',
              url: 'https://dailyagile.com',
              logo: 'https://dailyagile.com/logo.png',
              description:
                'Accelerate Business Agility with AI and Agile courses and quizzes',
            },
            breadcrumb: {
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: 'Home',
                  item: 'https://dailyagile.com',
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: 'Quizzes',
                  item: 'https://dailyagile.com/quizzes',
                },
              ],
            },
          }),
        }}
      />

      {/* Main content - Client component handles user detection */}
      <QuizNavigationClient />
    </>
  );
}
