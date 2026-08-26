import Link from 'next/link';
import CourseDetailClient from './course-detail-client';

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  darkGray: '#1E293B',
  border: '#E2E8F0',
  white: '#FFFFFF',
  green: '#16a34a',
  red: '#dc2626',
};

// Mock course data - synced with category page
const COURSES: Record<string, any> = {
  'ai-business-1': {
    id: 'ai-business-1',
    title: 'AI for Business Professionals',
    icon: '👥',
    description: 'Master AI concepts for business decision-making',
    objectives: [
      'Understand AI fundamentals and business applications',
      'Learn prompt engineering for real-world use cases',
      'Discover AI tools that boost productivity',
      'Develop an AI strategy for your organization',
      'Navigate ethical AI and data privacy considerations',
    ],
    overview: 'This intensive course prepares business professionals to lead AI adoption in their organizations. Through live instruction and real-world case studies, participants learn both technical foundations and practical applications without requiring coding experience.',
    prerequisites: [
      'No coding experience required',
      'Basic familiarity with business tools (Excel, email, etc.)',
      'Willingness to explore new technologies',
    ],
    certification: {
      available: true,
      name: 'Professional AI Certificate',
      format: '60 multiple-choice questions',
      duration: '90 minutes',
      passingScore: '70%',
      timingWindow: 'Within 30 days of course completion',
      cost: 'Included with course',
    },
  },
  'ai-business-2': {
    id: 'ai-business-2',
    title: 'AI Strategy & Implementation',
    description: 'Develop AI strategies for organizational transformation',
    objectives: ['Build AI strategy', 'Manage implementation', 'Lead organizational change'],
    overview: 'Advanced strategy workshop for business leaders planning AI adoption',
    prerequisites: ['Completed AI Basics or equivalent experience'],
    certification: { available: true, name: 'AI Strategy Certification' },
  },
  'ai-business-3': {
    id: 'ai-business-3',
    title: 'Generative AI in the Workplace',
    description: 'Practical applications of ChatGPT and modern AI tools',
    objectives: ['Use generative AI tools', 'Solve business problems'],
    overview: 'Hands-on workshop with real-world business tools',
    prerequisites: ['No prerequisites'],
    certification: { available: false },
  },
  'ai-business-4': {
    id: 'ai-business-4',
    title: 'Prompt Engineering for Business',
    description: 'Master prompting techniques for business applications',
    objectives: ['Write effective prompts', 'Maximize AI tool utility'],
    overview: 'Intensive 2-day workshop on advanced prompting',
    prerequisites: ['Familiarity with ChatGPT or Claude'],
    certification: { available: true, name: 'Prompt Engineering Certificate' },
  },
  'ai-business-5': {
    id: 'ai-business-5',
    title: 'AI Ethics & Responsible Use',
    description: 'Navigate ethical challenges in AI implementation',
    objectives: ['Understand AI ethics', 'Mitigate risks'],
    overview: 'Executive overview of responsible AI governance',
    prerequisites: ['No prerequisites'],
    certification: { available: true, name: 'AI Ethics Certificate' },
  },
  'ai-business-6': {
    id: 'ai-business-6',
    title: 'Building Your AI Team',
    description: 'Hire, train, and lead AI-skilled teams',
    objectives: ['Build high-performing AI teams', 'Develop talent'],
    overview: 'Leadership guide for AI adoption in organizations',
    prerequisites: ['Leadership experience preferred'],
    certification: { available: true, name: 'AI Team Leadership Certificate' },
  },
  'ai-engineer-1': {
    id: 'ai-engineer-1',
    title: 'AI & ML Foundations',
    description: 'Comprehensive ML fundamentals with Python',
    objectives: ['Master ML basics', 'Python for ML'],
    overview: 'Deep dive into machine learning foundations',
    prerequisites: ['Python experience', 'Math fundamentals'],
    certification: { available: true, name: 'ML Foundations Certificate' },
  },
  'ai-engineer-2': {
    id: 'ai-engineer-2',
    title: 'Neural Networks & Deep Learning',
    description: 'Build neural networks from scratch',
    objectives: ['Build neural networks', 'Deep learning architectures'],
    overview: 'Hands-on neural networks and deep learning course',
    prerequisites: ['Completed ML Foundations'],
    certification: { available: true, name: 'Deep Learning Certificate' },
  },
};

// Mock instructor data
const INSTRUCTORS: Record<string, any> = {
  'sarah-chen': {
    id: 'sarah-chen',
    name: 'Sarah Chen',
    title: 'AI Strategist',
    experience: '15+ years in enterprise AI implementation',
    bio: 'Sarah has led AI adoption initiatives for Fortune 500 companies. She specializes in helping non-technical teams understand and implement AI solutions.',
    rating: 4.9,
    reviews: 87,
    certifications: ['IBM AI Certifications', 'AWS Machine Learning Specialist'],
  },
};

