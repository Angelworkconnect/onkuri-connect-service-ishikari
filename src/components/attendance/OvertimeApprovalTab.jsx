import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

const StatusBadge = ({ status }) => {
  if (status === 'approved') return <Badge className="bg-green-100 text-green-700">承認済</Badge>;
  if (status === 'rejected') return <Badge className="bg-red-100 text-red-600">却下</Badge>;
  return <Badge className="bg-yellow-100 text-yellow-700">申請中</Badge>;
};

export default function OvertimeApprovalTab({ adminEmail }) {
  const [actionTarget, setActionTarget] = useState(null); // { record, action: 'approve'|'reject' }
  const [adminNote, setAdminNote] = useState('');
  const queryClient = useQueryClient();

  const { data: requests = [] } = useQuery({
    queryKey: ['overtime-all'],
    queryFn: () => base44.entities.OvertimeRequest.list('-date'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.OvertimeRequest.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['overtime-all']);
      setActionTarget(null);
      setAdminNote('');
    },
  });

  const handleAction = () => {
    updateMutation.mutate({
      id: actionTarget.record.id,
      data: {
        status: actionTarget.action === 'approve' ? 'approved' : 'rejected',
        admin_note: adminNote,
        approved_by: adminEmail,
      },
    });
  };

  const calcDuration = (s, e) => {
    if (!s || !e) return '';
    const [sh, sm] = s.split(':').map(Number);
    const [eh, em] = e.split(':').map(Number);
    const mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins <= 0) return '';
    return `${Math.floor(mins / 60)}h${mins % 60 ? mins % 60 + 'm' : ''}`;
  };

  const pending = requests.filter(r => r.status === 'pending');
  const others = requests.filter(r => r.status !== 'pending');

  return (
    <div className="space-y-6">
      {/* 承認待ち */}
      <div>
        <h3 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-yellow-500" />
          承認待ち ({pending.length}件)
        </h3>
        {pending.length === 0 ? (
          <p className="text-slate-400 text-sm">承認待ちの申請はありません</p>
        ) : (
          <div className="space-y-3">
            {pending.map(r => (
              <Card key={r.id} className="border-0 shadow p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-800">{r.staff_name}</div>
                    <div className="text-sm text-slate-600 mt-0.5">
                      {format(new Date(r.date), 'M月d日(E)', { locale: ja })}　
                      {r.start_time}〜{r.end_time}
                      {calcDuration(r.start_time, r.end_time) && (
                        <span className="text-slate-400 ml-1">({calcDuration(r.start_time, r.end_time)})</span>
                      )}
                    </div>
                    <div className="text-sm text-slate-600 mt-1">{r.reason}</div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      className="bg-[#7CB342] hover:bg-[#6BA232]"
                      onClick={() => { setActionTarget({ record: r, action: 'approve' }); setAdminNote(''); }}
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />承認
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-500 border-red-200"
                      onClick={() => { setActionTarget({ record: r, action: 'reject' }); setAdminNote(''); }}
                    >
                      <XCircle className="w-3 h-3 mr-1" />却下
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 処理済み */}
      {others.length > 0 && (
        <div>
          <h3 className="font-medium text-slate-700 mb-3">処理済み</h3>
          <div className="space-y-2">
            {others.slice(0, 30).map(r => (
              <Card key={r.id} className="border-0 shadow p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-800 text-sm">{r.staff_name}</div>
                    <div className="text-xs text-slate-500">
                      {format(new Date(r.date), 'M月d日(E)', { locale: ja })}　{r.start_time}〜{r.end_time}　{r.reason}
                    </div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 承認/却下ダイアログ */}
      <Dialog open={!!actionTarget} onOpenChange={() => setActionTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {actionTarget?.action === 'approve' ? '残業を承認しますか？' : '残業を却下しますか？'}
            </DialogTitle>
          </DialogHeader>
          {actionTarget && (
            <div className="space-y-3 pt-1">
              <div className="bg-slate-50 rounded p-3 text-sm text-slate-700">
                <div className="font-medium">{actionTarget.record.staff_name}</div>
                <div>{format(new Date(actionTarget.record.date), 'M月d日(E)', { locale: ja })}　{actionTarget.record.start_time}〜{actionTarget.record.end_time}</div>
                <div className="text-slate-500 mt-1">{actionTarget.record.reason}</div>
              </div>
              <div>
                <Textarea
                  placeholder="コメント（任意）"
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  rows={2}
                  className="resize-none text-sm"
                />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setActionTarget(null)}>キャンセル</Button>
                <Button
                  className={`flex-1 ${actionTarget.action === 'approve' ? 'bg-[#7CB342] hover:bg-[#6BA232]' : 'bg-red-500 hover:bg-red-600'}`}
                  onClick={handleAction}
                >
                  {actionTarget.action === 'approve' ? '承認する' : '却下する'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}