import React from 'react';
import { UserRole } from '../types';

export type TabType =
  | 'dashboard'
  | 'admin'
  | 'channels'
  | 'private_chat'
  | 'history'
  | 'roadmap'
  | 'settings';

interface NavbarProps {
  activeTab: TabType;
  userRole?: UserRole;
  onSelectTab?: (tab: TabType) => void;
  onTabChange?: (tab: TabType) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  userRole = 'user',
  onSelectTab,
  onTabChange,
}) => {
  const handleSelect = (tab: TabType) => {
    onSelectTab?.(tab);
    onTabChange?.(tab);
  };
  const navItems: {
    id: TabType;
    label: string;
    materialIcon: string;
  }[] =
    userRole === 'moderator'
      ? [
          { id: 'dashboard', label: 'الرئيسية', materialIcon: 'home' },
          { id: 'channels', label: 'القنوات', materialIcon: 'groups' },
          { id: 'private_chat', label: 'خاص Sami', materialIcon: 'forum' },
          { id: 'settings', label: 'الإعدادات', materialIcon: 'settings' },
        ]
      : userRole === 'owner'
      ? [
          { id: 'dashboard', label: 'الرئيسية', materialIcon: 'home' },
          { id: 'admin', label: 'الإدارة', materialIcon: 'admin_panel_settings' },
          { id: 'channels', label: 'القنوات', materialIcon: 'groups' },
          { id: 'history', label: 'سجل الصفقات', materialIcon: 'menu_book' },
          { id: 'roadmap', label: 'المحطات', materialIcon: 'location_on' },
          { id: 'settings', label: 'الإعدادات', materialIcon: 'settings' },
        ]
      : [
          { id: 'dashboard', label: 'الرئيسية', materialIcon: 'home' },
          { id: 'channels', label: 'القنوات', materialIcon: 'groups' },
          { id: 'history', label: 'سجل الصفقات', materialIcon: 'menu_book' },
          { id: 'roadmap', label: 'المحطات', materialIcon: 'location_on' },
          { id: 'settings', label: 'الإعدادات', materialIcon: 'settings' },
        ];

  return (
    <nav className="sticky bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-[#050811] via-[#080d1a]/98 to-[#0b1222]/95 backdrop-blur-xl border-t border-amber-500/20 px-1.5 pt-2 pb-2.5 select-none shadow-[0_-10px_30px_rgba(0,0,0,0.75)]">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive =
            activeTab === item.id ||
            (item.id === 'channels' && activeTab === 'private_chat' && userRole !== 'moderator');

          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-2xl transition-all duration-200 cursor-pointer active:scale-90 min-w-[54px] group ${
                isActive
                  ? 'text-amber-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {/* Subtle Ambient Golden Glow behind active icon */}
              {isActive && (
                <div className="absolute -top-1 w-10 h-10 bg-amber-400/15 rounded-full blur-md pointer-events-none" />
              )}

              <span
                className={`${
                  isActive ? 'material-symbols-filled scale-110' : 'material-symbols-rounded'
                } text-[24px] transition-transform duration-200 ${
                  isActive
                    ? 'text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.65)]'
                    : 'text-slate-400 group-hover:text-slate-200'
                }`}
              >
                {item.materialIcon}
              </span>

              <span
                className={`text-[10.5px] mt-1 tracking-tight transition-colors duration-200 whitespace-nowrap ${
                  isActive
                    ? 'font-black text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]'
                    : 'font-semibold text-slate-400'
                }`}
              >
                {item.label}
              </span>

              {/* Glowing Golden Indicator Line Below Selected Item */}
              <div
                className={`mt-1.5 h-[3px] rounded-full transition-all duration-300 ${
                  isActive
                    ? 'w-8 bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 shadow-[0_0_10px_rgba(251,191,36,0.9)] opacity-100'
                    : 'w-0 bg-transparent opacity-0'
                }`}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
};
