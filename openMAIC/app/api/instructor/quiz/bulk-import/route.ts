/**
 * Bulk Import Quiz from CSV
 * POST /api/instructor/quiz/bulk-import
 * Uploads CSV file and creates quiz with all questions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('BulkImport');


interface CSVRow {
  question: string;
  timer_seconds: string;
  answer_a: string;
  answer_b: string;
  answer_c: string;
  answer_d: string;
  answer_e: string;
  correct_answer: string;
  explanation: string;
  source_link: string;
}

// Simple CSV parser without external dependencies
function parseCSV(content: string): CSVRow[] {
  const lines = content.split('\n').filter((line) => line.trim());
  if (lines.length < 2) throw new Error('CSV must have header and at least one row');

  const headers = parseCSVLine(lines[0]);
  const requiredHeaders = [
    'question',
    'timer_seconds',
    'answer_a',
    'answer_b',
    'answer_c',
    'answer_d',
    'answer_e',
    'correct_answer',
    'explanation',
    'source_link',
  ];

  // Validate headers
  for (const header of requiredHeaders) {
    if (!headers.includes(header)) {
      throw new Error(`Missing required header: ${header}`);
    }
  }

  const records: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const record: any = {};

    for (let j = 0; j < headers.length; j++) {
      record[headers[j]] = values[j] || '';
    }

    records.push(record);
  }

  return records;
}

// Parse a single CSV line, handling quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

export async function POST(req: NextRequest) {
  try {
    let formData;
    try {
      formData = await req.formData();
    } catch (err) {
      log.error('FormData parsing error:', err);
      return NextResponse.json(
        { error: { message: 'Invalid form data. Please provide a CSV file.' } },
        { status: 400 }
      );
    }

    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: { message: 'No file provided' } },
        { status: 400 }
      );
    }

    log.info(`Processing CSV file: ${file.name}`);

    // Read file content
    const fileContent = await file.text();

    // Parse CSV with simple built-in parser
    let records: CSVRow[];
    try {
      records = parseCSV(fileContent);
    } catch (err) {
      log.error('CSV parse error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Invalid CSV format';
      return NextResponse.json(
        { error: { message: errorMessage } },
        { status: 400 }
      );
    }

    if (!records || records.length === 0) {
      return NextResponse.json(
        { error: { message: 'CSV file is empty' } },
        { status: 400 }
      );
    }

    log.info(`Parsed ${records.length} questions from CSV`);

    // Validate questions
    const validatedQuestions = records
      .map((row, idx) => {
        const errors: string[] = [];

        if (!row.question?.trim()) errors.push(`Q${idx + 1}: Missing question`);
        if (!row.answer_a?.trim()) errors.push(`Q${idx + 1}: Missing answer A`);
        if (!row.answer_b?.trim()) errors.push(`Q${idx + 1}: Missing answer B`);
        if (!row.answer_c?.trim()) errors.push(`Q${idx + 1}: Missing answer C`);
        if (!row.answer_d?.trim()) errors.push(`Q${idx + 1}: Missing answer D`);
        if (!row.answer_e?.trim()) errors.push(`Q${idx + 1}: Missing answer E`);
        if (!['A', 'B', 'C', 'D', 'E'].includes(row.correct_answer?.toUpperCase())) {
          errors.push(`Q${idx + 1}: Invalid correct answer (must be A-E)`);
        }

        if (errors.length > 0) {
          return { error: errors.join(', ') };
        }

        return {
          question: row.question.trim(),
          option_a: row.answer_a.trim(),
          option_b: row.answer_b.trim(),
          option_c: row.answer_c.trim(),
          option_d: row.answer_d.trim(),
          option_e: row.answer_e.trim(),
          correct_answer: row.correct_answer.toUpperCase(),
          explanation: row.explanation?.trim() || '',
          source_link: row.source_link?.trim() || '',
          timer_seconds: parseInt(row.timer_seconds) || 60,
        };
      });

    // Check for validation errors
    const validationErrors = validatedQuestions.filter((q: any) => q.error);
    if (validationErrors.length > 0) {
      const errorMessages = validationErrors.map((q: any) => q.error).join('; ');
      return NextResponse.json(
        { error: { message: `Validation errors: ${errorMessages}` } },
        { status: 400 }
      );
    }

    // Extract questions with valid data
    const questions = validatedQuestions.filter((q: any) => !q.error);

    // Generate unique 8-digit numeric quiz code (e.g., 51402382)
    const quizCode = Math.floor(10000000 + Math.random() * 90000000);

    // Default instructor/classroom
    const instructorClassroomId = 'a0000000-0000-0000-0000-000000000001';
    const instructorId = 'a0000000-0000-0000-0000-000000000001';

    // Ensure classroom exists
    await getSupabaseClient()
      .from('classrooms')
      .upsert({
        id: instructorClassroomId,
        name: 'CSV-Imported Quizzes',
        instructor_id: instructorId,
        settings: { selfPaced: true },
      }, { onConflict: 'id' });

    // Create quiz
    const { data: quiz, error: quizError } = await getSupabaseClient()
      .from('quizzes')
      .insert({
        quiz_code: quizCode,
        title: `CSV Import - ${quizCode}`,
        classroom_id: instructorClassroomId,
        instructor_id: instructorId,
        total_questions: questions.length,
        total_points: questions.length * 10,
      })
      .select()
      .single();

    if (quizError) {
      log.error('Error creating quiz:', quizError);
      return NextResponse.json(
        { error: { message: 'Failed to create quiz' } },
        { status: 500 }
      );
    }

    // Insert questions
    const questionsToInsert = questions.map((q: any, idx: number) => ({
      quiz_id: quiz.id,
      question_number: idx + 1,
      question: q.question,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      option_e: q.option_e,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      source_link: q.source_link,
      timer_seconds: q.timer_seconds,
      points: 10,
    }));

    const { error: questionsError } = await getSupabaseClient()
      .from('quiz_questions')
      .insert(questionsToInsert);

    if (questionsError) {
      log.error('Error inserting questions:', questionsError);
      await getSupabaseClient().from('quizzes').delete().eq('id', quiz.id);
      return NextResponse.json(
        { error: { message: 'Failed to create quiz questions' } },
        { status: 500 }
      );
    }

    log.info(`Quiz created from CSV: ${quiz.id} (${questions.length} questions)`);

    return NextResponse.json({
      success: true,
      data: {
        quiz_id: quiz.id,
        quiz_code: quiz.quiz_code,
        title: quiz.title,
        total_questions: questions.length,
        total_points: questions.length * 10,
      },
    });
  } catch (error) {
    log.error('Unexpected error:', error);
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
