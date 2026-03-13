import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2, User, Calendar, FileText, ClipboardList } from "lucide-react";
import { format } from "date-fns";

const ALLOWED_ROLES = ['admin', 'full_time', 'part_time'];

const safeFormat = (dateValue, formatStr) => {
  if (!dateValue) return '-';
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return '-';
  return format(d, formatStr);
};

export default function TrialInfo() {
  const [user, setUser] = useState(null);
  const [staffInfo, setStaffInfo] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({
    title: '',
    trial_client_name: '',
    trial_date: '',
    trial_care_level: '',
    content: '',
    trial_notes: '',
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      const staffList = await base44.entities.Staff.filter({ email: u.email });
      if (staffList.length > 0) {
        setStaffInfo(staffList[0]);
      }
    }).catch(() => {
      base44.auth.redirectToLogin();
    });
  }, []);

  const canEdit = user && (
    user.role === 'admin' ||
    (staffInfo && ALLOWED_ROLES.includes(staffInfo.role))
  );

  const { data: trialAnnouncements = [] } = useQuery({
    queryKey: ['trial-announcements'],
    queryFn: () => base44.entities.Announcement.filter({ category: 'trial' }, '-created_date', 50),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Announcement.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['trial-announcements']);
      queryClient.invalidateQueries(['announcements']);
      setDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Announcement.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['trial-announcements']);
      queryClient.invalidateQueries(['announcements']);
      setDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Announcement.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['trial-announcements']);
      queryClient.invalidateQueries(['announcements']);
    },
  });

  const resetForm = () => {
    setForm({ title: '', trial_client_name: '', trial_date: '', trial_care_level: '', content: '', trial_notes: '' });
    setEditingItem(null);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setForm({
      title: item.title || '',
      trial_client_name: item.trial_client_name || '',
      trial_date: item.trial_date || '',
      trial_care_level: item.trial_care_level || '',
      content: item.content || '',
      trial_notes: item.trial_notes || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.title || !form.trial_client_name) {
      alert('タイトルと体験利用者名は必須です');
      return;
    }
    const data = {
      ...form,
      category: 'trial',
      posted_by_email: user.email,
      posted_by_name: staffInfo?.full_name || user.full_name || user.email,
    };
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#2D4A6F] to-[#1E3A5F] text-white">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="flex items-center gap-3 mb-2">
            <ClipboardList className="w-6 h-6 text-[#E8A4B8]" />
            <h1 className="text-2xl font-light">体験利用情報</h1>
          </div>
          <p className="text-white/70 text-sm">体験利用者の詳細情報をチームで共有できます</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* 投稿ボタン（正職員・パート・管理者のみ） */}
        {canEdit && (
          <div className="flex justify-end">
            <Button
              onClick={() => { resetForm(); setDialogOpen(true); }}
              className="bg-[#2D4A6F] hover:bg-[#1E3A5F]"
            >
              <Plus className="w-4 h-4 mr-2" />
              体験情報を投稿する
            </Button>
          </div>
        )}

        {trialAnnouncements.length === 0 ? (
          <Card className="border-0 shadow-sm p-12 text-center text-slate-400">
            <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>まだ体験情報はありません</p>
            {canEdit && (
              <p className="text-sm mt-2">上のボタンから投稿できます</p>
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            {trialAnnouncements.map((item) => (
              <Card key={item.id} className="border-0 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                <div className="border-l-4 border-l-emerald-400 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* ヘッダー */}
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <Badge className="bg-emerald-100 text-emerald-700 border-0">体験</Badge>
                        {item.trial_date && (
                          <span className="text-sm text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            体験日: {safeFormat(item.trial_date, 'yyyy年M月d日')}
                          </span>
                        )}
                        <span className="text-xs text-slate-400 ml-auto">
                          投稿: {item.posted_by_name || '-'} · {safeFormat(item.created_date, 'M月d日 HH:mm')}
                        </span>
                      </div>

                      {/* タイトル */}
                      <h3 className="font-medium text-slate-800 text-lg mb-3">{item.title}</h3>

                      {/* 体験利用者情報 */}
                      <div className="bg-slate-50 rounded-lg p-4 mb-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-slate-500">体験利用者名</p>
                            <p className="font-medium text-slate-800">{item.trial_client_name || '-'}</p>
                          </div>
                        </div>
                        {item.trial_care_level && (
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-slate-500">要介護度</p>
                              <p className="font-medium text-slate-800">{item.trial_care_level}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 概要 */}
                      {item.content && (
                        <p className="text-sm text-slate-600 whitespace-pre-wrap mb-2">{item.content}</p>
                      )}

                      {/* 特記事項 */}
                      {item.trial_notes && (
                        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-xs text-amber-700 font-medium mb-1">特記事項・詳細</p>
                          <p className="text-sm text-amber-900 whitespace-pre-wrap">{item.trial_notes}</p>
                        </div>
                      )}
                    </div>

                    {/* 編集・削除ボタン（編集権限あり） */}
                    {canEdit && (
                      <div className="flex gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                          <Edit className="w-4 h-4 text-slate-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('この体験情報を削除しますか？')) {
                              deleteMutation.mutate(item.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 投稿・編集ダイアログ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? '体験情報を編集' : '体験情報を投稿'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>タイトル *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="例：〇〇様 体験利用のご案内"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>体験利用者名 *</Label>
                <Input
                  value={form.trial_client_name}
                  onChange={(e) => setForm({ ...form, trial_client_name: e.target.value })}
                  placeholder="山田 花子"
                />
              </div>
              <div>
                <Label>体験日</Label>
                <Input
                  type="date"
                  value={form.trial_date}
                  onChange={(e) => setForm({ ...form, trial_date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>要介護度</Label>
              <Input
                value={form.trial_care_level}
                onChange={(e) => setForm({ ...form, trial_care_level: e.target.value })}
                placeholder="例：要介護2、要支援1"
              />
            </div>
            <div>
              <Label>概要・連絡事項</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="h-24"
                placeholder="体験利用の目的や概要、チームへの連絡事項を記入してください"
              />
            </div>
            <div>
              <Label>特記事項・詳細（アレルギー、持病、配慮事項など）</Label>
              <Textarea
                value={form.trial_notes}
                onChange={(e) => setForm({ ...form, trial_notes: e.target.value })}
                className="h-28"
                placeholder="アレルギー、服薬情報、車椅子使用有無、その他の配慮が必要な内容を詳しく記載してください"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>キャンセル</Button>
            <Button
              onClick={handleSubmit}
              className="bg-[#2D4A6F]"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingItem ? '更新' : '投稿'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}