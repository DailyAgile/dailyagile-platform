'use client';

import { useParams } from 'next/navigation';
import QuizPlayer from '@/components/quiz/QuizPlayer';

export default function QuizPracticePage() {
  const params = useParams();
  const quizCode = params.quizCode as string;

  return <QuizPlayer quizCode={quizCode} quizTitle="Practice Quiz" mode="practice" />;
}
