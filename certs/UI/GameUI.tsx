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
import { GuildPartyOverlay } from './GuildPartyOverlay';

import { WindowHUD } from './WindowHUD';

const GameUI = () => {
  const windowStates = useStore(state => state.windowStates);

  return (
    <>
      {windowStates.CHARACTER.isOpen && !windowStates.CHARACTER.isMinimized && <CharacterSheet />}
      {windowStates.ADMIN.isOpen && !windowStates.ADMIN.isMinimized && <AdminDashboard />}
      {windowStates.MAP.isOpen && !windowStates.MAP.isMinimized && <WorldMap />}
      {windowStates.MARKET.isOpen && !windowStates.MARKET.isMinimized && <MarketOverlay />}
      {windowStates.AUCTION.isOpen && !windowStates.AUCTION.isMinimized && <AuctionHouseOverlay />}
      {windowStates.QUESTS.isOpen && !windowStates.QUESTS.isMinimized && <QuestBoardOverlay />}
      <EventOverlay />
      {windowStates.INSPECTOR.isOpen && !windowStates.INSPECTOR.isMinimized && <InspectorPanel />}
      {windowStates.GUILD_PARTY.isOpen && !windowStates.GUILD_PARTY.isMinimized && <GuildPartyOverlay />}
      {windowStates.CHAT.isOpen && !windowStates.CHAT.isMinimized && <ChatLog />}
      <WindowHUD />
    </>
  );
};

export default GameUI;
