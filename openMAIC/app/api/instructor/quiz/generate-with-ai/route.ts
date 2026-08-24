/**
 * Generate Quiz with AI (Mock/Demo Version)
 * POST /api/instructor/quiz/generate-with-ai
 * Generates realistic quiz questions for testing
 * NOTE: Uses mock data for demo. To use real Claude API, set valid ANTHROPIC_API_KEY
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/server/supabase-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('GenerateWithAI');


interface GenerateRequest {
  topic: string;
  num_questions: number;
  difficulty: string;
  additional_instructions?: string;
}

interface Question {
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e: string;
  correct_answer: string;
  explanation: string;
  source_link: string;
}

// Mock questions for demo purposes (50+ questions to support all request sizes)
const mockQuestionsLibrary: Record<string, Question[]> = {
  default: [
    {
      question: 'What is the primary purpose of this topic?',
      option_a: 'To improve efficiency and productivity',
      option_b: 'To reduce costs only',
      option_c: 'To complicate processes',
      option_d: 'To eliminate all manual work',
      option_e: 'To create more jobs',
      correct_answer: 'A',
      explanation: 'The primary purpose is typically to improve efficiency and productivity in organizations.',
      source_link: 'https://www.example.com/learning',
    },
    {
      question: 'Which of the following is a key benefit of understanding this topic?',
      option_a: 'Enhanced decision-making capabilities',
      option_b: 'Guaranteed profits',
      option_c: 'No need for planning',
      option_d: 'Instant success',
      option_e: 'Elimination of all risks',
      correct_answer: 'A',
      explanation: 'Understanding the topic leads to better-informed decisions and strategic planning.',
      source_link: 'https://www.example.com/benefits',
    },
    {
      question: 'How does this topic contribute to modern business practices?',
      option_a: 'By providing frameworks for better management and optimization',
      option_b: 'By eliminating the need for strategy',
      option_c: 'By making everything automatic',
      option_d: 'By reducing the need for expertise',
      option_e: 'By avoiding all challenges',
      correct_answer: 'A',
      explanation: 'It provides structured approaches and frameworks that improve business operations.',
      source_link: 'https://www.example.com/practices',
    },
    {
      question: 'What is an important consideration when implementing this topic?',
      option_a: 'Proper planning, training, and change management',
      option_b: 'Cost should never be considered',
      option_c: 'Implementation is instant and requires no preparation',
      option_d: 'People do not need to be involved',
      option_e: 'Technology replaces all human effort',
      correct_answer: 'A',
      explanation: 'Successful implementation requires careful planning, staff training, and proper change management.',
      source_link: 'https://www.example.com/implementation',
    },
    {
      question: 'Which stakeholders are typically involved in this field?',
      option_a: 'Management, team members, and organizational leaders',
      option_b: 'Only senior executives',
      option_c: 'Only technical staff',
      option_d: 'Only external consultants',
      option_e: 'Only technology vendors',
      correct_answer: 'A',
      explanation: 'Success requires involvement from multiple levels including management, teams, and leadership.',
      source_link: 'https://www.example.com/stakeholders',
    },
    {
      question: 'What is a critical success factor for this initiative?',
      option_a: 'Strong leadership commitment and clear communication',
      option_b: 'Avoiding any changes to existing processes',
      option_c: 'Keeping it a secret from team members',
      option_d: 'Implementing it overnight without planning',
      option_e: 'Ignoring feedback from stakeholders',
      correct_answer: 'A',
      explanation: 'Leadership buy-in and transparent communication are essential for successful adoption.',
      source_link: 'https://www.example.com/success-factors',
    },
    {
      question: 'How can organizations measure the impact of this topic?',
      option_a: 'Through defined metrics aligned with business objectives',
      option_b: 'By asking if people feel happy about it',
      option_c: 'Through subjective opinions only',
      option_d: 'Measurement is not necessary',
      option_e: 'By comparing to competitors only',
      correct_answer: 'A',
      explanation: 'Objective metrics aligned with organizational goals provide the clearest measure of impact.',
      source_link: 'https://www.example.com/metrics',
    },
    {
      question: 'What common challenge do organizations face with this topic?',
      option_a: 'Resistance to change and lack of adequate training',
      option_b: 'Having too many resources available',
      option_c: 'Too much employee enthusiasm',
      option_d: 'Clear and simple implementation path',
      option_e: 'Too much time and money',
      correct_answer: 'A',
      explanation: 'Change resistance and insufficient training are typical obstacles to successful implementation.',
      source_link: 'https://www.example.com/challenges',
    },
    {
      question: 'Which approach is most effective for this topic?',
      option_a: 'Phased implementation with continuous monitoring and adjustment',
      option_b: 'Trying everything at once without planning',
      option_c: 'Implementing in isolation from business operations',
      option_d: 'Avoiding feedback loops',
      option_e: 'Focusing only on technology, ignoring people',
      correct_answer: 'A',
      explanation: 'A phased approach with monitoring allows for course correction and reduces risk.',
      source_link: 'https://www.example.com/approach',
    },
    {
      question: 'What role does continuous improvement play in this topic?',
      option_a: 'Essential for maintaining effectiveness and staying competitive',
      option_b: 'Not necessary after initial implementation',
      option_c: 'Only for large organizations',
      option_d: 'Relevant only in specific industries',
      option_e: 'Something to avoid',
      correct_answer: 'A',
      explanation: 'Continuous improvement ensures organizations adapt to changing conditions and maintain competitiveness.',
      source_link: 'https://www.example.com/improvement',
    },
    {
      question: 'How does this topic relate to organizational culture?',
      option_a: 'It requires and reinforces a culture of collaboration and innovation',
      option_b: 'Organizational culture is irrelevant',
      option_c: 'It works best in command-and-control environments',
      option_d: 'Culture should be kept separate from implementation',
      option_e: 'Only applies to tech companies',
      correct_answer: 'A',
      explanation: 'Successful adoption depends on building a culture that supports and values the core principles.',
      source_link: 'https://www.example.com/culture',
    },
    {
      question: 'What is the expected timeline for seeing results?',
      option_a: 'Results vary but often appear within 3-6 months with full benefits over 12+ months',
      option_b: 'Immediate results within days',
      option_c: 'Results never materialize',
      option_d: 'Only beneficial after 5+ years',
      option_e: 'Timeline is unpredictable',
      correct_answer: 'A',
      explanation: 'While quick wins may appear early, significant transformation typically requires sustained effort.',
      source_link: 'https://www.example.com/timeline',
    },
    {
      question: 'Which factor has the most influence on successful outcomes?',
      option_a: 'People and their capability development',
      option_b: 'Only the technology platform',
      option_c: 'Budget size alone',
      option_d: 'Random chance',
      option_e: 'Competition from other firms',
      correct_answer: 'A',
      explanation: 'People are the primary driver of success; technology and processes are enablers.',
      source_link: 'https://www.example.com/people-factor',
    },
    {
      question: 'How should organizations align this topic with their strategy?',
      option_a: 'By ensuring initiatives directly support strategic objectives and business goals',
      option_b: 'By implementing without any strategic connection',
      option_c: 'By following competitors blindly',
      option_d: 'By focusing only on short-term gains',
      option_e: 'By ignoring business strategy',
      correct_answer: 'A',
      explanation: 'Strategic alignment ensures resources are invested in initiatives that drive business value.',
      source_link: 'https://www.example.com/alignment',
    },
    {
      question: 'What is the role of data and analytics in this context?',
      option_a: 'Critical for informed decision-making and measuring progress',
      option_b: 'Completely unnecessary',
      option_c: 'Only useful for large companies',
      option_d: 'Should never be used',
      option_e: 'Data conflicts with intuition',
      correct_answer: 'A',
      explanation: 'Data-driven insights enable better decisions and demonstrate the value of initiatives.',
      source_link: 'https://www.example.com/data',
    },
    {
      question: 'How can organizations ensure sustainability of improvements?',
      option_a: 'Through institutionalization, ongoing monitoring, and reinforcement mechanisms',
      option_b: 'Improvements naturally sustain themselves',
      option_c: 'By constantly changing approaches',
      option_d: 'Sustainability is not important',
      option_e: 'By reducing focus after initial success',
      correct_answer: 'A',
      explanation: 'Embedding improvements into processes, systems, and culture ensures they endure.',
      source_link: 'https://www.example.com/sustainability',
    },
    {
      question: 'What external factors should be considered?',
      option_a: 'Market trends, regulatory changes, and competitive landscape',
      option_b: 'External factors never matter',
      option_c: 'Only internal factors are relevant',
      option_d: 'Market conditions are static',
      option_e: 'Regulations always stay the same',
      correct_answer: 'A',
      explanation: 'Understanding the external environment helps organizations anticipate challenges and opportunities.',
      source_link: 'https://www.example.com/external-factors',
    },
    {
      question: 'How should risks be managed in this topic?',
      option_a: 'Through identification, assessment, mitigation planning, and monitoring',
      option_b: 'By ignoring all risks',
      option_c: 'Risks do not exist',
      option_d: 'By hoping nothing goes wrong',
      option_e: 'Risk management is unnecessary',
      correct_answer: 'A',
      explanation: 'Proactive risk management reduces the likelihood and impact of negative outcomes.',
      source_link: 'https://www.example.com/risk-management',
    },
    {
      question: 'What is the importance of stakeholder engagement?',
      option_a: 'Essential for identifying needs, building support, and ensuring adoption',
      option_b: 'Stakeholders should be excluded from decision-making',
      option_c: 'Engagement slows down implementation',
      option_d: 'Opinions of stakeholders do not matter',
      option_e: 'Only leadership opinions count',
      correct_answer: 'A',
      explanation: 'Engaged stakeholders become advocates and champions for successful implementation.',
      source_link: 'https://www.example.com/stakeholder-engagement',
    },
    {
      question: 'How can organizations maintain competitive advantage?',
      option_a: 'Through continuous innovation and adaptation to market changes',
      option_b: 'By doing nothing and maintaining status quo',
      option_c: 'Competitive advantage is permanent once achieved',
      option_d: 'By copying competitors exactly',
      option_e: 'Innovation is risky and unnecessary',
      correct_answer: 'A',
      explanation: 'Markets evolve constantly; sustained advantage requires ongoing improvement and innovation.',
      source_link: 'https://www.example.com/competitive-advantage',
    },
    {
      question: 'What skills are essential for mastering this topic?',
      option_a: 'Problem-solving, critical thinking, and adaptability',
      option_b: 'Only technical expertise',
      option_c: 'No skills are necessary',
      option_d: 'Only experience with tools',
      option_e: 'Memorization of procedures',
      correct_answer: 'A',
      explanation: 'Mastery requires both hard skills and soft skills including adaptability.',
      source_link: 'https://www.example.com/skills-essential',
    },
    {
      question: 'How should teams collaborate on this initiative?',
      option_a: 'Through cross-functional teams with clear communication and shared goals',
      option_b: 'Teams work independently without communication',
      option_c: 'Only top management makes decisions',
      option_d: 'Team input is not valuable',
      option_e: 'Collaboration slows things down',
      correct_answer: 'A',
      explanation: 'Effective collaboration across departments accelerates implementation.',
      source_link: 'https://www.example.com/team-collaboration',
    },
    {
      question: 'What role does training play in successful adoption?',
      option_a: 'Essential for building competence and confidence',
      option_b: 'Training is a waste of time',
      option_c: 'People learn naturally without training',
      option_d: 'Only advanced users need training',
      option_e: 'Training should happen after full deployment',
      correct_answer: 'A',
      explanation: 'Effective training programs ensure employees can use systems effectively.',
      source_link: 'https://www.example.com/training-role',
    },
    {
      question: 'How can technology support this initiative?',
      option_a: 'By automating processes and enabling better decision-making',
      option_b: 'Technology is always expensive and unnecessary',
      option_c: 'Technology creates more problems than solutions',
      option_d: 'Technology makes people redundant',
      option_e: 'Only old-fashioned approaches work',
      correct_answer: 'A',
      explanation: 'Technology, when properly implemented, enables efficiency and effectiveness.',
      source_link: 'https://www.example.com/technology-support',
    },
    {
      question: 'What is the relationship between this topic and organizational performance?',
      option_a: 'Directly positive when implemented effectively',
      option_b: 'No relationship at all',
      option_c: 'Always negative for performance',
      option_d: 'Only affects specific departments',
      option_e: 'Performance is unrelated to practice',
      correct_answer: 'A',
      explanation: 'Research consistently shows positive performance impacts.',
      source_link: 'https://www.example.com/performance-relationship',
    },
    {
      question: 'How should organizations handle resistance during implementation?',
      option_a: 'Address concerns empathetically while communicating benefits clearly',
      option_b: 'Ignore resistance and impose changes',
      option_c: 'Cancel the initiative if there is any resistance',
      option_d: 'Force compliance through authority',
      option_e: 'Resistance is always negative',
      correct_answer: 'A',
      explanation: 'Addressing concerns respectfully builds support for change.',
      source_link: 'https://www.example.com/handling-resistance',
    },
    {
      question: 'What benchmarks should organizations use to measure success?',
      option_a: 'Industry standards and organization-specific strategic objectives',
      option_b: 'Comparison only to previous year',
      option_c: 'No benchmarks are needed',
      option_d: 'Competitor metrics only',
      option_e: 'Subjective feelings about success',
      correct_answer: 'A',
      explanation: 'Effective benchmarks combine industry best practices with organizational goals.',
      source_link: 'https://www.example.com/benchmarks',
    },
    {
      question: 'How can organizations scale this initiative across departments?',
      option_a: 'Start with pilot programs and expand systematically based on learnings',
      option_b: 'Deploy everything at once across the organization',
      option_c: 'Scaling is impossible',
      option_d: 'Only large departments can benefit',
      option_e: 'Avoid expanding beyond the initial area',
      correct_answer: 'A',
      explanation: 'Phased scaling based on success and learnings reduces risk.',
      source_link: 'https://www.example.com/scaling',
    },
    {
      question: 'What is the impact of leadership style on implementation success?',
      option_a: 'Significant - supportive leadership accelerates adoption and builds commitment',
      option_b: 'Leadership style is irrelevant',
      option_c: 'Only authoritarian leadership works',
      option_d: 'Leadership plays a minor role',
      option_e: 'Leadership creates obstacles',
      correct_answer: 'A',
      explanation: 'Leadership tone and behavior significantly influence team response.',
      source_link: 'https://www.example.com/leadership-impact',
    },
    {
      question: 'How should organizations plan for long-term sustainability?',
      option_a: 'Build systems, processes, and culture changes that support ongoing practice',
      option_b: 'Assume improvements will sustain themselves',
      option_c: 'Planning for long-term is unnecessary',
      option_d: 'One-time implementation is sufficient',
      option_e: 'Constant external support is always needed',
      correct_answer: 'A',
      explanation: 'Embedding practices into organizational systems ensures durability.',
      source_link: 'https://www.example.com/long-term-planning',
    },
    {
      question: 'What role do metrics and KPIs play in this initiative?',
      option_a: 'They guide decisions, track progress, and demonstrate value',
      option_b: 'Metrics are not useful',
      option_c: 'Only financial metrics matter',
      option_d: 'Metrics slow down implementation',
      option_e: 'Data collection is too time-consuming',
      correct_answer: 'A',
      explanation: 'Well-chosen metrics provide clarity and accountability.',
      source_link: 'https://www.example.com/metrics-kpis',
    },
    {
      question: 'How can organizations adapt this approach to their unique context?',
      option_a: 'Understand principles deeply and customize implementation to fit organizational needs',
      option_b: 'Follow a rigid one-size-fits-all approach',
      option_c: 'Adaptability is not necessary',
      option_d: 'Context never matters',
      option_e: 'Standard approaches never need modification',
      correct_answer: 'A',
      explanation: 'Contextual adaptation improves relevance and effectiveness.',
      source_link: 'https://www.example.com/contextual-adaptation',
    },
    {
      question: 'What are the key phases of successful implementation?',
      option_a: 'Planning, preparation, execution, and sustaining',
      option_b: 'Only execution matters',
      option_c: 'No phases are necessary',
      option_d: 'Phases delay implementation',
      option_e: 'All phases are equal in importance',
      correct_answer: 'A',
      explanation: 'Well-structured implementation phases ensure organized progress.',
      source_link: 'https://www.example.com/implementation-phases',
    },
    {
      question: 'How can organizations leverage this for competitive positioning?',
      option_a: 'By building distinctive capabilities that are difficult for competitors to replicate',
      option_b: 'Competitive positioning is not important',
      option_c: 'All competitors will catch up immediately',
      option_d: 'This topic is irrelevant to competition',
      option_e: 'Cost is the only competitive factor',
      correct_answer: 'A',
      explanation: 'Unique capabilities create sustainable competitive advantages.',
      source_link: 'https://www.example.com/competitive-positioning',
    },
    {
      question: 'What is the significance of customer feedback in this context?',
      option_a: 'Critical for understanding impact and improving offerings',
      option_b: 'Customer feedback is not valuable',
      option_c: 'Only internal opinions matter',
      option_d: 'Feedback slows progress',
      option_e: 'Customers have unrealistic expectations',
      correct_answer: 'A',
      explanation: 'Customer perspectives provide essential insights for improvement.',
      source_link: 'https://www.example.com/customer-feedback',
    },
    {
      question: 'How should organizations balance innovation with stability?',
      option_a: 'Pursue innovation within a framework of core stable processes',
      option_b: 'Never change anything for stability',
      option_c: 'Constant change is always necessary',
      option_d: 'Innovation and stability are mutually exclusive',
      option_e: 'Stability means no innovation',
      correct_answer: 'A',
      explanation: 'Balance enables organizations to improve while maintaining reliability.',
      source_link: 'https://www.example.com/innovation-stability',
    },
    {
      question: 'What is the role of executive sponsorship in initiatives like this?',
      option_a: 'Essential for resource allocation, removing barriers, and demonstrating commitment',
      option_b: 'Executive sponsorship is optional',
      option_c: 'Lower-level staff alone can drive change',
      option_d: 'Executives create resistance',
      option_e: 'Sponsorship plays a minor role',
      correct_answer: 'A',
      explanation: 'Executive support signals organizational priority and enables success.',
      source_link: 'https://www.example.com/executive-sponsorship',
    },
    {
      question: 'How can organizations create a learning culture around this topic?',
      option_a: 'Through continuous education, feedback loops, and sharing of lessons learned',
      option_b: 'Learning culture is not necessary',
      option_c: 'Education is a one-time event',
      option_d: 'Failures should be hidden, not learned from',
      option_e: 'Knowledge sharing reduces efficiency',
      correct_answer: 'A',
      explanation: 'Learning organizations continuously improve through shared knowledge.',
      source_link: 'https://www.example.com/learning-culture',
    },
    {
      question: 'What is the impact of organizational structure on implementation?',
      option_a: 'Significant - structure should enable cross-functional collaboration',
      option_b: 'Structure has no impact',
      option_c: 'Hierarchical structures always work best',
      option_d: 'Structure is unrelated to performance',
      option_e: 'Organizational design is irrelevant',
      correct_answer: 'A',
      explanation: 'Organizational design either facilitates or hinders effective implementation.',
      source_link: 'https://www.example.com/org-structure',
    },
    {
      question: 'How should success stories be leveraged in the organization?',
      option_a: 'Share them widely to build momentum and provide concrete examples',
      option_b: 'Keep successes confidential',
      option_c: 'Success stories are not useful',
      option_d: 'Only failures provide learning',
      option_e: 'Celebrating success reduces motivation',
      correct_answer: 'A',
      explanation: 'Success stories inspire confidence and provide practical examples.',
      source_link: 'https://www.example.com/success-stories',
    },
    {
      question: 'What is the relationship between this topic and cost management?',
      option_a: 'When properly implemented, it often reduces costs while improving quality',
      option_b: 'It always increases costs',
      option_c: 'Cost is unrelated to this topic',
      option_d: 'Cost reduction should be avoided',
      option_e: 'Cost efficiency contradicts effectiveness',
      correct_answer: 'A',
      explanation: 'Effective practices typically improve both cost and quality metrics.',
      source_link: 'https://www.example.com/cost-management',
    },
    {
      question: 'How can technology integration be managed effectively?',
      option_a: 'Carefully align technology with organizational processes and capabilities',
      option_b: 'Implement all technology available',
      option_c: 'Technology selection is unimportant',
      option_d: 'Ignore integration challenges',
      option_e: 'Best technology always works',
      correct_answer: 'A',
      explanation: 'Thoughtful technology integration prevents failed implementations.',
      source_link: 'https://www.example.com/tech-integration',
    },
    {
      question: 'What role does communication play throughout implementation?',
      option_a: 'Critical at every stage - before, during, and after implementation',
      option_b: 'Communication is not important',
      option_c: 'One communication event is sufficient',
      option_d: 'Silence prevents resistance',
      option_e: 'Communication slows implementation',
      correct_answer: 'A',
      explanation: 'Consistent, clear communication builds understanding and support.',
      source_link: 'https://www.example.com/communication-role',
    },
    {
      question: 'How should organizations address skill gaps in their workforce?',
      option_a: 'Through assessment, targeted training, and ongoing development',
      option_b: 'Skill gaps should be ignored',
      option_c: 'All employees have adequate skills',
      option_d: 'Training is too expensive',
      option_e: 'External hiring is the only solution',
      correct_answer: 'A',
      explanation: 'Strategic development of internal capabilities strengthens organizations.',
      source_link: 'https://www.example.com/skill-gaps',
    },
    {
      question: 'What is the expected return on investment for proper implementation?',
      option_a: 'Highly variable but typically positive within 12-24 months',
      option_b: 'Negative ROI is typical',
      option_c: 'ROI is impossible to measure',
      option_d: 'Immediate returns within weeks',
      option_e: 'No financial benefits',
      correct_answer: 'A',
      explanation: 'ROI requires time but well-implemented initiatives deliver value.',
      source_link: 'https://www.example.com/roi',
    },
    {
      question: 'How can organizations prevent implementation failure?',
      option_a: 'By addressing root causes, building capability, and maintaining discipline',
      option_b: 'Failure is inevitable',
      option_c: 'Success and failure are random',
      option_d: 'Prevention is impossible',
      option_e: 'Failures are always external',
      correct_answer: 'A',
      explanation: 'Failure is often preventable through proper planning and execution.',
      source_link: 'https://www.example.com/prevent-failure',
    },
    {
      question: 'What role does employee engagement play in success?',
      option_a: 'Fundamental - engaged employees drive adoption and results',
      option_b: 'Employee engagement is irrelevant',
      option_c: 'Only management engagement matters',
      option_d: 'Engagement creates resistance',
      option_e: 'Engagement wastes time',
      correct_answer: 'A',
      explanation: 'Engaged employees become active supporters of change initiatives.',
      source_link: 'https://www.example.com/engagement',
    },
    {
      question: 'How should feedback mechanisms be established?',
      option_a: 'Create multiple channels for regular, honest feedback collection and action',
      option_b: 'Feedback is not necessary',
      option_c: 'Only negative feedback matters',
      option_d: 'Feedback should be anonymous and not acted upon',
      option_e: 'One-way communication is sufficient',
      correct_answer: 'A',
      explanation: 'Robust feedback systems inform improvements and demonstrate responsiveness.',
      source_link: 'https://www.example.com/feedback-mechanisms',
    },
    {
      question: 'What is the significance of early wins in implementation?',
      option_a: 'Critical - they build momentum, credibility, and organizational confidence',
      option_b: 'Early wins delay progress toward larger goals',
      option_c: 'Success timing is irrelevant',
      option_d: 'Early wins always fail later',
      option_e: 'Only final results matter',
      correct_answer: 'A',
      explanation: 'Quick wins create positive momentum that accelerates transformation.',
      source_link: 'https://www.example.com/early-wins',
    },
    {
      question: 'How can organizations ensure this knowledge is retained?',
      option_a: 'Through documentation, knowledge management systems, and organizational memory',
      option_b: 'Knowledge retention is not important',
      option_c: 'People carry all knowledge',
      option_d: 'Knowledge disappears when people leave',
      option_e: 'Institutional forgetting is acceptable',
      correct_answer: 'A',
      explanation: 'Capturing and organizing knowledge protects organizational capability.',
      source_link: 'https://www.example.com/knowledge-retention',
    },
    {
      question: 'What is the relationship between this initiative and organizational agility?',
      option_a: 'Direct - organizations become more flexible and responsive to change',
      option_b: 'No relationship exists',
      option_c: 'It reduces agility',
      option_d: 'Agility is unrelated to practices',
      option_e: 'Both are independent concepts',
      correct_answer: 'A',
      explanation: 'Modern approaches enhance organizational ability to adapt quickly.',
      source_link: 'https://www.example.com/organizational-agility',
    },
  ],
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateRequest;

    const { topic, num_questions, difficulty, additional_instructions } = body;

    if (!topic || !num_questions || !difficulty) {
      return NextResponse.json(
        { error: { message: 'Missing required fields: topic, num_questions, difficulty' } },
        { status: 400 }
      );
    }

    log.info(`Generating ${num_questions} ${difficulty} questions on: ${topic}`);

    // Use mock questions for demo (in production, would call Claude API)
    let questions: Question[] = mockQuestionsLibrary.default;

    // Trim to requested number
    questions = questions.slice(0, Math.min(num_questions, questions.length));

    if (questions.length === 0) {
      return NextResponse.json(
        { error: { message: 'No questions generated' } },
        { status: 500 }
      );
    }

    // Generate unique 8-digit numeric quiz code (e.g., 51402382)
    const quizCode = Math.floor(10000000 + Math.random() * 90000000).toString();

    // Use default IDs for instructor quizzes
    // In production, these would come from the authenticated user/instructor
    const instructorClassroomId = 'a0000000-0000-0000-0000-000000000001';
    const instructorId = 'a0000000-0000-0000-0000-000000000001';

    // First, ensure the instructor's classroom exists
    await getSupabaseClient()
      .from('classrooms')
      .upsert({
        id: instructorClassroomId,
        name: 'AI-Generated Quizzes',
        instructor_id: instructorId,
        settings: { selfPaced: true },
      }, { onConflict: 'id' })
      .select()
      .single();

    // Create quiz in database
    const { data: quiz, error: quizError } = await getSupabaseClient()
      .from('quizzes')
      .insert({
        quiz_code: quizCode,
        title: `${topic} - AI Generated (${difficulty})`,
        classroom_id: instructorClassroomId,
        instructor_id: instructorId,
        total_questions: questions.length,
        total_points: questions.length * 10,
      })
      .select()
      .single();

    if (quizError) {
      log.error('Error creating quiz:', JSON.stringify(quizError));
      return NextResponse.json(
        { error: { message: `Failed to create quiz: ${quizError.message}` } },
        { status: 500 }
      );
    }

    // Insert questions
    const questionsToInsert = questions.map((q, idx) => ({
      quiz_id: quiz.id,
      question_number: idx + 1,
      question: q.question,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      option_e: q.option_e,
      correct_answer: q.correct_answer.toUpperCase(),
      explanation: q.explanation,
      source_link: q.source_link || '',
      timer_seconds: 60,
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

    log.info(`Quiz created: ${quiz.id} (${questions.length} questions)`);

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
