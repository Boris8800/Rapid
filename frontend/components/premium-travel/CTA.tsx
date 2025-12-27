"use client";

import React from 'react';

interface CTAProps {
  onBookClick?: () => void;
}

const CTA: React.FC<CTAProps> = ({ onBookClick }) => {
  const companyServices = [
    {
      title: "Airport Transfers",
      icon: "flight_takeoff",
      desc: "Fixed-rate transfers to all major UK airports with meet & greet service as standard for families and private travelers."
    },
    {
      title: "Intercity Chauffeur",
      icon: "distance",
      desc: "Door-to-door nationwide transfers with professional drivers and long experience. Travel in the comfort of our elite fleet."
    },
    {
      title: "Special Events",
      icon: "celebration",
      desc: "Coordinated transport for private gatherings, weddings, and exclusive personal events."
    }
  ];

  return (
    <section className="relative min-h-[800px] flex items-center justify-center py-24 overflow-hidden">
      {/* Cinematic Airport Background with Airplane */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-transform duration-[30s] scale-110"
        style={{ 
          backgroundImage: `linear-gradient(rgba(12, 11, 9, 0.6), rgba(12, 11, 9, 0.9)), url('https://images.unsplash.com/photo-1436491865332-7a61a109c055?auto=format&fit=crop&q=85&w=2400')`,
          backgroundAttachment: 'fixed'
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/20 border border-primary/30 mb-8 backdrop-blur-md">
              <span className="material-symbols-outlined text-primary text-sm">auto_awesome</span>
              <span className="text-[11px] font-black text-primary tracking-[0.2em] uppercase">Refined Solutions</span>
            </div>
            
            <h2 className="text-5xl md:text-7xl font-black text-white mb-8 leading-[0.9] tracking-tighter">
              Bespoke <br/>
              <span className="text-primary italic font-display">Travel Services</span>
            </h2>
            
            <p className="text-slate-200 text-xl font-medium mb-12 max-w-xl leading-relaxed">
              We provide more than just a ride. Our refined travel options are tailored to the discerning schedules of private individuals and specialized event logistics.
            </p>

            <div className="flex flex-col sm:flex-row gap-6">
              <button 
                onClick={onBookClick}
                className="px-10 py-5 bg-primary text-white font-black rounded-[20px] shadow-2xl shadow-primary/30 hover:bg-primary-dark transition-all transform hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-4 text-sm uppercase tracking-widest"
              >
                Book Your Experience
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {companyServices.map((service, idx) => (
              <div 
                key={idx} 
                className="group p-8 rounded-[32px] bg-white/5 backdrop-blur-2xl border border-white/10 hover:border-primary/50 transition-all duration-500 hover:bg-white/10 flex items-start gap-6"
              >
                <div className="shrink-0 size-14 rounded-2xl bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-lg shadow-primary/5">
                  <span className="material-symbols-outlined text-3xl">{service.icon}</span>
                </div>
                <div>
                  <h4 className="text-xl font-black text-white mb-2 tracking-tight">{service.title}</h4>
                  <p className="text-slate-300 text-sm leading-relaxed font-medium">
                    {service.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Decorative stats bar */}
        <div className="mt-24 pt-12 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-12">
          <div className="text-center md:text-left">
            <p className="text-4xl font-black text-white mb-1 font-display tracking-tight">25+</p>
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">UK Airports</p>
          </div>
          <div className="text-center md:text-left">
            <p className="text-4xl font-black text-white mb-1 font-display tracking-tight">100%</p>
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Flight Tracking</p>
          </div>
          <div className="text-center md:text-left">
            <p className="text-4xl font-black text-white mb-1 font-display tracking-tight">4.9/5</p>
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Client Rating</p>
          </div>
          <div className="text-center md:text-left">
            <p className="text-4xl font-black text-white mb-1 font-display tracking-tight">24/7</p>
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Support</p>
          </div>
        </div>
      </div>
      
      {/* Grainy overlay for cinematic feel */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
    </section>
  );
};

export default CTA;