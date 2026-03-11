import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { 
        Home, Calendar, Clock, FileText, Users, 
                      Menu, X, LogOut, User, Settings, ChevronDown, Sparkles, Gift, CheckCircle, Lock, MessageCircle, Bell, Truck
      } from "lucide-react";
import NotificationBell from './components/notifications/NotificationBell';

const navigation = [
  { name: 'ホーム', href: 'Home', icon: Home },
  { name: '単発', href: 'Shifts', icon: Calendar },
  { name: '勤怠', href: 'Attendance', icon: Clock },
  { name: '応募履歴', href: 'MyApplications', icon: FileText },
  { name: 'メッセージ', href: 'Messages', icon: MessageCircle },
  { name: 'シフト', href: 'MyShift', icon: Calendar },
  { name: '送迎', href: 'Transport', icon: Truck },
  { name: '残業申請', href: 'OvertimeRequest', icon: Clock },
  { name: 'サンクス', href: 'TipsHistory', icon: Sparkles },
  { name: '福利厚生', href: 'Benefits', icon: Gift },
  ];

  const adminNavigation = [
  { name: '勤怠承認', href: 'AttendanceApproval', icon: CheckCircle },
  ];

  // デバッグ用：adminNavigationが正しく定義されていることを確認

const settingsNavigation = [
  { name: '通知設定', href: 'NotificationSettings' },
];



