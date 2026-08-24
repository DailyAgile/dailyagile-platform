/**
 * Cost Tracking for AI Quiz Operations
 *
 * Monitors token usage and cost for:
 * - Question grading (essay, code, scenario)
 * - Question generation
 *
 * Helps instructors understand operational costs and manage usage
 */

import { createLogger } from '@/lib/logger';

const log = createLogger('CostTracker');

// Claude Haiku pricing (as of Aug 2024)
// Input: $0.80 per million tokens
// Output: $4.00 per million tokens
const PRICING = {
  INPUT_COST_PER_MTok: 0.80,
  OUTPUT_COST_PER_MTok: 4.00,
};

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface CostBreakdown {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  tokenCount: TokenUsage;
}

export interface GradingCostMetrics {
  operation: 'essay_grading' | 'code_grading' | 'scenario_grading' | 'question_generation';
  tokens: TokenUsage;
  cost: CostBreakdown;
  timestamp: string;
  userId?: string;
}

/**
 * Calculate cost from token usage
 */
export function calculateCost(usage: TokenUsage): CostBreakdown {
  const inputCost = (usage.inputTokens / 1_000_000) * PRICING.INPUT_COST_PER_MTok;
  const outputCost = (usage.outputTokens / 1_000_000) * PRICING.OUTPUT_COST_PER_MTok;
  const totalCost = inputCost + outputCost;

  return {
    inputCost,
    outputCost,
    totalCost,
    tokenCount: usage,
  };
}

/**
 * Format cost for logging/display
 */
export function formatCost(cost: CostBreakdown): string {
  return `$${cost.totalCost.toFixed(4)} (${cost.tokenCount.totalTokens} tokens)`;
}

/**
 * Log a grading operation cost
 */
export function logGradingCost(
  operation: GradingCostMetrics['operation'],
  usage: TokenUsage,
  userId?: string,
): void {
  const cost = calculateCost(usage);

  const metric: GradingCostMetrics = {
    operation,
    tokens: usage,
    cost,
    timestamp: new Date().toISOString(),
    userId,
  };

  log.info(
    `[${operation}] Cost: ${formatCost(cost)} ${userId ? `(User: ${userId})` : ''}`,
  );

  // In production, send to analytics/monitoring system
  // For now, just log
}

/**
 * Estimate cost for common operations (for UX feedback)
 */
export function estimateGradingCost(questionType: 'essay' | 'code' | 'scenario'): string {
  // Rough estimates based on typical token counts
  const estimates = {
    essay: {
      inputTokens: 300,
      outputTokens: 150,
    },
    code: {
      inputTokens: 500,
      outputTokens: 200,
    },
    scenario: {
      inputTokens: 400,
      outputTokens: 100,
    },
  };

  const est = estimates[questionType];
  const usage: TokenUsage = {
    inputTokens: est.inputTokens,
    outputTokens: est.outputTokens,
    totalTokens: est.inputTokens + est.outputTokens,
  };

  const cost = calculateCost(usage);
  return formatCost(cost);
}

export function estimateGenerationCost(questionCount: number): string {
  // Generating 10 questions typically uses ~2000-3000 tokens
  const usage: TokenUsage = {
    inputTokens: 800 + questionCount * 100,
    outputTokens: 1200 + questionCount * 150,
    totalTokens: 2000 + questionCount * 250,
  };

  const cost = calculateCost(usage);
  return formatCost(cost);
}
