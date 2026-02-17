import React from 'react';
import { useStore } from '../../store';

export const QuestLog = () => {
    const quests = useStore(state => state.quests);

    return (
        <div className="absolute top-20 right-4 w-64 pointer-events-auto space-y-2 z-20">
            {quests.slice(-3).map(quest => (
                <div key={quest.id} className="bg-black/80 border-l-2 border-yellow-500 p-3 rounded shadow-lg backdrop-blur-sm">
                    <h4 className="text-yellow-400 font-serif text-sm font-bold flex justify-between">
                        {quest.title}
                        <span className="text-[9px] bg-yellow-900/50 px-1 rounded text-yellow-200">OPEN</span>
                    </h4>
                    <p className="text-gray-300 text-xs mt-1 italic leading-tight">"{quest.description}"</p>
                    <div className="mt-2 flex justify-between items-center text-[10px] text-gray-500 uppercase">
                         <span>Reward: {quest.rewardGold}g</span>
                    </div>
                </div>
            ))}
        </div>
    );
};