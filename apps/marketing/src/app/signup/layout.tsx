import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up',
  description: 'Create your VistA Evolved account. 30-day free trial for all plans. Set up your healthcare organization in minutes.',
  openGraph: {
    title: 'Sign Up - VistA Evolved',
    description: 'Create your VistA Evolved account in minutes. 30-day free trial for all plans.',
  },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
