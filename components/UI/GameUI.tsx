import React from 'react';
import { useStore } from '../../store';
import { CharacterSheet } from './CharacterSheet';
import { QuestLog } from './QuestLog';
import { AdminDashboard } from './AdminDashboard';
import { WorldMap } from './WorldMap';
import { AuctionHouse } from './AuctionHouse';
import { MarketOverlay } from './MarketOverlay';
import { InspectorPanel } from './InspectorPanel';

const GameUI = () => {
  const showCharacterSheet = useStore(state => state.showCharacterSheet);
  const showAdmin = useStore(state => state.showAdmin);
  const showMap = useStore(state => state.showMap);
  const showMarket = useStore(state => state.showMarket);

  return (
    <>
      {showCharacterSheet && <CharacterSheet />}
      {showAdmin && <AdminDashboard />}
      {showMap && <WorldMap />}
      {showMarket && <MarketOverlay />}
      <QuestLog />
      <AuctionHouse />
      <InspectorPanel />
    </>
  );
};

export default GameUI;
