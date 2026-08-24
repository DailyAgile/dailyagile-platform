/**
 * CSV Quiz Parser
 * Parses and validates CSV files for multiple-choice quizzes
 * Required columns: question_number, question, timer_seconds, option_a-e, correct_answer, explanation, source_link
 */

import { createLogger } from '@/lib/logger';
import { hasXSSPatterns, sanitizeText } from '@/lib/security/xss-sanitizer';

const log = createLogger('CSVQuizParser');

export interface ParsedQuestion {
  question_number: number;
  question: string;
  timer_seconds: number;
  options: {
    a: string;
    b: string;
    c: string;
    d: string;
    e: string;
  };
  correct_answer: 'A' | 'B' | 'C' | 'D' | 'E';
  explanation: string;
  source_link: string;
  points?: number; // Default 10
}

export interface ParseResult {
  success: boolean;
  total_questions: number;
  questions: ParsedQuestion[];
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  row: number;
  column: string;
  value: string;
  message: string;
}

export interface ValidationWarning {
  row: number;
  column: string;
  value: string;
  message: string;
}

/**
 * Parse CSV content and validate
 */
export function parseQuizCSV(csvContent: string): ParseResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const questions: ParsedQuestion[] = [];

  try {
    // Split into lines
    const lines = csvContent.trim().split('\n');

    if (lines.length < 2) {
      return {
        success: false,
        total_questions: 0,
        questions: [],
        errors: [
          {
            row: 0,
            column: 'file',
            value: '',
            message: 'CSV file must have at least header row and one question',
          },
        ],
        warnings: [],
      };
    }

    // Parse header
    const header = parseCSVLine(lines[0]);
    const headerValidation = validateHeader(header);

    if (!headerValidation.valid) {
      return {
        success: false,
        total_questions: 0,
        questions: [],
        errors: headerValidation.errors,
        warnings: [],
      };
    }

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const rowNumber = i + 1; // 1-indexed for user display
      const line = lines[i].trim();

      if (!line) continue; // Skip empty lines

      const values = parseCSVLine(line);
      const row = mapRowToObject(header, values);

      // Validate row
      const rowErrors = validateRow(row, rowNumber, i === 1 && questions.length === 0);
      errors.push(...rowErrors);

      if (rowErrors.length === 0) {
        // Row is valid, add to questions
        const question = rowToQuestion(row, rowNumber);
        questions.push(question);
      }
    }

    // Validate question_number sequence
    const sequenceErrors = validateQuestionSequence(questions);
    errors.push(...sequenceErrors);

    // Validate question uniqueness
    const uniqueErrors = validateQuestionUniqueness(questions);
    errors.push(...uniqueErrors);

    const result: ParseResult = {
      success: errors.length === 0,
      total_questions: questions.length,
      questions: questions.sort((a, b) => a.question_number - b.question_number),
      errors,
      warnings,
    };

    log.info(
      `CSV parse complete: ${result.total_questions} questions, ${errors.length} errors, ${warnings.length} warnings`,
    );

    return result;
  } catch (error) {
    log.error('CSV parsing failed:', error);
    return {
      success: false,
      total_questions: 0,
      questions: [],
      errors: [
        {
          row: 0,
          column: 'file',
          value: '',
          message: `CSV parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      warnings: [],
    };
  }
}

/**
 * Parse CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Add last field
  values.push(current.trim());

  return values;
}

/**
 * Validate CSV header
 */
function validateHeader(
  header: string[],
): {
  valid: boolean;
  errors: ValidationError[];
} {
  const requiredColumns = [
    'question_number',
    'question',
    'timer_seconds',
    'option_a',
    'option_b',
    'option_c',
    'option_d',
    'option_e',
    'correct_answer',
    'explanation',
    'source_link',
  ];

  const errors: ValidationError[] = [];

  // Check column count
  if (header.length < requiredColumns.length) {
    errors.push({
      row: 1,
      column: 'file',
      value: `${header.length} columns`,
      message: `CSV must have ${requiredColumns.length} columns, found ${header.length}`,
    });
    return { valid: false, errors };
  }

  // Check required columns exist
  for (const required of requiredColumns) {
    if (!header.includes(required)) {
      errors.push({
        row: 1,
        column: 'file',
        value: '',
        message: `Missing required column: "${required}"`,
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Map CSV row to object
 */
function mapRowToObject(header: string[], values: string[]): Record<string, string> {
  const obj: Record<string, string> = {};
  for (let i = 0; i < header.length && i < values.length; i++) {
    obj[header[i]] = values[i];
  }
  return obj;
}

/**
 * Validate single row
 */
function validateRow(
  row: Record<string, string>,
  rowNumber: number,
  isFirstQuestion: boolean,
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check for XSS patterns in text fields
  const textFieldsToCheck = ['question', 'option_a', 'option_b', 'option_c', 'option_d', 'option_e', 'explanation'];
  for (const field of textFieldsToCheck) {
    const value = row[field];
    if (value && hasXSSPatterns(value)) {
      log.warn(`Potential XSS pattern detected in row ${rowNumber}, field ${field}`);
      errors.push({
        row: rowNumber,
        column: field,
        value: value.substring(0, 50) + (value.length > 50 ? '...' : ''),
        message: `Potentially dangerous content detected. HTML/JavaScript not allowed in ${field}.`,
      });
    }
  }

  // question_number
  const qNum = row.question_number?.trim();
  if (!qNum) {
    errors.push({
      row: rowNumber,
      column: 'question_number',
      value: '',
      message: 'question_number is required',
    });
  } else {
    const num = parseInt(qNum);
    if (isNaN(num) || num <= 0) {
      errors.push({
        row: rowNumber,
        column: 'question_number',
        value: qNum,
        message: 'question_number must be a positive integer',
      });
    }
  }

  // question
  const question = row.question?.trim();
  if (!question) {
    errors.push({
      row: rowNumber,
      column: 'question',
      value: '',
      message: 'question is required',
    });
  } else if (question.length > 500) {
    errors.push({
      row: rowNumber,
      column: 'question',
      value: `${question.length} chars`,
      message: 'question exceeds 500 character limit',
    });
  }

  // timer_seconds
  const timer = row.timer_seconds?.trim();
  if (!timer) {
    errors.push({
      row: rowNumber,
      column: 'timer_seconds',
      value: '',
      message: 'timer_seconds is required',
    });
  } else {
    const seconds = parseInt(timer);
    if (isNaN(seconds) || seconds < 10 || seconds > 600) {
      errors.push({
        row: rowNumber,
        column: 'timer_seconds',
        value: timer,
        message: 'timer_seconds must be between 10 and 600',
      });
    }
  }

  // Options
  const optionKeys = ['option_a', 'option_b', 'option_c', 'option_d', 'option_e'];
  const options: Record<string, string> = {};

  for (const key of optionKeys) {
    const value = row[key]?.trim();
    if (!value) {
      errors.push({
        row: rowNumber,
        column: key,
        value: '',
        message: `${key} is required`,
      });
    } else {
      options[key] = value;
    }
  }

  // Check for duplicate options
  const optionValues = Object.values(options);
  const uniqueOptions = new Set(optionValues);
  if (uniqueOptions.size < optionValues.length) {
    errors.push({
      row: rowNumber,
      column: 'options',
      value: '',
      message: 'All options must be unique (no duplicates)',
    });
  }

  // correct_answer
  const correctAnswer = row.correct_answer?.trim().toUpperCase();
  if (!correctAnswer) {
    errors.push({
      row: rowNumber,
      column: 'correct_answer',
      value: '',
      message: 'correct_answer is required',
    });
  } else if (!['A', 'B', 'C', 'D', 'E'].includes(correctAnswer)) {
    errors.push({
      row: rowNumber,
      column: 'correct_answer',
      value: correctAnswer,
      message: 'correct_answer must be A, B, C, D, or E',
    });
  }

  // explanation
  const explanation = row.explanation?.trim();
  if (!explanation) {
    errors.push({
      row: rowNumber,
      column: 'explanation',
      value: '',
      message: 'explanation is required',
    });
  } else if (explanation.length > 1000) {
    errors.push({
      row: rowNumber,
      column: 'explanation',
      value: `${explanation.length} chars`,
      message: 'explanation exceeds 1000 character limit',
    });
  }

  // source_link
  const sourceLink = row.source_link?.trim();
  if (sourceLink && !isValidURL(sourceLink)) {
    errors.push({
      row: rowNumber,
      column: 'source_link',
      value: sourceLink,
      message: 'source_link must be a valid URL starting with http:// or https://',
    });
  }

  return errors;
}

/**
 * Convert row to ParsedQuestion with sanitization
 */
function rowToQuestion(row: Record<string, string>, rowNumber: number): ParsedQuestion {
  return {
    question_number: parseInt(row.question_number),
    question: sanitizeText(row.question.trim()),
    timer_seconds: parseInt(row.timer_seconds),
    options: {
      a: sanitizeText(row.option_a.trim()),
      b: sanitizeText(row.option_b.trim()),
      c: sanitizeText(row.option_c.trim()),
      d: sanitizeText(row.option_d.trim()),
      e: sanitizeText(row.option_e.trim()),
    },
    correct_answer: row.correct_answer.trim().toUpperCase() as 'A' | 'B' | 'C' | 'D' | 'E',
    explanation: sanitizeText(row.explanation.trim()),
    source_link: row.source_link?.trim() || '',
    points: 10, // Default points per question
  };
}

/**
 * Validate question number sequence
 */
function validateQuestionSequence(questions: ParsedQuestion[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const sorted = [...questions].sort((a, b) => a.question_number - b.question_number);

  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].question_number !== i + 1) {
      errors.push({
        row: sorted[i].question_number,
        column: 'question_number',
        value: sorted[i].question_number.toString(),
        message: `Questions must be numbered sequentially (1, 2, 3, ...). Found gap at position ${i + 1}`,
      });
      break; // Report only first gap
    }
  }

  return errors;
}

/**
 * Validate no duplicate question numbers
 */
function validateQuestionUniqueness(questions: ParsedQuestion[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const seenNumbers = new Set<number>();
  const seenQuestions = new Set<string>();

  for (const q of questions) {
    // Check duplicate question_number
    if (seenNumbers.has(q.question_number)) {
      errors.push({
        row: q.question_number,
        column: 'question_number',
        value: q.question_number.toString(),
        message: `Duplicate question_number: ${q.question_number}`,
      });
    }
    seenNumbers.add(q.question_number);

    // Check duplicate question text
    if (seenQuestions.has(q.question)) {
      errors.push({
        row: q.question_number,
        column: 'question',
        value: q.question,
        message: `Duplicate question text found (question already exists elsewhere in CSV)`,
      });
    }
    seenQuestions.add(q.question);
  }

  return errors;
}

/**
 * Validate URL format
 */
function isValidURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Generate CSV template content
 */
export function generateCSVTemplate(): string {
  return `question_number,question,timer_seconds,option_a,option_b,option_c,option_d,option_e,correct_answer,explanation,source_link
1,"What is artificial intelligence?",60,"Robots only","Computer systems that can perform intelligent tasks","Science fiction concept","Future technology only","Programming language",B,"AI refers to computer systems designed to perform tasks that typically require human intelligence like learning, reasoning, and decision-making.","https://en.wikipedia.org/wiki/Artificial_intelligence"
2,"Which is an example of machine learning?",90,"Chatbots answering questions","Predicting customer behavior from data","Recommending products to users","Detecting fraudulent transactions","All of the above",E,"All of these are machine learning applications that learn patterns from data to make predictions or decisions.","https://example.com/ml-examples"
3,"What does 'training' mean in machine learning?",90,"Teaching humans","Process of adjusting weights using labeled data","Making predictions","Evaluating accuracy","Testing the model",B,"Training is the process where an ML algorithm adjusts its internal parameters based on labeled data to improve accuracy.","https://example.com/training"
4,"What is the purpose of a neural network layer?",75,"Connects to internet","Processes and abstracts data","Stores information","Compresses files","Manages memory",B,"Each layer in a neural network processes input and creates increasingly abstract representations.","https://example.com/neural-networks"
5,"Name a real-world AI application:",90,"Email spam detection","Cooking recipes","Gardening tips","Video game design","Weather prediction",A,"Email spam filtering is a practical application of machine learning classification using labeled training data.","https://example.com/ai-applications"`;
}