// Mock sessions data - 15 different schedules
const SESSIONS = [
  { id: 101, courseId: 'ai-business', instructor: 'sarah-chen', format: '2-day', dates: 'Sep 15-16, 2026', schedule: 'Weekday (M-Tu)', times: '9:00 AM - 5:00 PM EDT', regular: 349, sale: 299, discount: '20% off', available: 3, waitlist: false },
  { id: 102, courseId: 'ai-business', instructor: 'sarah-chen', format: '3-day', dates: 'Sep 20-22, 2026', schedule: 'Weekend (Fri-Sun)', times: '7:30 AM - 1:00 PM EDT', regular: 349, sale: 279, discount: '20% off', available: 8, waitlist: false },
  { id: 103, courseId: 'ai-business', instructor: 'sarah-chen', format: '2-day', dates: 'Oct 1-2, 2026', schedule: 'Weekday (W-Th)', times: '9:00 AM - 5:00 PM EDT', regular: 349, sale: null, discount: null, available: 12, waitlist: false },
  { id: 104, courseId: 'ai-business', instructor: 'sarah-chen', format: '3-day', dates: 'Oct 10-12, 2026', schedule: 'Weekend (Fri-Sun)', times: '7:30 AM - 1:00 PM EDT', regular: 349, sale: 329, discount: '5% off', available: 5, waitlist: false },
  { id: 105, courseId: 'ai-business', instructor: 'sarah-chen', format: '2-day', dates: 'Oct 20-21, 2026', schedule: 'Weekday (M-Tu)', times: '9:00 AM - 5:00 PM EDT', regular: 349, sale: null, discount: null, available: 15, waitlist: false },
  { id: 106, courseId: 'ai-business', instructor: 'sarah-chen', format: '3-day', dates: 'Nov 1-3, 2026', schedule: 'Weekend (Fri-Sun)', times: '7:30 AM - 1:00 PM EDT', regular: 349, sale: 299, discount: '15% off', available: 0, waitlist: true },
  { id: 107, courseId: 'ai-business', instructor: 'sarah-chen', format: '2-day', dates: 'Nov 10-11, 2026', schedule: 'Weekday (M-Tu)', times: '9:00 AM - 5:00 PM EDT', regular: 349, sale: null, discount: null, available: 7, waitlist: false },
  { id: 108, courseId: 'ai-business', instructor: 'sarah-chen', format: '3-day', dates: 'Nov 15-17, 2026', schedule: 'Weekend (Fri-Sun)', times: '7:30 AM - 1:00 PM EDT', regular: 349, sale: 319, discount: '8% off', available: 4, waitlist: false },
  { id: 109, courseId: 'ai-business', instructor: 'sarah-chen', format: '2-day', dates: 'Dec 2-3, 2026', schedule: 'Weekday (Tu-W)', times: '9:00 AM - 5:00 PM EDT', regular: 399, sale: 349, discount: '12% off', available: 10, waitlist: false },
  { id: 110, courseId: 'ai-business', instructor: 'sarah-chen', format: '3-day', dates: 'Dec 10-12, 2026', schedule: 'Weekend (Fri-Sun)', times: '7:30 AM - 1:00 PM EDT', regular: 399, sale: 359, discount: '10% off', available: 0, waitlist: true },
  { id: 111, courseId: 'ai-business', instructor: 'sarah-chen', format: '2-day', dates: 'Jan 12-13, 2027', schedule: 'Weekday (M-Tu)', times: '9:00 AM - 5:00 PM EST', regular: 349, sale: null, discount: null, available: 18, waitlist: false },
  { id: 112, courseId: 'ai-business', instructor: 'sarah-chen', format: '3-day', dates: 'Jan 20-22, 2027', schedule: 'Weekend (Fri-Sun)', times: '7:30 AM - 1:00 PM EST', regular: 349, sale: 299, discount: '14% off', available: 6, waitlist: false },
  { id: 113, courseId: 'ai-business', instructor: 'sarah-chen', format: '2-day', dates: 'Feb 1-2, 2027', schedule: 'Weekday (M-Tu)', times: '9:00 AM - 5:00 PM EST', regular: 349, sale: null, discount: null, available: 11, waitlist: false },
  { id: 114, courseId: 'ai-business', instructor: 'sarah-chen', format: '3-day', dates: 'Feb 12-14, 2027', schedule: 'Weekend (Fri-Sun)', times: '7:30 AM - 1:00 PM EST', regular: 349, sale: 309, discount: '11% off', available: 9, waitlist: false },
  { id: 115, courseId: 'ai-business', instructor: 'sarah-chen', format: '2-day', dates: 'Mar 1-2, 2027', schedule: 'Weekday (M-Tu)', times: '9:00 AM - 5:00 PM EST', regular: 349, sale: null, discount: null, available: 14, waitlist: false },
];

export default async function CourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;

  const course = COURSES[courseId];
  const instructor = INSTRUCTORS['sarah-chen'];
  const allSessions = SESSIONS.filter(s => s.courseId === courseId);

  if (!course) {
    return (
      <div style={{ minHeight: '100vh', background: BRAND_COLORS.light, padding: '40px 24px', textAlign: 'center' }}>
        <h1 style={{ color: BRAND_COLORS.navy }}>Course not found</h1>
        <Link href="/ilt" style={{ color: BRAND_COLORS.teal }}>
          ← Back to Live Courses
        </Link>
      </div>
    );
  }

  return <CourseDetailClient course={course} instructor={instructor} allSessions={allSessions} courseId={courseId} />;
}
