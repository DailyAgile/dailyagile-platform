import { AccessCodeGuard } from '@/components/access-code-guard';

export default function ClassroomLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AccessCodeGuard>{children}</AccessCodeGuard>;
}
