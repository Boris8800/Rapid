"use client";

import React from 'react';

const Features: React.FC = () => {
  const features = [
    {
      icon: 'airline_seat_recline_extra',
      title: 'Premium Comfort',
      desc: 'Spacious legroom, climate control, and pristine interiors ensure you arrive refreshed, no matter the distance.'
    },
    {
      icon: 'verified_user',
      title: 'Expert Chauffeurs',
      desc: 'Our professional drivers possess long experience and unmatched road knowledge, ensuring safe and smooth intercity travel.'
    },
    {
      icon: 'schedule',
      title: 'Always On Time',
      desc: 'Our advanced tracking and seasoned chauffeurs guarantee a 99.9% on-time arrival rate for every UK journey.'
    }
  ];

  return (
    <section className="py-24 bg-white dark:bg-background-dark relative">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded uppercase tracking-[0.2em] mb-4">
            Our Commitment
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white mb-4 tracking-tighter">Why Choose Rapid Roads?</h2>
          <p className="text-slate-500 dark:text-text-muted max-w-2xl mx-auto text-lg font-medium">We redefine long-distance travel with professional drivers and a heritage of excellence.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <div key={i} className="group p-10 rounded-[32px] bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-surface-dark-lighter hover:border-primary transition-all hover:shadow-2xl hover:-translate-y-2">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-8 group-hover:bg-primary group-hover:text-white transition-all text-primary shadow-lg shadow-primary/10">
                <span className="material-symbols-outlined text-4xl">{f.icon}</span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4">{f.title}</h3>
              <p className="text-slate-600 dark:text-text-muted leading-relaxed text-base font-medium">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;