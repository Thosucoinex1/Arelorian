
import { useStore } from '../../store';
import { WindowType } from '../../types';
import { 
  LayoutDashboard, 
  Map as MapIcon, 
  User, 
  ShoppingCart, 
  ScrollText, 
  Gavel,
  MessageSquare,
  Search,
  Users
} from 'lucide-react';

const WINDOW_ICONS: Record<WindowType, any> = {
  ADMIN: LayoutDashboard,
  MAP: MapIcon,
  CHARACTER: User,
  MARKET: ShoppingCart,
  QUESTS: ScrollText,
  AUCTION: Gavel,
  CHAT: MessageSquare,
  INSPECTOR: Search,
  GUILD_PARTY: Users
};

export const WindowHUD = () => {
  const windowStates = useStore(state => state.windowStates);
  const restoreWindow = useStore(state => state.restoreWindow);
  const device = useStore(state => state.device);

  const minimizedWindows = (Object.entries(windowStates) as [WindowType, any][])
    .filter(([_, state]) => state.isMinimized);

  if (minimizedWindows.length === 0) return null;

  return (
    <div className={`fixed ${device.isMobile ? 'bottom-20 left-1/2 -translate-x-1/2' : 'top-4 right-20'} z-[100] flex gap-2 p-2 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl`}>
      {minimizedWindows.map(([type, _]) => {
        const Icon = WINDOW_ICONS[type];
        return (
          <button
            key={type}
            onClick={() => restoreWindow(type)}
            className="w-10 h-10 flex items-center justify-center bg-axiom-purple/20 hover:bg-axiom-purple/40 border border-axiom-purple/50 rounded-xl text-axiom-purple transition-all hover:scale-110 active:scale-90"
            title={`Restore ${type}`}
          >
            <Icon className="w-5 h-5" />
          </button>
        );
      })}
    </div>
  );
};
