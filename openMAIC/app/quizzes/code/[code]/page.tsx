/**
 * Quiz List Page - Path-based SEO-friendly routing
 * Displays quizzes for a specific instructor code
 * URL: /quizzes/code/12345678
 */

import { Metadata } from 'next';
import QuizzesByCodeClient from '@/components/quiz-navigation/QuizzesByCodeClient';

interface QuizCodePageProps {
  params: {
    code: string;
  };
}

export async function generateMetadata({ params }: QuizCodePageProps): Promise<Metadata> {
  const baseUrl = 'https://dailyagile.com';
  const code = params.code;

  return {
    title: `Quizzes - Code ${code} | DailyAgile`,
    description: `Access quizzes with instructor code ${code}. Take practice tests, mock exams, and interactive quizzes from DailyAgile.`,
    keywords: 'quizzes, practice tests, instructor code, interactive learning',
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function QuizCodePage({ params }: QuizCodePageProps) {
  // In Next.js 15, params is a Promise that needs to be awaited
  const { code } = await params;

  return (
    <>
      {/* Structured Data - JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: `Quizzes - Code ${code}`,
            description: `Interactive quizzes for instructor code ${code}`,
            url: `https://dailyagile.com/quizzes/code/${code}`,
            mainEntity: {
              '@type': 'Organization',
              name: 'DailyAgile',
              url: 'https://dailyagile.com',
              logo: 'https://dailyagile.com/logo.png',
            },
          }),
        }}
      />

      {/* Client Component */}
      <QuizzesByCodeClient code={code} />
    </>
  );
}
