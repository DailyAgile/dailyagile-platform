'use client';

/**
 * Add Student Form Component
 * Single student enrollment with validation
 *
 * User Experience Focus:
 * - Field-level validation feedback (red border on error)
 * - "Email already used" specific error handling
 * - Success animation (checkmark, then redirect)
 * - Keyboard shortcuts (Tab to next field, Enter to submit)
 * - Real-time validation as user types
 */

import { useState, useRef, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from '@/components/ilt/ui/Toast';

interface StudentRosterFormProps {
  classroom_id: string;
  on_success?: () => void;
  on_cancel?: () => void;
}

interface FormState {
  email: string;
  name: string;
  student_id: string;
}

interface ValidationErrors {
  email?: string;
  name?: string;
  student_id?: string;
}

export function StudentRosterForm({
  classroom_id,
  on_success,
  on_cancel,
}: StudentRosterFormProps) {
  const [formData, setFormData] = useState<FormState>({
    email: '',
    name: '',
    student_id: '',
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const formRef = useRef<HTMLFormElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Real-time validation for a single field
  const validateField = (field: keyof FormState, value: string): string | undefined => {
    switch (field) {
      case 'email':
        if (!value) {
          return 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return 'Please enter a valid email address';
        }
        break;

      case 'name':
        if (!value || value.trim().length === 0) {
          return 'Name is required';
        } else if (value.length > 255) {
          return 'Name must be 255 characters or less';
        }
        break;

      case 'student_id':
        if (value && value.length > 255) {
          return 'Student ID must be 255 characters or less';
        }
        break;
    }
    return undefined;
  };

  // Full form validation
  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    for (const field of ['email', 'name', 'student_id'] as const) {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle field blur
  const handleFieldBlur = (field: keyof FormState) => {
    setTouchedFields((prev) => new Set([...prev, field]));
    const error = validateField(field, formData[field]);
    setErrors((prev) => ({
      ...prev,
      [field]: error,
    }));
  };

  // Handle field change
  const handleFieldChange = (field: keyof FormState, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error if field was touched
    if (touchedFields.has(field)) {
      const error = validateField(field, value);
      setErrors((prev) => ({
        ...prev,
        [field]: error,
      }));
    }

    // Clear submit error
    setSubmitError(null);
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors below');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const toastId = toast.loading(`Adding ${formData.name}...`);

      const response = await fetch(`/api/classrooms/${classroom_id}/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
          student_id: formData.student_id || undefined,
        }),
      });

      toast.dismiss(toastId);

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error?.message || 'Failed to add student';

        if (response.status === 409) {
          // Email already exists
          setErrors({ email: 'Email already enrolled in this classroom' });
          toast.error('Email already exists - This student is already in the roster.');
        } else {
          setSubmitError(errorMessage);
          toast.error(`Failed to add student: ${errorMessage}`);
        }
        return;
      }

      // Success!
      setIsSuccess(true);
      toast.success('Student added!', `${formData.name} has been enrolled.`);

      // Reset form
      setFormData({ email: '', name: '', student_id: '' });
      setErrors({});
      setTouchedFields(new Set());

      // Call success callback after delay
      setTimeout(() => {
        on_success?.();
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setSubmitError(message);
      toast.error('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Focus on name field on mount
  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  if (isSuccess) {
    return (
      <div className="rounded-lg border border-teal-200 bg-teal-50 p-6 animate-in fade-in duration-500">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100">
            <CheckCircle2 className="h-6 w-6 text-teal-600 animate-bounce" />
          </div>
          <div>
            <h3 className="font-semibold text-teal-900">Student added successfully!</h3>
            <p className="text-sm text-teal-700">
              {formData.name} has been enrolled in the classroom.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const hasFieldError = (field: keyof FormState): boolean => {
    return touchedFields.has(field) && !!errors[field];
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6"
    >
      <h3 className="text-lg font-semibold text-zinc-900">Add Student to Classroom</h3>

      {/* Error Message */}
      {submitError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">Error adding student</p>
              <p className="text-sm text-red-700 mt-1">{submitError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Email Field */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
          Email Address *
        </label>
        <div className="relative mt-1">
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => handleFieldChange('email', e.target.value)}
            onBlur={() => handleFieldBlur('email')}
            placeholder="student@example.com"
            aria-label="Email address"
            aria-invalid={hasFieldError('email')}
            aria-describedby={hasFieldError('email') ? 'email-error' : undefined}
            className={`w-full rounded-lg border ${
              hasFieldError('email')
                ? 'border-red-300 focus:ring-red-500'
                : 'border-zinc-300 focus:ring-teal-500'
            } bg-white px-4 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 transition-colors`}
          />
          {!hasFieldError('email') && formData.email && (
            <CheckCircle2 className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-teal-600" />
          )}
        </div>
        {hasFieldError('email') && (
          <p id="email-error" className="mt-1 text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {errors.email}
          </p>
        )}
      </div>

      {/* Name Field */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-zinc-700">
          Full Name *
        </label>
        <div className="relative mt-1">
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            onBlur={() => handleFieldBlur('name')}
            placeholder="John Doe"
            aria-label="Full name"
            aria-invalid={hasFieldError('name')}
            aria-describedby={hasFieldError('name') ? 'name-error' : undefined}
            className={`w-full rounded-lg border ${
              hasFieldError('name')
                ? 'border-red-300 focus:ring-red-500'
                : 'border-zinc-300 focus:ring-teal-500'
            } bg-white px-4 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 transition-colors`}
          />
          {!hasFieldError('name') && formData.name && (
            <CheckCircle2 className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-teal-600" />
          )}
        </div>
        {hasFieldError('name') && (
          <p id="name-error" className="mt-1 text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {errors.name}
          </p>
        )}
      </div>

      {/* Student ID Field (Optional) */}
      <div>
        <label htmlFor="student_id" className="block text-sm font-medium text-zinc-700">
          Student ID (Optional)
        </label>
        <div className="relative mt-1">
          <input
            type="text"
            id="student_id"
            value={formData.student_id}
            onChange={(e) => handleFieldChange('student_id', e.target.value)}
            onBlur={() => handleFieldBlur('student_id')}
            placeholder="STU-001234"
            aria-label="Student ID"
            aria-invalid={hasFieldError('student_id')}
            aria-describedby={hasFieldError('student_id') ? 'student_id-error' : undefined}
            className={`w-full rounded-lg border ${
              hasFieldError('student_id')
                ? 'border-red-300 focus:ring-red-500'
                : 'border-zinc-300 focus:ring-teal-500'
            } bg-white px-4 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 transition-colors`}
          />
        </div>
        {hasFieldError('student_id') && (
          <p id="student_id-error" className="mt-1 text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {errors.student_id}
          </p>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isSubmitting || !formData.email || !formData.name}
          aria-label="Add student to classroom"
          className="flex items-center gap-2 flex-1 justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Add Student
            </>
          )}
        </button>
        <button
          type="button"
          onClick={on_cancel}
          aria-label="Cancel adding student"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
        >
          Cancel
        </button>
      </div>

      <p className="text-xs text-zinc-500">
        💡 An enrollment invite email will be sent to the student when they're added.
      </p>
    </form>
  );
}
