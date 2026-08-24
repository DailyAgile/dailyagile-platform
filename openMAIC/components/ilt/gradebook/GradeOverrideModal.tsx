'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { QuizAnswer, QuizSubmission } from '@/lib/ilt/types/models';

interface GradeOverrideModalProps {
  open: boolean;
  submission: QuizSubmission | null;
  answer: QuizAnswer | null;
  onSave: (override: GradeOverrideRequest) => Promise<void>;
  onOpenChange: (open: boolean) => void;
}

export interface GradeOverrideRequest {
  question_id: string;
  instructor_score?: number;
  instructor_feedback?: string;
  reason_for_change?: 'grading_error' | 'rubric_clarification' | 'regrade_student_appeal' | 'other';
}

export function GradeOverrideModal({
  open,
  submission,
  answer,
  onSave,
  onOpenChange,
}: GradeOverrideModalProps) {
  const [mode, setMode] = useState<'accept' | 'override'>('accept');
  const [overrideScore, setOverrideScore] = useState(answer?.ai_score ?? 0);
  const [feedback, setFeedback] = useState('');
  const [reason, setReason] = useState<'grading_error' | 'rubric_clarification' | 'regrade_student_appeal' | 'other'>('grading_error');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!submission || !answer) {
    return null;
  }

  const handleSave = async () => {
    try {
      setError(null);
      setIsSaving(true);

      await onSave({
        question_id: answer.question_id,
        instructor_score: mode === 'override' ? overrideScore : undefined,
        instructor_feedback: feedback || undefined,
        reason_for_change: reason,
      });

      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save grade override');
    } finally {
      setIsSaving(false);
    }
  };

  const maxScore = answer.max_points || 100;
  const currentScore = answer.ai_score ?? answer.points_earned ?? 0;
  const scorePercentage = Math.round((currentScore / maxScore) * 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Review & Grade: {answer.question_text?.substring(0, 60)}...</DialogTitle>
        </DialogHeader>

        {/* Question & AI Grade Display */}
        <div className="space-y-4">
          <div className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-900">
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">Question Type</div>
            <div className="capitalize text-sm font-medium mt-1">{answer.question_type}</div>

            <div className="mt-4">
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">AI Grade</div>
              <div className="flex items-baseline gap-2 mt-1">
                <div className="text-3xl font-bold text-blue-600">{currentScore}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">/ {maxScore}</div>
                <div className="text-sm font-medium text-blue-600 ml-auto">({scorePercentage}%)</div>
              </div>
            </div>

            {answer.ai_feedback && (
              <div className="mt-4">
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">AI Feedback</div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 whitespace-pre-wrap">
                  {answer.ai_feedback}
                </p>
              </div>
            )}

            {answer.user_answer && (
              <div className="mt-4">
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">Student Answer</div>
                <div className="mt-2 p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono">
                    {answer.user_answer.substring(0, 500)}
                    {answer.user_answer.length > 500 ? '...' : ''}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Grade Accept/Override Toggle */}
          <div className="space-y-4">
            <fieldset className="border rounded-lg p-4">
              <legend className="text-sm font-semibold mb-3">Grade Decision</legend>
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    value="accept"
                    checked={mode === 'accept'}
                    onChange={(e) => setMode(e.target.value as 'accept')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Accept AI grade</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    value="override"
                    checked={mode === 'override'}
                    onChange={(e) => setMode(e.target.value as 'override')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Override with my assessment</span>
                </label>
              </div>
            </fieldset>

            {mode === 'override' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold block mb-2">Override Score</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        max={maxScore}
                        value={overrideScore}
                        onChange={(e) => setOverrideScore(Math.min(maxScore, Math.max(0, Number(e.target.value))))}
                        className="flex-1 border rounded px-3 py-2 text-sm"
                      />
                      <div className="text-sm text-slate-600 dark:text-slate-400 flex items-center">/ {maxScore}</div>
                    </div>
                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      {Math.round((overrideScore / maxScore) * 100)}%
                    </div>
                  </div>

                  <div>
                    <label htmlFor="reason" className="text-sm font-semibold block mb-2">
                      Reason for Change
                    </label>
                    <select
                      id="reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value as any)}
                      className="w-full border rounded px-3 py-2 text-sm"
                    >
                      <option value="grading_error">Grading error</option>
                      <option value="rubric_clarification">Rubric clarification</option>
                      <option value="regrade_student_appeal">Student appeal/regrade</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="feedback" className="text-sm font-semibold block mb-2">
                    Feedback to Student
                  </label>
                  <textarea
                    id="feedback"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Explain your assessment and the changes you made..."
                    className="w-full border rounded px-3 py-2 text-sm h-24 resize-none"
                  />
                  <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    {feedback.length}/500
                  </div>
                </div>
              </>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSaving ? 'Saving...' : 'Save Override'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
