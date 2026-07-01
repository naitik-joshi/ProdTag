import {Gauge, Keyboard, Music2, Plug, Settings, SlidersHorizontal} from 'lucide-react';
import {PageKey, PageNavItem} from '../types/app';
import {classNames} from '../utils/classNames';
import {StatusMessage} from './StatusMessage';

type SidebarProps = {
  activePage: PageKey;
  pages: PageNavItem[];
  statusMessage: string;
  onNavigate: (page: PageKey) => void;
};

export function Sidebar({activePage, pages, statusMessage, onNavigate}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="mb-7">
        <div className="text-xl font-semibold">ProdTag</div>
        <div className="mt-1 text-sm text-neutral-300">Terminal sound control</div>
      </div>

      <nav className="space-y-1">
        {pages.map((page) => {
          const isActive = activePage === page.key;
          return (
            <button
              key={page.key}
              type="button"
              className={classNames('sidebar-link', isActive ? 'sidebar-link-active' : 'sidebar-link-idle')}
              onClick={() => onNavigate(page.key)}
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                {navIcon(page.key)}
                {page.label}
              </span>
              <span className="text-xs text-neutral-500">{page.hint}</span>
            </button>
          );
        })}
      </nav>

      <StatusMessage message={statusMessage} />
    </aside>
  );
}

function navIcon(page: PageKey) {
  const iconProps = {size: 16, strokeWidth: 2};
  switch (page) {
    case 'dashboard':
      return <Gauge {...iconProps} />;
    case 'sounds':
      return <Music2 {...iconProps} />;
    case 'rules':
      return <SlidersHorizontal {...iconProps} />;
    case 'hotkeys':
      return <Keyboard {...iconProps} />;
    case 'integrations':
      return <Plug {...iconProps} />;
    case 'settings':
      return <Settings {...iconProps} />;
  }
}
