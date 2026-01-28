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
  Menu, X, LogOut, User, Settings, ChevronDown, Sparkles, Gift
} from "lucide-react";

const navigation = [
  { name: 'ホーム', href: 'Home', icon: Home },
  { name: 'シフト', href: 'Shifts', icon: Calendar },
  { name: '勤怠', href: 'Attendance', icon: Clock },
  { name: '応募履歴', href: 'MyApplications', icon: FileText },
  { name: 'サンクス', href: 'TipsHistory', icon: Sparkles },
  { name: '福利厚生', href: 'Benefits', icon: Gift },
];

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
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
                <span className="text-white font-medium text-sm">輪</span>
              </div>
              <span className="text-lg font-medium text-slate-800 hidden sm:block">おんくりの輪</span>
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
                    <Users className="w-4 h-4 mr-2" />
                    管理
                  </Button>
                </Link>
              )}
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-2">
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
                            <Users className="w-4 h-4 mr-3" />
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