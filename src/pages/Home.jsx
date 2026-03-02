import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Calendar, Clock, Users, Heart, Truck, 
  Flower2, Package, Gift, ChevronRight, 
  ArrowRight, Sparkles, UserPlus,
  Home as HomeIcon, Briefcase, Building2, Car, Coffee, Phone,
  Mail, MapPin, Settings, Shield, Star,
  Sun, Moon, Zap, Activity, Award,
  Book, Camera, Music, Palette, Smile,
  Umbrella, Lightbulb, Target, Globe, Leaf
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import StatsCard from "@/components/dashboard/StatsCard";
import AnnouncementCard from "@/components/dashboard/AnnouncementCard";
import ShiftCard from "@/components/shifts/ShiftCard";
import ServiceCard from "@/components/services/ServiceCard";

const iconMap = {
  Heart, Truck, Flower2, Package, Gift, Calendar, Clock, Users, Sparkles,
  Home: HomeIcon, Briefcase, Building2, Car, Coffee, Phone, Mail, MapPin, Settings,
  Shield, Star, Sun, Moon, Zap, Activity, Award, Book, Camera, Music,
  Palette, Smile, Umbrella, Lightbulb, Target, Globe, Leaf
};

export default function Home() {
  const [user, setUser] = useState(null);
  const [isStaffRegistered, setIsStaffRegistered] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      if (u) {
        const staffList = await base44.entities.Staff.filter({ email: u.email });
        setIsStaffRegistered(staffList.length > 0);
      }
    }).catch(() => {});
  }, []);

  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const all = await base44.entities.Announcement.list('-created_date', 20);
      const urgent = all.filter(a => a.category === 'urgent');
      const others = all.filter(a => a.category !== 'urgent').slice(0, 5);
      return [...urgent, ...others];
    },
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts-open'],
    queryFn: async () => {
      const allVisible = await base44.entities.Shift.filter({ is_visible: true }, '-date', 10);
      return allVisible.filter(s => s.status === 'open' || s.status === 'filled').slice(0, 3);
    },
    staleTime: 60000,
  });

  const { data: allShifts = [] } = useQuery({
    queryKey: ['shifts-all'],
    queryFn: async () => {
      const allVisible = await base44.entities.Shift.filter({ is_visible: true });
      return allVisible.filter(s => s.status === 'open' || s.status === 'filled');
    },
    staleTime: 60000,
  });

  const { data: allStaff = [] } = useQuery({
    queryKey: ['staff-all'],
    queryFn: () => base44.entities.Staff.list(),
  });

  const { data: siteSettings = {} } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const settings = await base44.entities.SiteSettings.list();
      return settings.length > 0 ? settings[0] : {};
    },
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => base44.entities.Service.list('order'),
  });

  const { data: monthlyAttendance = [] } = useQuery({
    queryKey: ['monthly-attendance', user?.email],
    queryFn: async () => {
      if (!user) return [];
      return base44.entities.Attendance.filter({ user_email: user.email });
    },
    enabled: !!user,
  });

  const calculateMonthlyHours = () => {
    const currentMonth = format(new Date(), 'yyyy-MM');
    const thisMonthRecords = monthlyAttendance.filter(record => 
      record.date && record.date.startsWith(currentMonth)
    );
    
    let totalMinutes = 0;
    thisMonthRecords.forEach(record => {
      if (record.clock_in && record.clock_out) {
        const [inH, inM] = record.clock_in.split(':').map(Number);
        const [outH, outM] = record.clock_out.split(':').map(Number);
        const minutes = (outH * 60 + outM) - (inH * 60 + inM) - (record.break_minutes || 0);
        totalMinutes += minutes;
      }
    });
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return totalMinutes > 0 ? `${hours}時間${mins > 0 ? mins + '分' : ''}` : '0時間';
  };

  const stats = {
    openShifts: allShifts.filter(s => s.status === 'open').length,
    totalStaff: allStaff.length,
  };

  const applyMutation = useMutation({
    mutationFn: async (shiftId) => {
      const staffList = await base44.entities.Staff.filter({ email: user.email });
      return base44.entities.ShiftApplication.create({
        shift_id: shiftId,
        applicant_email: user.email,
        applicant_name: staffList[0].full_name,
        message: '',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['shifts']);
      alert('応募が完了しました！');
    },
  });

  const handleApply = async (shiftId) => {
    if (!user) {
      if (confirm('応募するにはログインが必要です。ログインページに移動しますか？')) {
        base44.auth.redirectToLogin();
      }
      return;
    }

    // Check shift status
    const shift = shifts.find(s => s.id === shiftId);
    if (shift && shift.status !== 'open') {
      alert('このシフトは現在応募を受け付けていません');
      return;
    }

    // Check staff registration
    const staffList = await base44.entities.Staff.filter({ email: user.email });
    
    if (staffList.length === 0) {
      // Not registered
      if (confirm('スタッフ登録が必要です。登録ページに移動しますか？')) {
        window.location.href = createPageUrl('StaffRegistration');
      }
      return;
    }

    const staff = staffList[0];
    if (staff.status === 'inactive') {
      // Waiting for approval
      alert('現在、管理者の承認待ちです。承認後に応募できるようになります。');
      return;
    }

    // Approved - allow application
    if (confirm('このシフトに応募しますか？')) {
      applyMutation.mutate(shiftId);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#2D4A6F] via-[#3A5A7F] to-[#1E3A5F] text-white">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-64 h-64 bg-[#E8A4B8]/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-20 w-96 h-96 bg-[#7CB342]/10 rounded-full blur-3xl" />
        </div>
        
        <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-5 h-5 text-[#E8A4B8]" />
              <span className="text-sm tracking-wider text-white/70">石狩市を拠点とした地域密着型</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-light mb-6 leading-tight">
              {siteSettings.hero_title || '地域で支える、人生に寄り添う。'}
            </h1>
            <p className="text-xl md:text-2xl text-[#E8A4B8] font-medium mb-4">
              {siteSettings.hero_subtitle || 'タイミー的単発・短時間から参加できるお仕事'}
            </p>
            <p className="text-lg md:text-xl text-white/80 mb-8 leading-relaxed">
              {siteSettings.hero_description || 'おんくりの輪は、介護から葬祭まで\n人生のすべての節目に寄り添う\n地域密着型のワーク＆サポートプラットフォームです。'}
            </p>
            
            <div className="flex flex-wrap gap-4">
              {user ? (
                <Link to={createPageUrl('Dashboard')}>
                  <Button size="lg" className="bg-white text-[#2D4A6F] hover:bg-white/90 h-14 px-8">
                    ダッシュボードへ
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Button 
                    size="lg" 
                    className="bg-white text-[#2D4A6F] hover:bg-white/90 h-14 px-8"
                    onClick={() => base44.auth.redirectToLogin()}
                  >
                    スタッフログイン
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  <Link to={createPageUrl('Shifts')}>
                    <Button size="lg" variant="outline" className="h-14 px-8 border-white/30 text-white hover:bg-white/10">
                      シフトを見る
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Staff Registration Banner */}
      {user && !isStaffRegistered && (
        <section className="max-w-6xl mx-auto px-6 -mt-12 relative z-10 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-[#E8A4B8]/20 via-white to-[#C17A8E]/20 rounded-2xl shadow-xl p-8 border border-[#E8A4B8]/30"
          >
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#2D4A6F] to-[#1E3A5F] flex items-center justify-center shadow-lg">
                  <UserPlus className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl font-medium text-slate-800 mb-2">
                  スタッフ登録がまだ完了していません
                </h3>
                <p className="text-slate-600 mb-4">
                  シフトに応募するには、まずスタッフ情報の登録が必要です。<br />
                  簡単な登録フォームで、すぐに始められます。
                </p>
                <Button
                  onClick={() => window.location.href = createPageUrl('StaffRegistration')}
                  className="bg-gradient-to-r from-[#2D4A6F] to-[#1E3A5F] hover:opacity-90 text-white shadow-lg"
                  size="lg"
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  今すぐ登録する
                </Button>
              </div>
            </div>
          </motion.div>
        </section>
      )}

      {/* Stats Section */}
      {user && (
        <section className="max-w-6xl mx-auto px-6 -mt-12 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard
              title="募集中のシフト"
              value={stats.openShifts}
              icon={Calendar}
              description="今すぐ応募可能"
            />
            <StatsCard
              title="今月の勤務時間"
              value={calculateMonthlyHours()}
              icon={Clock}
              description="累計勤務時間"
            />
            <StatsCard
              title="登録スタッフ"
              value={stats.totalStaff}
              icon={Users}
              description="おんくりの輪の仲間"
            />
          </div>
        </section>
      )}

      {/* Available Shifts */}
      {shifts.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-medium text-slate-800 mb-2">単発・短時間から参加OK</h2>
              <p className="text-slate-500">今すぐ応募できるお仕事</p>
            </div>
            <Link to={createPageUrl('Shifts')}>
              <Button variant="ghost" className="text-[#2D4A6F]">
                すべて見る
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shifts.map((shift) => (
              <motion.div
                key={shift.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <ShiftCard 
                  shift={shift} 
                  showApplyButton={true}
                  onApply={() => handleApply(shift.id)}
                />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Services Section */}
      <section className="bg-slate-50/50 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-medium text-slate-800 mb-3">サービス一覧</h2>
            <p className="text-slate-500">人生の節目すべてに寄り添います</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {services.map((service, index) => (
             <motion.div
               key={service.id}
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ delay: index * 0.1 }}
             >
               <ServiceCard 
                 title={service.title}
                 description={service.description}
                 icon={iconMap[service.icon] || Heart}
                 color={service.color}
                 showDetailsLink={service.show_details_link}
               />
             </motion.div>
           ))}
          </div>
        </div>
      </section>

      {/* Announcements */}
      {announcements.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-medium text-slate-800 mb-2">お知らせ</h2>
              <p className="text-slate-500">最新情報をチェック</p>
            </div>
          </div>
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <motion.div
                key={announcement.id}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <AnnouncementCard announcement={announcement} />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-[#2D4A6F] to-[#1E3A5F] text-white py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-light mb-6">
            {siteSettings.cta_text || 'おんくりの輪で一緒に働きませんか？'}
          </h2>
          <p className="text-white/80 mb-8 max-w-2xl mx-auto">
            単発から始められる柔軟な働き方。<br />
            あなたの経験とスキルを地域のために活かしてください。
          </p>
          {!user && (
            <Button 
              size="lg" 
              className="bg-[#E8A4B8] hover:bg-[#D88FA3] text-white h-14 px-10"
              onClick={() => base44.auth.redirectToLogin()}
            >
              スタッフ登録する
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white/60 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h3 className="text-xl font-medium text-white mb-2">おんくりの輪</h3>
              <p className="text-sm">{siteSettings.footer_text || '石狩市を拠点とした地域密着型介護・生活支援事業体'}</p>
            </div>
            <div className="text-sm">
              © {new Date().getFullYear()} おんくりの輪. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}