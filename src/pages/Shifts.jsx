import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, Filter, Calendar, SlidersHorizontal,
  CheckCircle, Send
} from "lucide-react";
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from "framer-motion";
import ShiftCard from "@/components/shifts/ShiftCard";

const serviceTypes = [
  { value: 'all', label: 'すべて' },
  { value: 'day_service', label: '通所介護' },
  { value: 'home_care', label: '訪問介護' },
  { value: 'taxi', label: '介護タクシー' },
  { value: 'funeral', label: '葬祭' },
  { value: 'estate_clearing', label: '遺品整理' },
  { value: 'other', label: 'その他' },
];

export default function Shifts() {
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [selectedShift, setSelectedShift] = useState(null);
  const [applyMessage, setApplyMessage] = useState('');
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      const staffList = await base44.entities.Staff.filter({ email: u.email });
      if (staffList.length > 0) {
        u.full_name = staffList[0].full_name;
        u.approval_status = staffList[0].approval_status || 'pending';
      }
      setUser(u);
    }).catch(() => {});
  }, []);

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => base44.entities.Shift.filter({ is_visible: true }, '-date'),
    refetchInterval: 3000,
    staleTime: 0,
  });

  const { data: myApplications = [] } = useQuery({
    queryKey: ['my-applications', user?.email],
    queryFn: () => user ? base44.entities.ShiftApplication.filter({ applicant_email: user.email }) : [],
    enabled: !!user,
  });

  const applyMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.ShiftApplication.create({
        shift_id: data.shiftId,
        applicant_email: user.email,
        applicant_name: user.full_name,
        message: data.message,
        status: 'pending',
      });
    },
    onSuccess: () => {
      setApplySuccess(true);
      queryClient.invalidateQueries(['my-applications']);
      setTimeout(() => {
        setApplyDialogOpen(false);
        setApplySuccess(false);
        setApplyMessage('');
        setSelectedShift(null);
      }, 2000);
    },
  });

  const filteredShifts = shifts.filter(shift => {
    const matchesSearch = shift.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         shift.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesService = serviceFilter === 'all' || shift.service_type === serviceFilter;
    return matchesSearch && matchesService;
  });

  const openShifts = filteredShifts.filter(s => s.status === 'open');
  const otherShifts = filteredShifts.filter(s => s.status === 'filled' || s.status === 'cancelled');

  const hasApplied = (shiftId) => {
    return myApplications.some(app => app.shift_id === shiftId);
  };

  const handleApply = async (shift) => {
    if (!user) {
      base44.auth.redirectToLogin();
      return;
    }

    // Check if shift is not open
    if (shift.status !== 'open') {
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
    if (staff.approval_status !== 'approved') {
      // Waiting for approval
      alert('現在、管理者の承認待ちです。承認後に応募できるようになります。');
      return;
    }

    // Approved - show application dialog
    setSelectedShift(shift);
    setApplyDialogOpen(true);
  };

  const submitApplication = () => {
    if (!selectedShift) return;
    applyMutation.mutate({
      shiftId: selectedShift.id,
      message: applyMessage,
    });
  };

  if (user && user.approval_status !== 'approved') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center border-0 shadow-lg">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-2xl font-medium text-slate-800 mb-2">承認が必要です</h2>
          <p className="text-slate-600 mb-6">
            この機能を利用するには、管理者による承認が必要です。
          </p>
          <Button 
            className="bg-[#2D4A6F] hover:bg-[#1E3A5F]"
            onClick={() => window.location.href = createPageUrl('Home')}
          >
            ホームへ戻る
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#2D4A6F] to-[#1E3A5F] text-white">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-light mb-2">単発</h1>
          <p className="text-white/70">あなたに合ったお仕事を見つけましょう</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-6">
        {/* Search & Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="キーワードで検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 border-slate-200 focus:border-[#2D4A6F] focus:ring-[#2D4A6F]/20"
              />
            </div>
            <Select value={serviceFilter} onValueChange={setServiceFilter}>
              <SelectTrigger className="w-full md:w-48 h-12">
                <Filter className="w-4 h-4 mr-2 text-slate-400" />
                <SelectValue placeholder="サービス種別" />
              </SelectTrigger>
              <SelectContent>
                {serviceTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="open" className="space-y-6">
          <TabsList className="bg-slate-100 p-1">
            <TabsTrigger value="open" className="data-[state=active]:bg-white">
              募集中 ({openShifts.length})
            </TabsTrigger>
            <TabsTrigger value="all" className="data-[state=active]:bg-white">
              すべて ({filteredShifts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="open">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-xl h-64 animate-pulse" />
                ))}
              </div>
            ) : openShifts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {openShifts.map((shift, index) => (
                    <motion.div
                      key={shift.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <ShiftCard 
                        shift={shift} 
                        onApply={handleApply}
                        showApplyButton={!hasApplied(shift.id)}
                      />
                      {hasApplied(shift.id) && (
                        <div className="mt-2 flex items-center justify-center gap-2 text-sm text-[#7CB342]">
                          <CheckCircle className="w-4 h-4" />
                          <span>応募済み</span>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="text-center py-20">
                <Calendar className="w-16 h-16 mx-auto text-slate-200 mb-4" />
                <p className="text-slate-500">現在募集中のシフトはありません</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="all">
            {filteredShifts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredShifts.map((shift, index) => (
                  <motion.div
                    key={shift.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <ShiftCard 
                      shift={shift} 
                      onApply={handleApply}
                      showApplyButton={shift.status === 'open' && !hasApplied(shift.id)}
                    />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <Calendar className="w-16 h-16 mx-auto text-slate-200 mb-4" />
                <p className="text-slate-500">条件に一致するシフトがありません</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Apply Dialog */}
      <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          {applySuccess ? (
            <div className="py-12 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-20 h-20 bg-[#7CB342]/10 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle className="w-10 h-10 text-[#7CB342]" />
              </motion.div>
              <h3 className="text-xl font-medium text-slate-800 mb-2">応募完了</h3>
              <p className="text-slate-500">担当者からの連絡をお待ちください</p>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>シフトに応募</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {selectedShift && (
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="font-medium text-slate-800">{selectedShift.title}</p>
                    <p className="text-sm text-slate-500 mt-1">
                      {selectedShift.date} {selectedShift.start_time}〜{selectedShift.end_time}
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">
                    メッセージ（任意）
                  </label>
                  <Textarea
                    placeholder="自己PRや質問などがあればご記入ください"
                    value={applyMessage}
                    onChange={(e) => setApplyMessage(e.target.value)}
                    className="h-24"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setApplyDialogOpen(false)}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={submitApplication}
                  disabled={applyMutation.isPending}
                  className="bg-[#2D4A6F] hover:bg-[#1E3A5F]"
                >
                  <Send className="w-4 h-4 mr-2" />
                  応募する
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}