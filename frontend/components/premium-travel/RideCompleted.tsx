/* eslint-disable @next/next/no-img-element */

"use client";

import React, { useEffect, useState } from 'react';
import { RideData, SelectedVehicle } from './types';
import { DestinationHighlight, getDestinationHighlight, getRouteMapLink } from './services/client';

interface RideCompletedProps {
  rideData: RideData;
  selectedVehicle?: SelectedVehicle | null;
  onBack: () => void;
}

const RideCompleted: React.FC<RideCompletedProps> = ({ rideData, selectedVehicle, onBack }) => {
  const [mapLink, setMapLink] = useState<string>('');
  const [highlight, setHighlight] = useState<DestinationHighlight | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [link, spot] = await Promise.all([
          getRouteMapLink(rideData.pickup, rideData.dropoff),
          getDestinationHighlight(rideData.dropoff)
        ]);
        setMapLink(link);
        setHighlight(spot);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [rideData]);

  const handlePayment = async () => {
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsProcessing(false);
    setBookingConfirmed(true);
  };

  if (bookingConfirmed) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white dark:bg-background-dark p-12 text-center animate-in fade-in zoom-in duration-500">
        <div className="size-24 bg-green-500 rounded-full flex items-center justify-center text-white mb-8 shadow-2xl shadow-green-500/30">
          <span className="material-symbols-outlined text-5xl">check_circle</span>
        </div>
        <h2 className="text-5xl font-black mb-4 tracking-tighter">Booking Confirmed!</h2>
        <p className="text-text-muted text-xl max-w-lg mx-auto mb-10 font-medium">
          Your chauffeur has been dispatched. They will arrive at {rideData.pickup} on {rideData.date} for your {selectedVehicle?.miles || 'point-to-point'} mile journey to {rideData.dropoff}.
        </p>
        <div className="flex gap-4">
          <button onClick={() => window.location.reload()} className="px-10 py-5 bg-primary text-white font-black rounded-2xl shadow-2xl shadow-primary/30 hover:scale-105 transition-transform">
            Return to Dashboard
          </button>
          <button className="px-10 py-5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 font-black rounded-2xl hover:bg-gray-50 transition-colors">
            Share Receipt
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden bg-background-light dark:bg-background-dark">
      <aside className="w-full lg:w-[440px] bg-white dark:bg-surface-dark p-10 border-r border-white/5 flex flex-col h-full overflow-y-auto">
        <button onClick={onBack} className="flex items-center gap-2 text-text-muted hover:text-primary mb-12 text-xs font-black uppercase tracking-widest transition-colors">
          <span className="material-symbols-outlined text-sm">arrow_back</span> Return to Selection
        </button>
        
        <div className="mb-10">
          <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded uppercase tracking-[0.2em] border border-primary/20">Final Review</span>
          <h1 className="text-5xl font-black mt-4 leading-tight tracking-tighter">Secure <br/>Your Seat.</h1>
        </div>

        <div className="space-y-8 mb-10">
          {selectedVehicle && (
            <div className="bg-primary/5 p-6 rounded-[32px] border border-primary/20 shadow-sm relative overflow-hidden group">
               <div className="relative z-10 flex items-center gap-6">
                  <div className="size-20 rounded-[20px] overflow-hidden shadow-xl border border-white/10 shrink-0">
                    <img src={selectedVehicle.img} alt={selectedVehicle.model} className="w-full h-full object-cover" />
                  </div>
                  <div>
                     <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Vehicle Chosen</p>
                     <h3 className="font-black text-xl text-slate-900 dark:text-white">{selectedVehicle.model}</h3>
                     <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-widest">{selectedVehicle.miles} Miles Total</p>
                  </div>
               </div>
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <span className="material-symbols-outlined text-7xl">local_taxi</span>
               </div>
            </div>
          )}

          <div className="bg-gray-50 dark:bg-white/5 p-8 rounded-[32px] border border-gray-100 dark:border-white/5 shadow-sm">
             <div className="flex items-center gap-6 mb-6">
                <div className="relative">
                  <img src="https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&q=80&w=200" className="size-20 rounded-full border-2 border-primary object-cover shadow-xl" alt="Driver" />
                  <div className="absolute -bottom-1 -right-1 size-6 bg-green-500 border-2 border-white dark:border-surface-dark rounded-full shadow-lg"></div>
                </div>
                <div>
                   <h3 className="font-black text-xl text-slate-900 dark:text-white">Marcus Sterling</h3>
                   <p className="text-xs text-text-muted font-bold tracking-wide mt-1">Senior Chauffeur • 4.9/5 Rating</p>
                </div>
             </div>
             <div className="pt-6 border-t border-gray-100 dark:border-white/10">
                <p className="text-[10px] font-black text-text-muted uppercase mb-4 tracking-widest">Amenities Provided</p>
                <div className="flex flex-wrap gap-2">
                   <span className="px-3 py-1 bg-white dark:bg-white/5 rounded-full text-[10px] font-bold border border-gray-100 dark:border-white/5 flex items-center gap-2">
                     <span className="material-symbols-outlined text-sm text-primary">water_drop</span> Evian Water
                   </span>
                   <span className="px-3 py-1 bg-white dark:bg-white/5 rounded-full text-[10px] font-bold border border-gray-100 dark:border-white/5 flex items-center gap-2">
                     <span className="material-symbols-outlined text-sm text-primary">wifi</span> High-Speed WiFi
                   </span>
                </div>
             </div>
          </div>

          <div className="space-y-6 relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-200 dark:before:bg-white/5">
            <div className="relative">
              <span className="absolute -left-[1.625rem] top-1/2 -translate-y-1/2 size-4 bg-primary rounded-full ring-8 ring-primary/10"></span>
              <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Pickup Location</p>
              <p className="text-sm font-bold truncate text-slate-900 dark:text-white">{rideData.pickup}</p>
            </div>
            <div className="relative">
              <span className="absolute -left-[1.625rem] top-1/2 -translate-y-1/2 size-4 bg-blue-500 rounded-full ring-8 ring-blue-500/10"></span>
              <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Destination</p>
              <p className="text-sm font-bold truncate text-slate-900 dark:text-white">{rideData.dropoff}</p>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-8 border-t border-gray-100 dark:border-white/5 space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Total Fixed Fare</p>
              <p className="text-4xl font-black text-primary font-display">{selectedVehicle?.price || '£140.00'}</p>
            </div>
            <div className="text-right">
              <span className="material-symbols-outlined text-green-500 text-3xl">verified</span>
            </div>
          </div>
          <button 
            onClick={handlePayment}
            disabled={isProcessing}
            className="group w-full py-6 bg-primary text-white font-black rounded-[24px] shadow-3xl shadow-primary/30 transition-all hover:bg-primary-dark hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-4 disabled:opacity-70 text-sm uppercase tracking-widest"
          >
            {isProcessing ? (
               <span className="animate-spin material-symbols-outlined">sync</span>
            ) : (
              <>
                <span>Secure Booking</span>
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">lock</span>
              </>
            )}
          </button>
        </div>
      </aside>

      <main className="flex-1 bg-gray-50 dark:bg-black relative overflow-hidden">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background-light dark:bg-background-dark z-20">
            <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-8"></div>
            <h2 className="text-2xl font-black tracking-tight animate-pulse text-slate-900 dark:text-white font-display">Crafting your arrival...</h2>
            <p className="text-text-muted text-sm mt-2 font-medium">Securing regional insights for {rideData.dropoff}</p>
          </div>
        ) : highlight ? (
          <div className="h-full w-full relative animate-in fade-in duration-1000">
            <img 
              src={highlight.imageUrl} 
              alt={highlight.title} 
              className="absolute inset-0 w-full h-full object-cover scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
            
            <div className="absolute top-10 right-10 z-10 flex gap-4">
               <a 
                href={mapLink} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-3 px-8 py-4 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-full text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/25 transition-all shadow-2xl"
              >
                <span className="material-symbols-outlined text-lg">explore</span>
                View Journey Map
              </a>
            </div>

            <div className="absolute bottom-16 left-16 max-w-2xl">
              <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-primary rounded-full text-white text-[10px] font-black uppercase tracking-widest mb-8 shadow-2xl">
                <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                Elite Destination Preview
              </div>
              <h2 className="text-6xl md:text-8xl font-black text-white font-display mb-8 leading-tight drop-shadow-2xl">
                {highlight.title}
              </h2>
              <p className="text-white/90 text-xl md:text-2xl font-medium leading-relaxed drop-shadow-lg mb-10 max-w-xl">
                {highlight.description}
              </p>
              
              <div className="flex gap-6">
                <button className="px-10 py-5 bg-white text-black font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl hover:bg-primary hover:text-white transition-all shadow-2xl">
                  Local Concierge Guide
                </button>
                <button className="px-10 py-5 bg-white/10 border border-white/30 text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl hover:bg-white/20 transition-all backdrop-blur-xl">
                  Live Updates
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center bg-background-dark">
            <div className="size-24 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-10 border border-primary/20 shadow-2xl">
              <span className="material-symbols-outlined text-5xl">explore</span>
            </div>
            <h2 className="text-5xl font-black mb-6 text-white tracking-tighter">Route Ready.</h2>
            <p className="text-text-muted text-xl mb-12 max-w-md mx-auto font-medium">While we couldn&apos;t fetch a visual spotlight, your professional chauffeur is prepared for the {selectedVehicle?.miles || ''} mile journey to {rideData.dropoff}.</p>
            <a href={mapLink} target="_blank" rel="noreferrer" className="px-12 py-6 bg-primary text-white font-black rounded-[24px] shadow-3xl shadow-primary/30 uppercase tracking-widest text-sm hover:scale-105 transition-transform">
              Review Full Route Map
            </a>
          </div>
        )}
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] bg-[size:32px_32px]"></div>
      </main>
    </div>
  );
};

export default RideCompleted;