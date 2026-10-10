import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import { Navbar } from '@/components/Navbar';
import { SiteFooter } from '@/components/SiteFooter';

export const metadata: Metadata = {
  title: 'Samaan | متجر الأقمشة والجلاليب',
  description: 'متجر للأقمشة بالمتر والجلاليب الجاهزة والتفصيل للأفراد وتجار الجملة.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl"><body><AuthProvider><Navbar />{children}<SiteFooter /></AuthProvider></body></html>;
}
