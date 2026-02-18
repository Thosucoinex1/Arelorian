
import React from 'react';
import { useStore } from '../../store';

export const EventOverlay = () => {
    const activeEvents = useStore(state => state.activeEvents);
    const raid = activeEvents.find(e => e.type === 'RAID' && e.active);

    if (!raid) return null;

    return (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 pointer-events-none w-full max-w-md animate-pulse">
            <div className="bg-red-900/80 border-2 border-red-500 rounded-lg p-4 backdrop-blur-md shadow-[0_0_30px_rgba(239,68,68,0.5)]">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-red-200 font-serif text-lg font-bold tracking-[0.3em] uppercase">WAR PROTOCOL</span>
                    <span className="text-white text-xs bg-red-600 px-2 py-0.5 rounded font-bold">RAID ACTIVE</span>
                </div>
                <h2 className="text-white text-2xl font-serif font-black mb-1">{String(raid.title)}</h2>
                <p className="text-red-100 text-xs italic mb-3 opacity-80">"{String(raid.description)}"</p>
                <div className="h-1.5 w-full bg-red-950 rounded-full overflow-hidden">
                    <div className="h-full bg-white animate-[shimmer_2s_infinite]" style={{ width: '100%' }}></div>
                </div>
                <div className="mt-2 text-[10px] text-red-200 text-center font-bold tracking-widest">DEFEND SANCTUARY (0,0) AT ALL COSTS</div>
            </div>
        </div>
    );
};
