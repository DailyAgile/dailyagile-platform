import { render, screen } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import AcademyPage from '../page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  LogOut: () => <div data-testid="logout-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  User: () => <div data-testid="user-icon" />,
}));

describe('AcademyPage - Public Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: jest.fn(),
    });
    localStorage.clear();
  });

  describe('When user is NOT logged in (visitor)', () => {
    test('renders without auth gate', () => {
      render(<AcademyPage />);

      // Wait for loading to complete
      setTimeout(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, 100);
    });

    test('shows "Log In / Sign Up" button in header', () => {
      render(<AcademyPage />);

      setTimeout(() => {
        const loginButton = screen.queryByText('Log In / Sign Up');
        expect(loginButton).toBeInTheDocument();
      }, 100);
    });

    test('header subtitle shows "Learning Platform"', () => {
      render(<AcademyPage />);

      setTimeout(() => {
        expect(screen.queryByText('Learning Platform')).toBeInTheDocument();
      }, 100);
    });

    test('welcome message is generic for visitor', () => {
      render(<AcademyPage />);

      setTimeout(() => {
        expect(screen.queryByText('Welcome to DailyAgile Academy')).toBeInTheDocument();
        expect(screen.queryByText(/Explore our learning products/)).toBeInTheDocument();
      }, 100);
    });

    test('ILT card shows "Public" badge', () => {
      render(<AcademyPage />);

      setTimeout(() => {
        expect(screen.queryByText('Public')).toBeInTheDocument();
      }, 100);
    });

    test('Self-Paced card shows "Login Required" badge', () => {
      render(<AcademyPage />);

      setTimeout(() => {
        const loginRequiredBadges = screen.queryAllByText('Login Required');
        expect(loginRequiredBadges.length).toBeGreaterThanOrEqual(2);
      }, 100);
    });

    test('Quiz card shows "Login Required" badge', () => {
      render(<AcademyPage />);

      setTimeout(() => {
        const loginRequiredBadges = screen.queryAllByText('Login Required');
        expect(loginRequiredBadges.length).toBeGreaterThanOrEqual(2);
      }, 100);
    });

    test('ILT link navigates to /academy/ilt (public)', () => {
      render(<AcademyPage />);

      setTimeout(() => {
        const iltLink = screen.queryByText('👥 ILT Cohorts')?.closest('a');
        expect(iltLink).toHaveAttribute('href', '/academy/ilt');
      }, 100);
    });

    test('Self-Paced link redirects to login', () => {
      render(<AcademyPage />);

      setTimeout(() => {
        const selfPacedLink = screen.queryByText('📚 Self-Paced Courses')?.closest('a');
        expect(selfPacedLink).toHaveAttribute('href', '/auth/login?redirect=/academy/self-paced');
      }, 100);
    });

    test('Quiz link redirects to login', () => {
      render(<AcademyPage />);

      setTimeout(() => {
        const quizLink = screen.queryByText('🎯 Quiz Tool')?.closest('a');
        expect(quizLink).toHaveAttribute('href', '/auth/login?redirect=/academy/quiz');
      }, 100);
    });
  });

  describe('When user IS logged in (instructor)', () => {
    beforeEach(() => {
      localStorage.setItem('instructorToken', 'fake-token');
      localStorage.setItem('instructorEmail', 'instructor@dailyagile.com');
    });

    test('shows username button in header', () => {
      render(<AcademyPage />);

      setTimeout(() => {
        expect(screen.queryByText(/instructor/i)).toBeInTheDocument();
      }, 100);
    });

    test('header subtitle shows "Instructor Dashboard"', () => {
      render(<AcademyPage />);

      setTimeout(() => {
        expect(screen.queryByText('Instructor Dashboard')).toBeInTheDocument();
      }, 100);
    });

    test('welcome message is personalized', () => {
      render(<AcademyPage />);

      setTimeout(() => {
        expect(screen.queryByText(/Welcome back/)).toBeInTheDocument();
      }, 100);
    });

    test('user menu is available', () => {
      render(<AcademyPage />);

      setTimeout(() => {
        const userButton = screen.queryByText(/instructor/i);
        expect(userButton).toBeInTheDocument();
      }, 100);
    });
  });

  describe('Product Cards Structure', () => {
    test('renders 3 product cards', () => {
      render(<AcademyPage />);

      setTimeout(() => {
        expect(screen.queryByText('👥 ILT Cohorts')).toBeInTheDocument();
        expect(screen.queryByText('📚 Self-Paced Courses')).toBeInTheDocument();
        expect(screen.queryByText('🎯 Quiz Tool')).toBeInTheDocument();
      }, 100);
    });

    test('all product cards have descriptions', () => {
      render(<AcademyPage />);

      setTimeout(() => {
        expect(screen.queryByText(/Instructor-led training/)).toBeInTheDocument();
        expect(screen.queryByText(/Learn at your own pace/)).toBeInTheDocument();
        expect(screen.queryByText(/flexible assessment tool/i)).toBeInTheDocument();
      }, 100);
    });

    test('all product cards have stat labels', () => {
      render(<AcademyPage />);

      setTimeout(() => {
        expect(screen.queryByText('60+ Courses')).toBeInTheDocument();
        expect(screen.queryByText('Multiple Subjects')).toBeInTheDocument();
        expect(screen.queryByText('Standalone Product')).toBeInTheDocument();
      }, 100);
    });
  });

  describe('Quick Links Section', () => {
    test('renders Quick Links section', () => {
      render(<AcademyPage />);

      setTimeout(() => {
        expect(screen.queryByText('Quick Links')).toBeInTheDocument();
      }, 100);
    });

    test('includes Account Settings link', () => {
      render(<AcademyPage />);

      setTimeout(() => {
        expect(screen.queryByText('Account Settings')).toBeInTheDocument();
      }, 100);
    });

    test('includes Help & Support link', () => {
      render(<AcademyPage />);

      setTimeout(() => {
        expect(screen.queryByText('Help & Support')).toBeInTheDocument();
      }, 100);
    });

    test('includes Visit Website link', () => {
      render(<AcademyPage />);

      setTimeout(() => {
        expect(screen.queryByText('Visit Website')).toBeInTheDocument();
      }, 100);
    });
  });
});
