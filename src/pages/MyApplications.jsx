import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, Clock, CheckCircle, XCircle, 
  Calendar, MapPin, MessageSquare
} from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { motion } from "framer-motion";

const statusConfig = {
  pending: { label: '審査中', color: 'bg-amber-100 text-amber-700', icon: Clock },
  approved: { label: '承認', color: 'bg-[#7CB342]/10 text-[#7CB342]', icon: CheckCircle },
  rejected: { label: '不承認', color: 'bg-red-100 text-red-600', icon: XCircle },
};

export default function MyApplications() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {
      base44.auth.redirectToLogin();
    });
  }, []);

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['my-applications', user?.email],
    queryFn: () => user ? base44.entities.ShiftApplication.filter({ applicant_email: user.email }, '-created_date') : [],
    enabled: !!user,
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts-for-applications'],
    queryFn: () => base44.entities.Shift.list(),
  });

  const getShiftDetails = (shiftId) => {
    return shifts.find(s => s.id === shiftId);
  };

  const pendingApps = applications.filter(a => a.status === 'pending');
  const approvedApps = applications.filter(a => a.status === 'approved');
  const rejectedApps = applications.filter(a => a.status === 'rejected');

  const ApplicationCard = ({ application }) => {
    const shift = getShiftDetails(application.shift_id);
    const status = statusConfig[application.status] || statusConfig.pending;
    const StatusIcon = status.icon;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-5">
            <div className="flex items-start justify-between mb-4">
              <Badge className={`${status.color} flex items-center gap-1.5`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {status.label}
              </Badge>
              <span className="text-xs text-slate-400">
                応募日: {format(new Date(application.created_date), 'M月d日', { locale: ja })}
              </span>
            </div>

            {shift ? (
              <div className="space-y-3">
                <h3 className="font-medium text-slate-800">{shift.title}</h3>
                <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#E8A4B8]" />
                    {format(new Date(shift.date), 'M月d日(E)', { locale: ja })}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#E8A4B8]" />
                    {shift.start_time} 〜 {shift.end_time}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#E8A4B8]" />
                    {shift.location}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-slate-400">シフト情報を読み込み中...</p>
            )}

            {application.message && (
              <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 text-slate-400 mt-0.5" />
                  <p className="text-sm text-slate-600">{application.message}</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </motion.div>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-400">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#2D4A6F] to-[#1E3A5F] text-white">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-light mb-2">応募履歴</h1>
          <p className="text-white/70">シフトへの応募状況を確認できます</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="bg-white border-0 shadow-lg p-4 text-center">
            <p className="text-3xl font-light text-amber-600">{pendingApps.length}</p>
            <p className="text-sm text-slate-500">審査中</p>
          </Card>
          <Card className="bg-white border-0 shadow-lg p-4 text-center">
            <p className="text-3xl font-light text-[#7CB342]">{approvedApps.length}</p>
            <p className="text-sm text-slate-500">承認</p>
          </Card>
          <Card className="bg-white border-0 shadow-lg p-4 text-center">
            <p className="text-3xl font-light text-red-500">{rejectedApps.length}</p>
            <p className="text-sm text-slate-500">不承認</p>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all">
          <TabsList className="bg-slate-100 p-1 mb-6">
            <TabsTrigger value="all" className="data-[state=active]:bg-white">
              すべて ({applications.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="data-[state=active]:bg-white">
              審査中 ({pendingApps.length})
            </TabsTrigger>
            <TabsTrigger value="approved" className="data-[state=active]:bg-white">
              承認 ({approvedApps.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {applications.length > 0 ? (
              applications.map(app => (
                <ApplicationCard key={app.id} application={app} />
              ))
            ) : (
              <div className="text-center py-20">
                <FileText className="w-16 h-16 mx-auto text-slate-200 mb-4" />
                <p className="text-slate-500">まだ応募履歴がありません</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            {pendingApps.length > 0 ? (
              pendingApps.map(app => (
                <ApplicationCard key={app.id} application={app} />
              ))
            ) : (
              <div className="text-center py-20">
                <Clock className="w-16 h-16 mx-auto text-slate-200 mb-4" />
                <p className="text-slate-500">審査中の応募はありません</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-4">
            {approvedApps.length > 0 ? (
              approvedApps.map(app => (
                <ApplicationCard key={app.id} application={app} />
              ))
            ) : (
              <div className="text-center py-20">
                <CheckCircle className="w-16 h-16 mx-auto text-slate-200 mb-4" />
                <p className="text-slate-500">承認済みの応募はありません</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}