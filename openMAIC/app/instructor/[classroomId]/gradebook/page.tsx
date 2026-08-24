'use client';

/**
 * Instructor Gradebook Page
 * Display student quiz submissions with grading controls
 * Allows instructors to review AI grades and override if needed
 */

import { useState, useCallback } from 'react';
import { QuizSubmissionsTable } from '@/components/ilt/gradebook/QuizSubmissionsTable';
import { GradeOverrideModal, type GradeOverrideRequest } from '@/components/ilt/gradebook/GradeOverrideModal';
import { createLogger } from '@/lib/logger';
import type { QuizAnswer, QuizSubmission } from '@/lib/ilt/types/models';
import { toast } from '@/components/ilt/ui/Toast';

const log = createLogger('InstructorGradebook');

interface InstructorGradebookPageProps {
  params: {
    classroomId: string;
  };
}

export default function InstructorGradebookPage({
  params: { classroomId },
}: InstructorGradebookPageProps) {
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<QuizSubmission | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<QuizAnswer | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleOpenOverrideModal = useCallback(
    (submission: QuizSubmission, answer: QuizAnswer) => {
      setSelectedSubmission(submission);
      setSelectedAnswer(answer);
      setOverrideModalOpen(true);
    },
    [],
  );

  const handleSaveOverride = useCallback(
    async (override: GradeOverrideRequest) => {
      if (!selectedSubmission || !selectedAnswer) {
        return;
      }

      try {
        setIsSaving(true);
        const toastId = toast.loading('Saving grade override...');

        const response = await fetch(
          `/api/classrooms/${classroomId}/quiz-submissions/${selectedSubmission.id}/grade`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              questionId: selectedAnswer.question_id,
              instructorScore: override.instructor_score,
              instructorFeedback: override.instructor_feedback,
              reason: override.reason_for_change,
            }),
          },
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || 'Failed to save grade override');
        }

        toast.dismiss(toastId);
        toast.success('Grade override saved successfully');
        log.info(`Grade override saved for submission ${selectedSubmission.id}`);
        setOverrideModalOpen(false);

        // Refresh submissions table
        setRefreshKey((prev) => prev + 1);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save grade override';
        toast.error(message);
        log.error('Failed to save grade override:', error);
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    [classroomId, selectedSubmission, selectedAnswer],
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Gradebook</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Review student quiz submissions and override AI grades if needed
        </p>
      </div>

      {/* Quiz Submissions Table */}
      <QuizSubmissionsTable
        key={refreshKey}
        classroomId={classroomId}
        onOverrideClick={handleOpenOverrideModal}
      />

      {/* Grade Override Modal */}
      <GradeOverrideModal
        open={overrideModalOpen}
        submission={selectedSubmission}
        answer={selectedAnswer}
        onSave={handleSaveOverride}
        onOpenChange={setOverrideModalOpen}
      />
    </div>
  );
}
