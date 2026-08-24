/**
 * Code Challenge Grading Queue — AI Grading Resilience
 * Handles concurrent code review requests with token budgeting, retries, and fallback scoring
 */

import { createLogger } from '@/lib/logger';
import { callLLM } from '@/lib/ai/llm';

const log = createLogger('CodeGradingQueue');

interface CodeGradingJob {
  id: string;
  question?: string;
  userCode: string;
  codeLanguage: string;
  rubric?: string;
  points: number;
  language?: string;
  retryCount: number;
  createdAt: Date;
}

interface GradingResult {
  score: number;
  comment: string;
  tokensUsed?: number;
}

const GRADING_CONFIG = {
  MAX_CONCURRENT_JOBS: 5,
  JOB_TIMEOUT_MS: 30000,
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  MAX_TOKENS_PER_REQUEST: 2000, // ~300 lines of code
  FALLBACK_SCORE: 50,
  DAILY_TOKEN_BUDGET: 100000, // ~50 code reviews at 2K tokens each
};

export class CodeGradingQueue {
  private queue: CodeGradingJob[] = [];
  private activeJobs = 0;
  private tokenUsageToday = 0;
  private lastTokenResetDate = new Date().toDateString();

  /**
   * Public entry point for grading code challenges
   * Handles queuing and concurrency management
   */
  async gradeCodeChallenge(request: {
    question: string;
    userAnswer: string;
    points: number;
    codeLanguage: string;
    rubric?: string;
    language?: string;
  }): Promise<GradingResult> {
    // Reset daily token budget if date changed
    if (new Date().toDateString() !== this.lastTokenResetDate) {
      this.tokenUsageToday = 0;
      this.lastTokenResetDate = new Date().toDateString();
    }

    // Check daily budget
    if (this.tokenUsageToday + GRADING_CONFIG.MAX_TOKENS_PER_REQUEST > GRADING_CONFIG.DAILY_TOKEN_BUDGET) {
      log.warn('[CodeGrading] Daily token budget exceeded; using fallback');
      return {
        score: GRADING_CONFIG.FALLBACK_SCORE,
        comment: 'Grading queue is at capacity. Default score given. Please try again later.',
      };
    }

    // Create job with metadata
    const job: CodeGradingJob = {
      id: `job-${Date.now()}-${Math.random()}`,
      question: request.question,
      userCode: request.userAnswer,
      codeLanguage: request.codeLanguage,
      rubric: request.rubric,
      points: request.points,
      language: request.language,
      retryCount: 0,
      createdAt: new Date(),
    };

    // Add to queue
    this.queue.push(job);
    log.info(`[CodeGrading] Job queued: ${job.id} (queue length: ${this.queue.length})`);

    // Process queue immediately if capacity available
    return this.processQueue();
  }

  private async processQueue(): Promise<GradingResult> {
    // Process all available queue slots
    while (this.queue.length > 0 && this.activeJobs < GRADING_CONFIG.MAX_CONCURRENT_JOBS) {
      const job = this.queue.shift();
      if (!job) break;

      this.activeJobs++;

      try {
        const result = await this.gradeWithRetry(job);
        this.tokenUsageToday += GRADING_CONFIG.MAX_TOKENS_PER_REQUEST; // Rough estimate
        return result;
      } catch (error) {
        log.error(`[CodeGrading] Job ${job.id} failed:`, error);
        return {
          score: GRADING_CONFIG.FALLBACK_SCORE,
          comment: `Grading failed. Default score given. Error: ${error instanceof Error ? error.message : 'unknown'}`,
        };
      } finally {
        this.activeJobs--;
      }
    }

    // Queue is full; use fallback
    return {
      score: GRADING_CONFIG.FALLBACK_SCORE,
      comment: 'Grading service is busy. Default score given. Please try again later.',
    };
  }

