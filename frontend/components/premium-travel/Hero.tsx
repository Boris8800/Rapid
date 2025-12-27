"use client";

import React, { useState } from 'react';
import { BookingCategory, RideData, TripType } from './types';

interface HeroProps {
  activeCategory: BookingCategory;
  setActiveCategory: (cat: BookingCategory) => void;
  onEstimate?: (data: RideData) => void;
}

const Hero: React.FC<HeroProps> = ({ activeCategory, setActiveCategory, onEstimate }) => {
  const [tripType, setTripType] = useState<TripType>(TripType.ONE_WAY);
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [date, setDate] = useState('');
  const [persons, setPersons] = useState(1);
  const [luggage, setLuggage] = useState(1);
  const [loading, setLoading] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const handleSearch = async () => {
    if (!pickup || !dropoff) return;
    setLoading(true);
    const rideData: RideData = { pickup, dropoff, date: date || today, persons, luggage };
    await new Promise(resolve => setTimeout(resolve, 800));
    setLoading(false);
    if (onEstimate) onEstimate(rideData);
  };

  const increment = (setter: React.Dispatch<React.SetStateAction<number>>, val: number, max: number) => {
    if (val < max) setter(val + 1);
  };

  const decrement = (setter: React.Dispatch<React.SetStateAction<number>>, val: number, min: number) => {
    if (val > min) setter(val - 1);
  };

  return (
    <section className="relative w-full min-h-[900px] flex items-center justify-center py-20 px-4 md:px-12 overflow-hidden">
      {/* Background with deeper overlay for better text contrast */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-[20s] scale-105" 
        style={{ backgroundImage: `linear-gradient(rgba(10, 10, 20, 0.75), rgba(10, 10, 20, 0.98)), url('https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&q=85&w=2400')` }}
      />
      
      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-20 items-center">
        <div className="flex-1 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/20 border border-primary/30 mb-8 backdrop-blur-md">
            <span className="text-[11px] font-black text-primary tracking-[0.2em] uppercase">The Elite Standard</span>
          </div>
          <h1 className="text-6xl lg:text-[110px] font-black text-white mb-8 leading-[0.85] tracking-tighter">
            Across Britain<br/>
            <span className="text-primary italic font-display">In Refinement</span>
          </h1>
          <p className="text-slate-300 text-xl lg:text-2xl max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">
            Premium intercity travel throughout the UK. Experience superior service without the compromise.
          </p>
          
          <div className="mt-12 flex flex-wrap justify-center lg:justify-start gap-10 opacity-70">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">verified</span>
              <span className="text-[12px] font-bold text-white uppercase tracking-widest">Licensed</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">lock</span>
              <span className="text-[12px] font-bold text-white uppercase tracking-widest">Secure</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">star</span>
              <span className="text-[12px] font-bold text-white uppercase tracking-widest">5-Star Rated</span>
            </div>
          </div>
        </div>

        <div className="w-full max-w-[650px] bg-white dark:bg-surface-dark/95 backdrop-blur-2xl rounded-[40px] shadow-2xl p-8 lg:p-14 border border-gray-200 dark:border-white/10 transform transition-all">
          <div className="flex border-b border-gray-200 dark:border-white/5 mb-10">
            {[BookingCategory.INTERCITY, BookingCategory.AIRPORT].map((cat) => (
              <button 
                key={cat} 
                onClick={() => setActiveCategory(cat)} 
                className={`flex-1 pb-6 text-lg font-black transition-all ${activeCategory === cat ? 'border-b-4 border-primary text-primary' : 'text-slate-400 dark:text-text-muted hover:text-slate-900 dark:hover:text-white'}`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="space-y-8">
            <div className="flex p-2 bg-slate-50 dark:bg-background-dark/50 rounded-2xl border border-slate-200 dark:border-white/5">
              {[TripType.ONE_WAY, TripType.ROUND_TRIP].map((type) => (
                <button 
                  key={type} 
                  onClick={() => setTripType(type)} 
                  className={`flex-1 py-4 text-sm font-black rounded-xl transition-all ${tripType === type ? 'bg-white dark:bg-surface-dark-lighter shadow-lg text-primary scale-[1.02]' : 'text-slate-400 dark:text-text-muted hover:text-primary'}`}
                >
                  {type}
                </button>
              ))}
            </div>

            <div className="space-y-6">
              <div className="relative group">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 material-symbols-outlined text-primary text-2xl group-focus-within:scale-110 transition-transform">my_location</span>
                <input 
                  type="text" 
                  value={pickup} 
                  onChange={(e) => setPickup(e.target.value)} 
                  className="w-full pl-16 pr-8 py-6 rounded-[24px] bg-slate-100 dark:bg-background-dark/60 border-2 border-slate-200 dark:border-transparent focus:border-primary/40 text-lg font-bold transition-all outline-none text-slate-900 dark:text-white" 
                  placeholder="Collection Address" 
                />
              </div>

              <div className="relative group">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 material-symbols-outlined text-primary text-2xl group-focus-within:scale-110 transition-transform">location_on</span>
                <input 
                  type="text" 
                  value={dropoff} 
                  onChange={(e) => setDropoff(e.target.value)} 
                  className="w-full pl-16 pr-8 py-6 rounded-[24px] bg-slate-100 dark:bg-background-dark/60 border-2 border-slate-200 dark:border-transparent focus:border-primary/40 text-lg font-bold transition-all outline-none text-slate-900 dark:text-white" 
                  placeholder="Destination Address" 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Date Selection */}
                <div className="relative group md:col-span-1">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 material-symbols-outlined text-primary text-xl">calendar_month</span>
                  <input 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)} 
                    className="w-full pl-14 pr-4 py-5 rounded-[20px] bg-slate-100 dark:bg-background-dark/60 border-2 border-slate-200 dark:border-transparent focus:border-primary/40 text-sm font-bold transition-all outline-none text-slate-900 dark:text-white" 
                  />
                </div>
                
                {/* Passengers Counter */}
                <div className="flex items-center justify-between px-5 py-3 rounded-[20px] bg-slate-100 dark:bg-background-dark/60 border-2 border-slate-200 dark:border-transparent">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-text-muted">Passengers</span>
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-primary text-lg">person</span>
                      <span className="text-sm font-black text-slate-900 dark:text-white">{persons}</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button 
                      onClick={() => decrement(setPersons, persons, 1)}
                      className="size-7 rounded-lg flex items-center justify-center bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 hover:text-primary transition-all active:scale-90"
                    >
                      <span className="material-symbols-outlined text-base">remove</span>
                    </button>
                    <button 
                      onClick={() => increment(setPersons, persons, 8)}
                      className="size-7 rounded-lg flex items-center justify-center bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 hover:text-primary transition-all active:scale-90"
                    >
                      <span className="material-symbols-outlined text-base">add</span>
                    </button>
                  </div>
                </div>

                {/* Bags Counter */}
                <div className="flex items-center justify-between px-5 py-3 rounded-[20px] bg-slate-100 dark:bg-background-dark/60 border-2 border-slate-200 dark:border-transparent">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-text-muted">Bags</span>
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-primary text-lg">luggage</span>
                      <span className="text-sm font-black text-slate-900 dark:text-white">{luggage}</span>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button 
                      onClick={() => decrement(setLuggage, luggage, 0)}
                      className="size-7 rounded-lg flex items-center justify-center bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 hover:text-primary transition-all active:scale-90"
                    >
                      <span className="material-symbols-outlined text-base">remove</span>
                    </button>
                    <button 
                      onClick={() => increment(setLuggage, luggage, 12)}
                      className="size-7 rounded-lg flex items-center justify-center bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 hover:text-primary transition-all active:scale-90"
                    >
                      <span className="material-symbols-outlined text-base">add</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={handleSearch} 
              disabled={loading || !pickup || !dropoff} 
              className="group relative w-full overflow-hidden p-7 bg-primary text-white font-black text-xl rounded-[24px] shadow-2xl shadow-primary/40 hover:bg-primary-dark transition-all transform active:scale-[0.98] disabled:opacity-50"
            >
              <div className="relative z-10 flex items-center justify-center gap-4">
                {loading ? (
                   <span className="animate-spin material-symbols-outlined text-2xl">sync</span>
                ) : (
                  <>
                    <span>Generate Instant Quote</span>
                    <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform text-2xl">arrow_forward</span>
                  </>
                )}
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </button>
            
            <p className="text-center text-[11px] text-slate-500 dark:text-text-muted font-bold uppercase tracking-[0.2em] mt-6">
              Fixed pricing. No hidden fees. Guaranteed.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
