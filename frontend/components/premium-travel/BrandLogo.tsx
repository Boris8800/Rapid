"use client";

import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: number;
}

const BrandLogo: React.FC<BrandLogoProps> = ({ className = '', size = 40 }) => {
  return (
    <div
      className={`rounded-xl flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      aria-label="Rapid Roads"
      role="img"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="4" y="4" width="56" height="56" rx="14" className="fill-background-dark" />
        <path
          d="M18 44c10-16 18-26 28-28"
          className="stroke-primary"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M22 18c10 2 18 10 24 26"
          className="stroke-primary"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.85"
        />
        <circle cx="32" cy="32" r="2" className="fill-primary" />
      </svg>
    </div>
  );
};

export default BrandLogo;