export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [officeName, setOfficeName] = useState('');
  const [logoChar, setLogoChar] = useState('');

  useEffect(() => {
    // スマホキャッシュ対策：バージョンチェックと強制更新
    const checkAndUpdateVersion = async () => {
      try {
        const savedVersion = localStorage.getItem('app_build_version');
        
        if (savedVersion !== APP_BUILD_VERSION) {
          console.log(`[Version Update] ${savedVersion} → ${APP_BUILD_VERSION}`);
          
          // バージョン更新
          localStorage.setItem('app_build_version', APP_BUILD_VERSION);
          
          // Service Worker キャッシュクリア試行
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(registrations => {
              registrations.forEach(reg => {
                console.log('[SW] Unregistering:', reg.scope);
                reg.unregister();
              });
            });
          }
          
          // Cache Storage クリア試行
          if ('caches' in window) {
            caches.keys().then(names => {
              names.forEach(name => {
                console.log('[Cache] Deleting:', name);
                caches.delete(name);
              });
            });
          }
          
          // IndexedDB もクリア
          if ('indexedDB' in window && 'databases' in indexedDB) {
            try {
              const dbs = await indexedDB.databases();
              dbs.forEach(db => {
                console.log('[IndexedDB] Deleting:', db.name);
                indexedDB.deleteDatabase(db.name);
              });
            } catch (e) {
              console.log('[IndexedDB] Clear error:', e);
            }
          }
          
          // 旧バージョンから移行の場合は強制リロード
          if (savedVersion) {
            console.log('[Reload] Forcing reload for cache clear...');
            setTimeout(() => {
              window.location.reload();
            }, 500);
            return;
          }
        }
      } catch (error) {
        console.error('[Version Check Error]', error);
      }
    };
    
    checkAndUpdateVersion().catch(e => console.error('[Version Check Error]', e));

    base44.entities.SiteSettings.list().then(settings => {
      if (settings.length > 0) {
        if (settings[0].office_name) setOfficeName(settings[0].office_name);
        if (settings[0].logo_char) setLogoChar(settings[0].logo_char);
      }
    }).catch(() => {});

    base44.auth.me().then(async (u) => {
      if (u) {
        // Check if user is admin in User entity
        if (u.role === 'admin') {
          setIsAdmin(true);
        }
        
        // Check Staff entity role and get full name
        const staffList = await base44.entities.Staff.filter({ email: u.email });
        if (staffList.length > 0) {
          u.full_name = staffList[0].full_name;
          if (staffList[0].role === 'admin') {
            setIsAdmin(true);
          }
        }
      }
      setUser(u);
    }).catch(() => {});
  }, []);

  const isHome = currentPageName === 'Home';

  if (isHome) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={createPageUrl('Home')} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2D4A6F] to-[#1E3A5F] flex items-center justify-center">
                <span className="text-white font-medium text-sm">{logoChar || officeName?.[0] || '輪'}</span>
              </div>
              <span className="text-lg font-medium text-slate-800 hidden md:hidden">{officeName || 'おんくりの輪'}</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navigation.map((item) => {
                const isActive = currentPageName === item.href;
                return (
                  <Link key={item.name} to={createPageUrl(item.href)}>
                    <Button
                      variant="ghost"
                      className={`${
                        isActive 
                          ? 'bg-[#2D4A6F]/5 text-[#2D4A6F]' 
                          : 'text-slate-600 hover:text-[#2D4A6F] hover:bg-slate-50'
                      }`}
                    >
                      <item.icon className="w-4 h-4 mr-2" />
                      {item.name}
                    </Button>
                  </Link>
                );
              })}
              {isAdmin && adminNavigation.map((item) => (
                <Link key={item.name} to={createPageUrl(item.href)}>
                  <Button
                    variant="ghost"
                    className={`${
                      currentPageName === item.href
                        ? 'bg-[#2D4A6F]/5 text-[#2D4A6F]' 
                        : 'text-slate-600 hover:text-[#2D4A6F] hover:bg-slate-50'
                    }`}
                  >
                    <item.icon className="w-4 h-4 mr-2" />
                    {item.name}
                  </Button>
                </Link>
              ))}
              {isAdmin && (
                <Link to={createPageUrl('AdminPanel')}>
                  <Button
                    variant="ghost"
                    className={`${
                      currentPageName === 'AdminPanel'
                        ? 'bg-[#2D4A6F]/5 text-[#2D4A6F]' 
                        : 'text-slate-600 hover:text-[#2D4A6F] hover:bg-slate-50'
                    }`}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    管理
                  </Button>
                </Link>
              )}
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-2">
              {user && <NotificationBell userEmail={user.email} />}
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#E8A4B8]/20 flex items-center justify-center">
                        <span className="text-sm font-medium text-[#C17A8E]">
                          {user.full_name?.[0] || user.email?.[0]?.toUpperCase()}
                        </span>
                      </div>
                      <span className="hidden sm:block text-slate-700">{user.full_name || user.email}</span>
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-2">
                      <p className="text-sm font-medium text-slate-800">{user.full_name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <Link to={createPageUrl('Dashboard')}>
                      <DropdownMenuItem className="cursor-pointer">
                        <User className="w-4 h-4 mr-2" />
                        ダッシュボード
                      </DropdownMenuItem>
                    </Link>
                    <Link to={createPageUrl('Notifications')}>
                      <DropdownMenuItem className="cursor-pointer">
                        <Bell className="w-4 h-4 mr-2" />
                        通知一覧
                      </DropdownMenuItem>
                    </Link>
                    <Link to={createPageUrl('NotificationSettings')}>
                      <DropdownMenuItem className="cursor-pointer">
                        <Settings className="w-4 h-4 mr-2" />
                        通知設定
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="cursor-pointer text-red-600"
                      onClick={() => base44.auth.logout()}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      ログアウト
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button 
                  onClick={() => base44.auth.redirectToLogin()}
                  className="bg-[#2D4A6F] hover:bg-[#1E3A5F]"
                >
                  ログイン
                </Button>
              )}

              {/* Mobile Menu Trigger */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="icon">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72">
                  <div className="py-4">
                    <nav className="space-y-2">
                      {navigation.map((item) => {
                        const isActive = currentPageName === item.href;
                        return (
                          <Link 
                            key={item.name} 
                            to={createPageUrl(item.href)}
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <Button
                              variant="ghost"
                              className={`w-full justify-start ${
                                isActive 
                                  ? 'bg-[#2D4A6F]/5 text-[#2D4A6F]' 
                                  : 'text-slate-600'
                              }`}
                            >
                              <item.icon className="w-4 h-4 mr-3" />
                              {item.name}
                            </Button>
                          </Link>
                        );
                      })}
                      {isAdmin && adminNavigation.map((item) => (
                        <Link 
                          key={item.name}
                          to={createPageUrl(item.href)}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <Button
                            variant="ghost"
                            className={`w-full justify-start ${
                              currentPageName === item.href
                                ? 'bg-[#2D4A6F]/5 text-[#2D4A6F]' 
                                : 'text-slate-600'
                            }`}
                          >
                            <item.icon className="w-4 h-4 mr-3" />
                            {item.name}
                          </Button>
                        </Link>
                      ))}
                      {isAdmin && (
                        <Link 
                          to={createPageUrl('AdminPanel')}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <Button
                            variant="ghost"
                            className={`w-full justify-start ${
                              currentPageName === 'AdminPanel'
                                ? 'bg-[#2D4A6F]/5 text-[#2D4A6F]' 
                                : 'text-slate-600'
                            }`}
                          >
                            <Settings className="w-4 h-4 mr-3" />
                            管理
                          </Button>
                        </Link>
                      )}
                    </nav>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>{children}</main>


      </div>
      );
      }