  private async gradeWithRetry(job: CodeGradingJob): Promise<GradingResult> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= GRADING_CONFIG.MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), GRADING_CONFIG.JOB_TIMEOUT_MS);

        // Call LLM directly for code review (avoid recursive API calls)
        const result = await this.callLLMForCodeReview(job, controller.signal);
        clearTimeout(timeout);

        log.info(`[CodeGrading] Job ${job.id} graded successfully (score: ${result.score})`);
        return {
          score: result.score,
          comment: result.comment,
          tokensUsed: GRADING_CONFIG.MAX_TOKENS_PER_REQUEST,
        };
      } catch (error) {
        lastError = error as Error;
        log.warn(
          `[CodeGrading] Attempt ${attempt + 1}/${GRADING_CONFIG.MAX_RETRIES + 1} failed for ${job.id}: ${lastError.message}`,
        );

        if (attempt < GRADING_CONFIG.MAX_RETRIES) {
          // Exponential backoff
          const delay = GRADING_CONFIG.RETRY_DELAY_MS * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All retries exhausted
    log.error(
      `[CodeGrading] All retries exhausted for job ${job.id}: ${lastError?.message || 'unknown'}`,
    );
    return {
      score: GRADING_CONFIG.FALLBACK_SCORE,
      comment: `Grading failed after ${GRADING_CONFIG.MAX_RETRIES} retries. Default score given.`,
    };
  }

  /**
   * Direct LLM call for code review (no recursive API calls)
   */
  private async callLLMForCodeReview(job: CodeGradingJob, signal?: AbortSignal): Promise<{ score: number; comment: string }> {
    const isZh = job.language === 'zh-CN';

    const systemPrompt = isZh
      ? `你是一位专业的代码审查专家。请根据给定的代码和评分标准进行评分并给出简短评语。
评估内容：正确性、逻辑、风格、最佳实践等。
必须以如下 JSON 格式回复（不要包含其他内容）：
{"score": <0到${job.points}的整数>, "comment": "<一两句评语>"}`
      : `You are a professional code reviewer. Assess the submitted code for correctness, logic, style, and best practices.
You must reply in the following JSON format only (no other content):
{"score": <integer from 0 to ${job.points}>, "comment": "<one or two sentences of feedback>"}`;

    const userPrompt = isZh
      ? `编程语言：${job.codeLanguage}
满分：${job.points}分
${job.rubric ? `评分标准：${job.rubric}\n` : ''}代码：
\`\`\`${job.codeLanguage}
${job.userCode}
\`\`\``
      : `Programming Language: ${job.codeLanguage}
Full marks: ${job.points} points
${job.rubric ? `Grading Criteria: ${job.rubric}\n` : ''}Code to Review:
\`\`\`${job.codeLanguage}
${job.userCode}
\`\`\``;

    try {
      const result = await callLLM(
        {
          model: 'claude-opus-5',
          system: systemPrompt,
          prompt: userPrompt,
        },
        'code-grade',
        undefined,
        undefined,
      );

      // Parse the LLM response as JSON
      const text = result.text.trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        score: Math.max(0, Math.min(job.points, Math.round(Number(parsed.score)))),
        comment: String(parsed.comment || ''),
      };
    } catch (error) {
      // Fallback: give partial credit
      log.warn(`[CodeGrading] LLM call failed for job ${job.id}:`, error);
      throw error; // Let retry handler deal with it
    }
  }

  /**
   * Get queue statistics for monitoring
   */
  getStats() {
    return {
      queueLength: this.queue.length,
      activeJobs: this.activeJobs,
      tokenUsageToday: this.tokenUsageToday,
      tokenBudgetRemaining: Math.max(0, GRADING_CONFIG.DAILY_TOKEN_BUDGET - this.tokenUsageToday),
      percentBudgetUsed: ((this.tokenUsageToday / GRADING_CONFIG.DAILY_TOKEN_BUDGET) * 100).toFixed(1) + '%',
      maxConcurrent: GRADING_CONFIG.MAX_CONCURRENT_JOBS,
    };
  }

  /**
   * Drain queue (for shutdown/cleanup)
   */
  async drain(): Promise<void> {
    while (this.queue.length > 0 || this.activeJobs > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    log.info('[CodeGrading] Queue drained');
  }
}

// Singleton instance
let instance: CodeGradingQueue | null = null;

export function getCodeGradingQueue(): CodeGradingQueue {
  if (!instance) {
    instance = new CodeGradingQueue();
  }
  return instance;
}
