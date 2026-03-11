import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Clock, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

const StatusBadge = ({ status }) => {
  if (status === 'approved') return <Badge className="bg-green-100 text-green-700">承認済</Badge>;
  if (status === 'rejected') return <Badge className="bg-red-100 text-red-600">却下</Badge>;
  return <Badge className="bg-yellow-100 text-yellow-700">申請中</Badge>;
};

export default function OvertimeRequestPage() {
  const [user, setUser] = useState(null);
  const [staffName, setStaffName] = useState('');
  const [staffRegistered, setStaffRegistered] = useState(null); // null=loading, true/false
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: '', start_time: '', end_time: '', reason: '' });
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      const staffList = await base44.entities.Staff.filter({ email: u.email });
      if (staffList.length > 0) {
        setStaffName(staffList[0].full_name);
        setStaffRegistered(true);
      } else {
        setStaffRegistered(false);
      }
      setUser(u);
    }).catch(() => base44.auth.redirectToLogin());
  }, []);

  const { data: myRequests = [] } = useQuery({
    queryKey: ['overtime-mine', user?.email],
    queryFn: () => base44.entities.OvertimeRequest.filter({ staff_email: user.email }, '-date'),
    enabled: !!user,
  });

  const submitMutation = useMutation({
    mutationFn: () => base44.entities.OvertimeRequest.create({
      ...form,
      staff_email: user.email,
      staff_name: staffName || user.email,
      status: 'pending',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['overtime-mine']);
      setShowForm(false);
      setForm({ date: '', start_time: '', end_time: '', reason: '' });
    },
  });

  const calcDuration = (s, e) => {
    if (!s || !e) return '';
    const [sh, sm] = s.split(':').map(Number);
    const [eh, em] = e.split(':').map(Number);
    const mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins <= 0) return '';
    return `${Math.floor(mins / 60)}時間${mins % 60 ? mins % 60 + '分' : ''}`;
  };

  if (!user || staffRegistered === null) return <div className="min-h-screen flex items-center justify-center text-slate-400">読み込み中...</div>;

  if (!staffRegistered) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center text-slate-500 space-y-2">
        <p className="text-lg font-medium">スタッフ登録が必要です</p>
        <p className="text-sm">管理者にスタッフ登録を依頼してください。</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-20">
      <div className="bg-gradient-to-br from-[#2D4A6F] to-[#1E3A5F] text-white">
        <div className="max-w-2xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-light mb-2">残業申請</h1>
          <p className="text-white/70">残業の申請・履歴確認ができます</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 -mt-6">
        {/* 申請ボタン */}
        <div className="mb-6">
          <Button
            className="bg-[#2D4A6F] hover:bg-[#1E3A5F] shadow-lg"
            onClick={() => setShowForm(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            残業申請する
          </Button>
        </div>

        {/* 申請履歴 */}
        <h2 className="text-lg font-medium text-slate-700 mb-3 flex items-center gap-2">
          <ClipboardList className="w-5 h-5" />申請履歴
        </h2>
        {myRequests.length === 0 ? (
          <Card className="border-0 shadow-lg p-10 text-center text-slate-400">申請履歴はありません</Card>
        ) : (
          <div className="space-y-3">
            {myRequests.map(r => (
              <Card key={r.id} className="border-0 shadow-lg p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-800 mb-1">
                      {format(new Date(r.date), 'M月d日(E)', { locale: ja })}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                      <Clock className="w-4 h-4" />
                      {r.start_time} 〜 {r.end_time}
                      {calcDuration(r.start_time, r.end_time) && (
                        <span className="text-slate-400">（{calcDuration(r.start_time, r.end_time)}）</span>
                      )}
                    </div>
                    <div className="text-sm text-slate-600">{r.reason}</div>
                    {r.admin_note && (
                      <div className="mt-2 text-xs text-slate-500 bg-slate-50 rounded px-2 py-1">
                        管理者コメント: {r.admin_note}
                      </div>
                    )}
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 申請フォームダイアログ */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>残業申請</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>残業日</Label>
              <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="mt-1" />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label>開始時刻</Label>
                <Input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} className="mt-1" />
              </div>
              <div className="flex-1">
                <Label>終了時刻</Label>
                <Input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} className="mt-1" />
              </div>
            </div>
            {calcDuration(form.start_time, form.end_time) && (
              <div className="text-sm text-[#2D4A6F] font-medium text-center">
                残業時間: {calcDuration(form.start_time, form.end_time)}
              </div>
            )}
            <div>
              <Label>理由</Label>
              <Textarea
                placeholder="残業の理由を入力してください"
                value={form.reason}
                onChange={e => setForm({ ...form, reason: e.target.value })}
                className="mt-1 resize-none"
                rows={3}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>キャンセル</Button>
              <Button
                className="flex-1 bg-[#2D4A6F] hover:bg-[#1E3A5F]"
                disabled={!form.date || !form.start_time || !form.end_time || !form.reason}
                onClick={() => submitMutation.mutate()}
              >
                申請する
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}