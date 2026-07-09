import { ClassroomGuard } from '@/components/auth/classroom-guard';

export const metadata = {
  title: 'Classroom | DailyAgile',
  description: 'Interactive AI-powered classroom',
};

export default function ClassroomLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ClassroomGuard>{children}</ClassroomGuard>;
}
