
import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';

export const QuestLog = () => {
    const quests = useStore(state => state.quests);
    const isMobile = useStore(state => state.device.isMobile);
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    // Only show quests that are at least 15 seconds old
    const visibleQuests = quests.filter(q => (now - q.timestamp) > 15000);

    return (
        <div className={`absolute pointer-events-auto space-y-2 z-20 ${isMobile ? 'top-2 right-12 w-48' : 'top-20 right-4 w-64'}`}>
            {visibleQuests.slice(-3).map(quest => (
                <div key={quest.id} className="bg-black/80 border-l-2 border-yellow-500 p-2 md:p-3 rounded shadow-lg backdrop-blur-sm animate-[fadeIn_0.5s_ease-in-out]">
                    <h4 className="text-yellow-400 font-serif text-xs md:text-sm font-bold flex justify-between">
                        {quest.title}
                        <span className="text-[9px] bg-yellow-900/50 px-1 rounded text-yellow-200">OPEN</span>
                    </h4>
                    <p className="text-gray-300 text-[10px] md:text-xs mt-1 italic leading-tight">"{quest.description}"</p>
                    <div className="mt-2 flex justify-between items-center text-[10px] text-gray-500 uppercase">
                         <span>Reward: {quest.rewardGold}g</span>
                    </div>
                </div>
            ))}
        </div>
    );
};
