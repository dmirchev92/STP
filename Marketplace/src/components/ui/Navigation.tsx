import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Avatar } from './Avatar';
import { Badge } from './Badge';
import { Button } from './Button';

interface NavigationProps {
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    avatar?: string;
  };
  unreadCount?: number;
  onLogout?: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ user, unreadCount = 0, onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const router = useRouter();

  const navigationItems = [
    { href: '/', label: 'Начало', icon: '🏠' },
    { href: '/search', label: 'Търсене', icon: '🔍' },
    { href: '/create-case', label: 'Нова заявка', icon: '➕' },
    { href: '/dashboard', label: 'Табло', icon: '📊' },
  ];

  const userMenuItems = [
    { href: '/dashboard', label: 'Моето табло', icon: '📊' },
    { href: '/profile', label: 'Профил', icon: '👤' },
    { href: '/notifications', label: 'Известия', icon: '🔔', badge: unreadCount },
    { href: '/referrals', label: 'Препоръки', icon: '🎯' },
    { href: '/settings', label: 'Настройки', icon: '⚙️' },
  ];

  return (
    <nav className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center transform group-hover:scale-110 transition-transform duration-200">
              <span className="text-white font-bold text-sm">🔧</span>
            </div>
            <span className="text-xl font-bold text-slate-800">
              ServiceText Pro
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-600 hover:text-slate-700 hover:bg-slate-50 transition-all duration-200 group"
              >
                <span className="group-hover:scale-110 transition-transform duration-200">
                  {item.icon}
                </span>
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </div>

          {/* User Menu / Auth Buttons */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-50 transition-all duration-200 group"
                >
                  <Avatar
                    name={`${user.firstName} ${user.lastName}`}
                    src={user.avatar}
                    size="sm"
                    status="online"
                    showStatus
                  />
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-gray-900">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {user.role === 'service_provider' ? 'Доставчик' : 'Клиент'}
                    </p>
                  </div>
                  <svg
                    className={cn(
                      'w-4 h-4 text-gray-400 transition-transform duration-200',
                      isProfileMenuOpen && 'rotate-180'
                    )}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Profile Dropdown */}
                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    
                    {userMenuItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-slate-50 hover:text-slate-700 transition-colors duration-200"
                        onClick={() => setIsProfileMenuOpen(false)}
                      >
                        <div className="flex items-center space-x-3">
                          <span>{item.icon}</span>
                          <span>{item.label}</span>
                        </div>
                        {item.badge && item.badge > 0 && (
                          <Badge variant="error" size="sm">
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
                    ))}
                    
                    <div className="border-t border-gray-100 mt-2 pt-2">
                      <button
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          onLogout?.();
                        }}
                        className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                      >
                        <span>🚪</span>
                        <span>Изход</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/login')}
                >
                  Вход
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => router.push('/register')}
                >
                  Регистрация
                </Button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:text-slate-700 hover:bg-slate-50 transition-colors duration-200"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-slate-200 py-4">
            <div className="space-y-2">
              {navigationItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-600 hover:text-slate-700 hover:bg-slate-50 transition-colors duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span>{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Click outside to close menus */}
      {(isMenuOpen || isProfileMenuOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsMenuOpen(false);
            setIsProfileMenuOpen(false);
          }}
        />
      )}
    </nav>
  );
};

export { Navigation };
export type { NavigationProps };
