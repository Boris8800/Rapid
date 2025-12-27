/* eslint-disable @next/next/no-img-element */

"use client";

import React, { useEffect, useRef, useState } from 'react';

interface VehicleCardProps {
  vehicle: {
    name: string;
    model: string;
    sub: string;
    seats: number;
    bags: number;
    img: string;
    tag?: string;
  };
  index: number;
  isVisible: boolean;
}

const FleetCard: React.FC<VehicleCardProps> = ({ vehicle, index, isVisible }) => {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [imgLoaded, setImgLoaded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const moveX = (e.clientX - centerX) / (rect.width / 2);
    const moveY = (e.clientY - centerY) / (rect.height / 2);
    setOffset({ x: moveX * -12, y: moveY * -12 });
  };

  const handleMouseLeave = () => setOffset({ x: 0, y: 0 });

  return (
    <div 
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transitionDelay: `${index * 150}ms` }}
      className={`group relative rounded-[32px] overflow-hidden bg-white dark:bg-surface-dark border border-gray-100 dark:border-white/5 hover:shadow-3xl flex flex-col h-full transition-all duration-1000 ease-out transform ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'
      }`}
    >
      <div className="h-72 overflow-hidden relative bg-slate-900">
        {isVisible && (
           <img 
            src={vehicle.img}
            alt={`${vehicle.name} ${vehicle.model}`}
            onLoad={() => setImgLoaded(true)}
            loading="lazy"
            className={`absolute inset-[-20px] w-[calc(100%+40px)] h-[calc(100%+40px)] object-cover transition-all duration-1000 ease-out ${imgLoaded ? 'opacity-100 scale-100 grayscale-[0.2] group-hover:grayscale-0' : 'opacity-0 scale-110'}`}
            style={{ 
              transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-60"></div>
        
        {vehicle.tag && (
          <div className="absolute top-6 right-6 bg-primary/90 backdrop-blur-md px-4 py-1.5 rounded-full text-white text-[10px] font-black uppercase tracking-[0.2em] z-10 shadow-xl border border-white/20">
            {vehicle.tag}
          </div>
        )}
        {!imgLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      <div className="p-10 flex flex-col flex-grow relative">
        <div className="mb-6">
          <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-2">{vehicle.name}</p>
          <h3 className="text-3xl font-black text-slate-900 dark:text-white leading-tight font-display">{vehicle.model}</h3>
        </div>
        
        <p className="text-sm text-text-muted mb-8 leading-relaxed font-medium">
          {vehicle.sub}
        </p>
        
        <div className="flex gap-4 mb-10">
          <div className="flex-1 flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 group-hover:bg-primary/5 transition-colors">
            <span className="material-symbols-outlined text-primary mb-2 text-2xl">airline_seat_recline_normal</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Seats: {vehicle.seats}</span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 group-hover:bg-primary/5 transition-colors">
            <span className="material-symbols-outlined text-primary mb-2 text-2xl">luggage</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Bags: {vehicle.bags}</span>
          </div>
        </div>

        <button className="relative overflow-hidden mt-auto w-full py-5 rounded-[20px] bg-slate-900 dark:bg-primary text-white font-black text-xs uppercase tracking-[0.3em] shadow-2xl transition-all transform hover:scale-[1.02] active:scale-95 group-hover:bg-primary group-hover:text-white">
          <span className="relative z-10">Book This Experience</span>
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </button>
      </div>
    </div>
  );
};

const Fleet: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setIsVisible(true); observer.unobserve(entry.target); }
    }, { threshold: 0.1 });
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const vehicles = [
    {
      name: 'Saloon Experience',
      model: 'Tesla Model S',
      sub: 'An ultra-quiet cabin and smooth ride quality designed for total relaxation. Experience the future of premium private travel.',
      seats: 3, bags: 3,
      img: 'https://images.unsplash.com/photo-1536700503339-1e4b06520771?q=85&w=1600&auto=format&fit=crop',
      tag: 'Quiet & Refined'
    },
    {
      name: 'SUV Excellence',
      model: 'Mitsubishi Outlander',
      sub: 'Exceptional space and a commanding view of the road. Perfect for families seeking a safe, versatile, and high-end journey.',
      seats: 4, bags: 4,
      img: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=85&w=1600&auto=format&fit=crop',
      tag: 'Spacious Comfort'
    },
    {
      name: 'MPV Voyager',
      model: 'Volkswagen Sharan',
      sub: 'The ultimate choice for group transfers. Generous seating and ample storage without compromising on passenger comfort.',
      seats: 6, bags: 5,
      img: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?q=85&w=1600&auto=format&fit=crop',
      tag: 'Group Travel'
    },
    {
      name: 'Elite Class',
      model: 'Mercedes-Benz S-Class',
      sub: 'A benchmark in premium travel. Impeccable attention to detail and a smooth-as-glass ride for the most discerning travelers.',
      seats: 3, bags: 2,
      img: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?q=85&w=1600&auto=format&fit=crop',
      tag: 'Iconic Excellence'
    },
    {
      name: 'Executive MPV',
      model: 'Mercedes-Benz V-Class',
      sub: 'A masterpiece of versatility and luxury. Perfectly configured for small groups or executive board meetings on the move.',
      seats: 7, bags: 6,
      img: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?q=85&w=1600&auto=format&fit=crop',
      tag: '7-Seater Luxury'
    },
    {
      name: 'Elite Group Travel',
      model: 'Mercedes-Benz Vito Tourer',
      sub: 'Maximum capacity without compromising on elegance. The premier choice for large families and high-end group logistics.',
      seats: 8, bags: 8,
      img: 'https://images.unsplash.com/photo-1621285853634-713b8dd6b5ee?q=85&w=1600&auto=format&fit=crop',
      tag: '8-Seater Prestige'
    }
  ];

  const displayedVehicles = showAll ? vehicles : vehicles.slice(0, 3);

  return (
    <section ref={sectionRef} className="py-32 bg-background-light dark:bg-background-dark relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-12">
          <div className="max-w-3xl text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-8">
               <span className="material-symbols-outlined text-primary text-sm">auto_awesome</span>
               <span className="text-[11px] font-black text-primary tracking-[0.3em] uppercase">The Showroom</span>
            </div>
            <h2 className="text-6xl md:text-8xl font-black mb-8 leading-[0.9] tracking-tighter">
              Bespoke <br/>
              <span className="text-primary italic font-display">Fleet</span>
            </h2>
            <p className="text-text-muted text-xl md:text-2xl font-medium leading-relaxed max-w-2xl">
              Our curated collection features a hand-picked selection of prestigious vehicles, ensuring every mile is traveled in absolute refinement and cinematic comfort.
            </p>
          </div>
          
          <button 
            onClick={() => setShowAll(!showAll)}
            className="group flex items-center gap-6 px-10 py-5 rounded-[24px] border border-primary/30 text-primary font-black uppercase tracking-[0.3em] text-[11px] hover:bg-primary hover:text-white transition-all shadow-2xl shadow-primary/5 active:scale-95"
          >
            {showAll ? 'Collapse' : 'View Full Fleet'}
            <span className={`material-symbols-outlined transition-transform duration-500 ${showAll ? 'rotate-180' : 'group-hover:translate-x-2'}`}>
              {showAll ? 'expand_less' : 'arrow_forward'}
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {displayedVehicles.map((v, i) => (
            <FleetCard key={i} vehicle={v} index={i} isVisible={isVisible} />
          ))}
        </div>
      </div>
      
      {/* Cinematic decorative background elements */}
      <div className="absolute top-1/4 -right-64 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 -left-64 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none"></div>
    </section>
  );
};

export default Fleet;
