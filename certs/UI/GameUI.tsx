import React from 'react';
import { useStore } from '../../store';
import { CharacterSheet } from './CharacterSheet';
import { AdminDashboard } from './AdminDashboard';
import { WorldMap } from './WorldMap';
import { AuctionHouseOverlay } from './AuctionHouseOverlay';
import { QuestBoardOverlay } from './QuestBoardOverlay';
import { EventOverlay } from './EventOverlay';
import { MarketOverlay } from './MarketOverlay';
import { InspectorPanel } from './InspectorPanel';
import { ChatLog } from './ChatLog';

const GameUI = () => {
  const showCharacterSheet = useStore(state => state.showCharacterSheet);
  const showAdmin = useStore(state => state.showAdmin);
  const showMap = useStore(state => state.showMap);
  const showMarket = useStore(state => state.showMarket);
  const showAuctionHouse = useStore(state => state.showAuctionHouse);
  const showQuests = useStore(state => state.showQuests);

  return (
    <>
      {showCharacterSheet && <CharacterSheet />}
      {showAdmin && <AdminDashboard />}
      {showMap && <WorldMap />}
      {showMarket && <MarketOverlay />}
      {showAuctionHouse && <AuctionHouseOverlay />}
      {showQuests && <QuestBoardOverlay />}
      <EventOverlay />
      <InspectorPanel />
      <ChatLog />
    </>
  );
};

export default GameUI;
