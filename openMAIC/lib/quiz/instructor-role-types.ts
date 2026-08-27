/**
 * TypeScript types for quiz instructor roles
 */

export type InstructorRole = 'owner' | 'admin' | 'viewer';

export interface InstructorRoleRecord {
  id: string;
  quiz_id: string;
  instructor_id: string;
  role: InstructorRole;
  assigned_by: string;
  assigned_at: string;
  updated_at: string;
}

export interface QuizInstructor {
  id: string;
  email: string;
  name?: string;
  role: InstructorRole;
  assigned_at: string;
}

export interface AddAdminRequest {
  instructor_email: string;
  role?: 'admin' | 'viewer';
}

export interface AddAdminResponse {
  success: boolean;
  data: {
    message: string;
    quiz_id: string;
    instructor_id: string;
    instructor_email: string;
    role: InstructorRole;
  };
}

export interface RemoveAdminResponse {
  success: boolean;
  data: {
    message: string;
    quiz_id: string;
    instructor_id: string;
  };
}
