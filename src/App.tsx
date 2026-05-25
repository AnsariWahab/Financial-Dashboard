import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Building2,
  FlaskConical,
  GraduationCap,
  Target,
  MessageSquare,
  Menu,
  X,
  Sun,
  Moon
} from 'lucide-react';

import { Overview } from './components/Overview';
import { CentreEconomics } from './components/CentreEconomics';
import { ResearchEconomics } from './components/ResearchEconomics';
import { SchoolEconomics } from './components/SchoolEconomics';
import { ImpactMetrics } from './components/ImpactMetrics';
import { AIChat } from './components/AIChat';

type Page =
  | 'overview'
  | 'centres'
  | 'research'
  | 'school'
  | 'impact';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('overview');
  const [showChat, setShowChat] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(prev => !prev);

  const menuItems = [
    {
      id: 'overview' as Page,
      label: 'Overview',
      icon: LayoutDashboard
    },
    {
      id: 'centres' as Page,
      label: 'Centre Economics',
      icon: Building2
    },
    {
      id: 'research' as Page,
      label: 'Research Economics',
      icon: FlaskConical
    },
    {
      id: 'school' as Page,
      label: 'School Economics',
      icon: GraduationCap
    },
    {
      id: 'impact' as Page,
      label: 'Impact Metrics',
      icon: Target
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 relative overflow-x-hidden">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-800 dark:to-blue-900 text-white shadow-lg sticky top-0 z-40">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 hover:bg-blue-500 rounded-lg transition-colors"
              >
                {sidebarOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>

              <div>
                <h1 className="text-2xl font-bold">
                  Financial Dashboard
                </h1>

                <p className="text-blue-100 text-sm">
                  AI-Powered Analytics Platform
                </p>
              </div>
            </div>

            {/* Right side buttons */}
            <div className="flex items-center gap-2">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* AI Button */}
              <button
                onClick={() => setShowChat(!showChat)}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                <MessageSquare className="w-5 h-5" />
                <span className="hidden sm:inline">AI Assistant</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Layout */}
      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`
            ${
              sidebarOpen
                ? 'translate-x-0'
                : '-translate-x-full'
            }
            lg:translate-x-0
            fixed
            lg:sticky
            top-[73px]
            left-0
            h-[calc(100vh-73px)]
            w-64
            bg-white
            dark:bg-gray-800
            shadow-lg
            transition-transform
            duration-300
            ease-in-out
            z-30
          `}
        >
          <nav className="p-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;

              const isActive =
                currentPage === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentPage(item.id);

                    if (window.innerWidth < 1024) {
                      setSidebarOpen(false);
                    }
                  }}
                  className={`
                    w-full
                    flex
                    items-center
                    gap-3
                    px-4
                    py-3
                    rounded-lg
                    transition-colors
                    ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />

                  <span className="font-medium">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Bottom Info */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <p className="font-semibold">
                💡 Integration Ready
              </p>

              <p>
                Connect to your Python backend by
                updating the API endpoints in the
                data service.
              </p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {currentPage === 'overview' && (
              <Overview />
            )}

            {currentPage === 'centres' && (
              <CentreEconomics />
            )}

            {currentPage === 'research' && (
              <ResearchEconomics />
            )}

            {currentPage === 'school' && (
              <SchoolEconomics />
            )}

            {currentPage === 'impact' && (
              <ImpactMetrics />
            )}
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* AI Backdrop */}
      {showChat && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={() => setShowChat(false)}
        />
      )}

      {/* AI Chat Panel */}
      <aside
        className={`
          fixed
          top-[73px]
          right-0
          h-[calc(100vh-73px)]
          w-full
          sm:w-[420px]
          bg-white
          dark:bg-gray-800
          shadow-2xl
          z-50
          transition-transform
          duration-300
          ease-in-out
          ${
            showChat
              ? 'translate-x-0'
              : 'translate-x-full'
          }
        `}
      >
        <AIChat />
      </aside>
    </div>
  );
}

export default App;