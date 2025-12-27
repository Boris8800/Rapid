
"use client";

import React from 'react';

const Routes: React.FC = () => {
  const routes = [
    { from: 'London', to: 'Oxford', time: '1h 45m', price: '£180' },
    { from: 'Manchester', to: 'Edinburgh', time: '4h 15m', price: '£420' },
    { from: 'Heathrow Airport', to: 'Central London', time: '1h 10m', price: '£95' }
  ];

  return (
    <section className="py-24 bg-background-light dark:bg-background-dark border-t border-gray-200 dark:border-surface-dark-lighter">
      <div className="max-w-7xl mx-auto px-6 md:px-10 flex flex-col lg:flex-row gap-16">
        <div className="flex-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-surface-dark-lighter mb-6">
            <span className="text-xs font-bold text-primary tracking-wide uppercase">Popular UK Routes</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-8">Seamless Connectivity</h2>
          <p className="text-text-muted mb-10 leading-relaxed text-lg">
            Reliable chauffeur services across the United Kingdom. We navigate the motorway network so you don&apos;t have to.
          </p>
          
          <div className="flex flex-col gap-5">
            {routes.map((r, i) => (
              <a 
                key={i} 
                className="flex items-center justify-between p-6 rounded-2xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-surface-dark-lighter hover:border-primary hover:scale-[1.02] hover:bg-slate-50 dark:hover:bg-surface-dark-lighter/40 hover:shadow-xl dark:hover:shadow-primary/5 group transition-all duration-300 ease-out" 
                href="#"
              >
                <div className="flex items-center gap-6">
                  <div className="size-12 rounded-full bg-gray-100 dark:bg-surface-dark-lighter flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                    <span className="material-symbols-outlined">east</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-lg">
                      {r.from} <span className="text-text-muted px-2 font-medium">to</span> {r.to}
                    </h4>
                    <p className="text-xs text-text-muted font-medium mt-1">Est. {r.time} • Fixed at {r.price}</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all duration-300">chevron_right</span>
              </a>
            ))}
          </div>
        </div>
        
        <div className="flex-1 h-[450px] lg:h-auto rounded-3xl overflow-hidden relative shadow-2xl border border-white/5 group">
          <div 
            className="absolute inset-0 bg-cover bg-center transition-transform duration-[10s] group-hover:scale-110" 
            style={{ backgroundImage: `url('https://images.unsplash.com/photo-1520986606214-8b456906c813?auto=format&fit=crop&q=80&w=800')` }}
          />
          <div className="absolute inset-0 bg-blue-900/30 mix-blend-multiply"></div>
          
          <div className="absolute bottom-8 left-8 right-8 bg-surface-dark/95 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="size-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">explore</span>
              </div>
              <div>
                <h5 className="text-white font-bold text-base">Route Knowledge</h5>
                <p className="text-text-muted text-xs mt-2 leading-relaxed">
                  Our chauffeurs possess expert knowledge of UK road networks, Congestion Charge zones, and optimal routes for timely arrival.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Routes;
