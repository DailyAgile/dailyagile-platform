'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import GameModeQuiz from '@/components/quiz/GameModeQuiz';

export default function QuizGameModePage() {
  const params = useParams();
  const quizCode = params.quizCode as string;
  const [quizTitle, setQuizTitle] = useState('Loading Quiz...');
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuizInfo = async () => {
      try {
        const response = await fetch(`/api/quiz/by-code/${quizCode}`);
        if (response.ok) {
          const data = await response.json();
          setQuizTitle(data.data.title || '🎮 Live Game Mode');
          setTotalQuestions(data.data.total_questions || 0);
        }
      } catch (error) {
        console.error('Error fetching quiz:', error);
        setQuizTitle('🎮 Live Game Mode');
        setTotalQuestions(0);
      } finally {
        setLoading(false);
      }
    };

    if (quizCode) {
      fetchQuizInfo();
    }
  }, [quizCode]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px', color: '#fff' }}>Loading Quiz...</div>;
  }

  return (
    <GameModeQuiz
      quizCode={quizCode}
      quizTitle={quizTitle}
      totalQuestions={totalQuestions}
      studentName="You"
    />
  );
}
