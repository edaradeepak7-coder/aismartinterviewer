'use client';
import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useNavigation } from '@/contexts/NavigationContext';

interface NavigationLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  title?: string;
}

export default function NavigationLink({ href, children, className, onClick, title }: NavigationLinkProps) {
  const { startNavigation } = useNavigation();
  const router = useRouter();
  const pathname = usePathname();

  const handleClick = (e: React.MouseEvent) => {
    // Only show loading if navigating to a different page
    if (href !== pathname) {
      startNavigation();
    }
    onClick?.();
  };

  return (
    <Link 
      href={href} 
      className={className} 
      onClick={handleClick}
      title={title}
    >
      {children}
    </Link>
  );
}