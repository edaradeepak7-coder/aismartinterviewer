'use client';
import React, { useState } from 'react';

interface CompanyLogoProps {
  company: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'icon' | 'full';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
} as const;

const TEXT_SIZES = {
  sm: 'text-[10px]',
  md: 'text-xs',
  lg: 'text-base',
  xl: 'text-xl',
} as const;

/**
 * Company name -> asset in public/logos, produced by scripts/fetch-company-logos.mjs.
 * Aliases let display names and legal names resolve to the same mark.
 */
const LOGOS: Record<string, string> = {
  google: '/logos/google.png',
  amazon: '/logos/amazon.png',
  aws: '/logos/amazon.png',
  microsoft: '/logos/microsoft.png',
  apple: '/logos/apple.png',
  meta: '/logos/meta.png',
  facebook: '/logos/meta.png',
  netflix: '/logos/netflix.png',
  tesla: '/logos/tesla.png',
  uber: '/logos/uber.png',
  airbnb: '/logos/airbnb.png',
  salesforce: '/logos/salesforce.png',
  adobe: '/logos/adobe.png',
  ibm: '/logos/ibm.png',
  oracle: '/logos/oracle.png',
  sap: '/logos/sap.png',
  accenture: '/logos/accenture.png',
  deloitte: '/logos/deloitte.png',
  infosys: '/logos/infosys.png',
  tcs: '/logos/tcs.svg',
  'tata consultancy services': '/logos/tcs.svg',
  wipro: '/logos/wipro.png',
  flipkart: '/logos/flipkart.png',
  cognizant: '/logos/cognizant.png',
  capgemini: '/logos/capgemini.png',
  hcl: '/logos/hcltech.png',
  hcltech: '/logos/hcltech.png',
  'tech mahindra': '/logos/techmahindra.png',
  techmahindra: '/logos/techmahindra.png',
  nvidia: '/logos/nvidia.png',
  intel: '/logos/intel.png',
  cisco: '/logos/cisco.png',
  paypal: '/logos/paypal.png',
  stripe: '/logos/stripe.png',
  atlassian: '/logos/atlassian.png',
  spotify: '/logos/spotify.png',
  linkedin: '/logos/linkedin.png',
  github: '/logos/github.png',
  x: '/logos/x.png',
  twitter: '/logos/x.png',
  'goldman sachs': '/logos/goldmansachs.png',
  goldmansachs: '/logos/goldmansachs.png',
  'jp morgan': '/logos/jpmorgan.png',
  jpmorgan: '/logos/jpmorgan.png',
  'jpmorgan chase': '/logos/jpmorgan.png',
  swiggy: '/logos/swiggy.png',
  zomato: '/logos/zomato.png',
  paytm: '/logos/paytm.png',
  zoho: '/logos/zoho.png',
  openai: '/logos/openai.png',
};

export function getCompanyLogoSrc(company: string): string | undefined {
  return LOGOS[company.trim().toLowerCase()];
}

export default function CompanyLogo({
  company,
  size = 'md',
  variant = 'icon',
  className = '',
}: CompanyLogoProps) {
  const [broken, setBroken] = useState(false);
  const src = getCompanyLogoSrc(company);

  const mark =
    src && !broken ? (
      <div
        className={`${SIZE_CLASSES[size]} rounded-lg bg-white border border-border/60 shadow-sm flex items-center justify-center overflow-hidden shrink-0`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={`${company} logo`}
          className="w-[72%] h-[72%] object-contain"
          loading="lazy"
          onError={() => setBroken(true)}
        />
      </div>
    ) : (
      <div
        className={`${SIZE_CLASSES[size]} rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0`}
      >
        <span className={`font-semibold text-secondary-foreground ${TEXT_SIZES[size]}`}>
          {company.slice(0, 2).toUpperCase()}
        </span>
      </div>
    );

  if (variant === 'full') {
    return (
      <div className={`flex items-center gap-2.5 ${className}`}>
        {mark}
        <span className="font-semibold text-foreground">{company}</span>
      </div>
    );
  }

  return <div className={className}>{mark}</div>;
}
