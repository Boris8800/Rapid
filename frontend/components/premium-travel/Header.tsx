"use client";

import React from 'react';
import BrandLogo from './BrandLogo';
import { BookingCategory } from './types';

interface HeaderProps {
  toggleDarkMode: () => void;
  isDarkMode: boolean;
  onHomeClick?: () => void;
  onCategoryChange?: (cat: BookingCategory) => void;
}

const Header: React.FC<HeaderProps> = ({ toggleDarkMode, isDarkMode, onHomeClick, onCategoryChange }) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-surface-dark-lighter bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md">
      <div className="px-4 md:px-10 py-3 flex items-center justify-between mx-auto max-w-7xl">
        <button 
          onClick={onHomeClick}
          className="flex items-center gap-4 text-slate-900 dark:text-white hover:opacity-80 transition-opacity cursor-pointer text-left"
        >
          <BrandLogo size={36} />
          <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] font-display">Rapid Roads</h2>
        </button>
        
        <div className="hidden md:flex flex-1 justify-end gap-8 items-center">
          <nav className="flex items-center gap-6 lg:gap-9">
            <button 
              onClick={() => onCategoryChange?.(BookingCategory.INTERCITY)}
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Intercity
            </button>
            <button 
              onClick={() => onCategoryChange?.(BookingCategory.AIRPORT)}
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Airport Transfer
            </button>
          </nav>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleDarkMode}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-surface-dark-lighter text-slate-600 dark:text-text-muted transition-all"
            >
              <span className="material-symbols-outlined">
                {isDarkMode ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
            <button className="text-sm font-medium hover:text-primary transition-colors">Log In</button>
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-4 bg-primary text-white text-sm font-bold shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all"
            >
              <span className="truncate">Book Now</span>
            </button>
          </div>
        </div>
        
        <button className="md:hidden p-2 text-slate-900 dark:text-white">
          <span className="material-symbols-outlined">menu</span>
        </button>
      </div>
    </header>
  );
};

export default Header;