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
import { Plus, Edit, Trash2, User, Calendar, ClipboardList, MapPin, FileText } from "lucide-react";
import { format } from "date-fns";

const ALLOWED_ROLES = ['admin', 'full_time', 'part_time'];

const safeFormat = (dateValue, formatStr) => {
  if (!dateValue) return '-';
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return '-';
  return format(d, formatStr);
};

const CARE_LEVELS = ['自立', '要支援1', '要支援2', '要介護1', '要介護2', '要介護3', '要介護4', '要介護5'];
const GENDERS = [
  { value: 'male', label: '男性' },
  { value: 'female', label: '女性' },
  { value: 'other', label: 'その他' },
];

const emptyForm = {
  title: '',
  trial_date: '',
  trial_client_name: '',
  trial_furigana: '',
  trial_gender: '',
  trial_address: '',
  trial_care_level: '',
  trial_medication_has: false,
  trial_medication_note: '',
  trial_bath_has: false,
  trial_bath_note: '',
  trial_allergy_has: false,
  trial_allergy_note: '',
  trial_referral: '',
  trial_notes: '',
  trial_type: 'trial',
  content: '',
};

function YesNoField({ label, checked, onToggle, note, onNoteChange, notePlaceholder }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={checked === true}
            onChange={() => onToggle(true)}
            className="accent-[#2D4A6F]"
          />
          <span className="text-sm">有</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={checked === false}
            onChange={() => onToggle(false)}
            className="accent-[#2D4A6F]"
          />
          <span className="text-sm">無</span>
        </label>
      </div>
      {checked && (
        <Input
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder={notePlaceholder}
          className="mt-1"
        />
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}

export default function TrialInfo() {
  const [user, setUser] = useState(null);
  const [staffInfo, setStaffInfo] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      const staffList = await base44.entities.Staff.filter({ email: u.email });
      if (staffList.length > 0) setStaffInfo(staffList[0]);
    }).catch(() => base44.auth.redirectToLogin());
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
    onSuccess: () => { queryClient.invalidateQueries(['trial-announcements']); queryClient.invalidateQueries(['announcements']); setDialogOpen(false); resetForm(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Announcement.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['trial-announcements']); queryClient.invalidateQueries(['announcements']); setDialogOpen(false); resetForm(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Announcement.delete(id),
    onSuccess: () => { queryClient.invalidateQueries(['trial-announcements']); queryClient.invalidateQueries(['announcements']); },
  });

  const resetForm = () => { setForm({ ...emptyForm }); setEditingItem(null); };

  const handleEdit = (item) => {
    setEditingItem(item);
    setForm({
      title: item.title || '',
      trial_date: item.trial_date || '',
      trial_client_name: item.trial_client_name || '',
      trial_furigana: item.trial_furigana || '',
      trial_gender: item.trial_gender || '',
      trial_address: item.trial_address || '',
      trial_care_level: item.trial_care_level || '',
      trial_medication_has: item.trial_medication_has || false,
      trial_medication_note: item.trial_medication_note || '',
      trial_bath_has: item.trial_bath_has || false,
      trial_bath_note: item.trial_bath_note || '',
      trial_allergy_has: item.trial_allergy_has || false,
      trial_allergy_note: item.trial_allergy_note || '',
      trial_referral: item.trial_referral || '',
      trial_notes: item.trial_notes || '',
      trial_type: item.trial_type || 'trial',
      content: item.content || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.trial_client_name) { alert('名前は必須です'); return; }
    const autoTitle = form.title || `${form.trial_client_name}様 ${form.trial_type === 'consultation' ? '相談' : '体験'}`;
    const data = {
      ...form,
      title: autoTitle,
      content: form.content || autoTitle,
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
      <div className="bg-gradient-to-br from-[#2D4A6F] to-[#1E3A5F] text-white">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="flex items-center gap-3 mb-2">
            <ClipboardList className="w-6 h-6 text-[#E8A4B8]" />
            <h1 className="text-2xl font-light">体験利用情報</h1>
          </div>
          <p className="text-white/70 text-sm">体験・相談利用者の情報をチームで共有できます</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {canEdit && (
          <div className="flex justify-end">
            <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-[#2D4A6F] hover:bg-[#1E3A5F]">
              <Plus className="w-4 h-4 mr-2" />体験情報を投稿
            </Button>
          </div>
        )}

        {trialAnnouncements.length === 0 ? (
          <Card className="border-0 shadow-sm p-12 text-center text-slate-400">
            <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>まだ体験情報はありません</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {trialAnnouncements.map((item) => (
              <Card key={item.id} className="border-0 shadow-sm hover:shadow-md transition-all overflow-hidden">
                <div className="border-l-4 border-l-emerald-400 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <Badge className={item.trial_type === 'consultation' ? 'bg-blue-100 text-blue-700 border-0' : 'bg-emerald-100 text-emerald-700 border-0'}>
                          {item.trial_type === 'consultation' ? '相談' : '体験'}
                        </Badge>
                        {item.trial_date && (
                          <span className="text-sm text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {safeFormat(item.trial_date, 'yyyy年M月d日')}
                          </span>
                        )}
                        <span className="text-xs text-slate-400 ml-auto">
                          {item.posted_by_name || '-'} · {safeFormat(item.created_date, 'M月d日 HH:mm')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <User className="w-4 h-4 text-slate-400" />
                        <span className="font-medium text-slate-800 text-lg">{item.trial_client_name}</span>
                        {item.trial_furigana && <span className="text-sm text-slate-400">（{item.trial_furigana}）</span>}
                        {item.trial_gender && (
                          <Badge variant="outline" className="text-xs">
                            {GENDERS.find(g => g.value === item.trial_gender)?.label}
                          </Badge>
                        )}
                      </div>

                      <div className="bg-slate-50 rounded-lg p-4 mb-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <InfoRow label="要介護度" value={item.trial_care_level} />
                        <InfoRow label="住所" value={item.trial_address} />
                        <InfoRow label="紹介先" value={item.trial_referral} />
                        <InfoRow label="昼薬" value={item.trial_medication_has ? `有${item.trial_medication_note ? `（${item.trial_medication_note}）` : ''}` : '無'} />
                        <InfoRow label="入浴" value={item.trial_bath_has ? `有${item.trial_bath_note ? `（${item.trial_bath_note}）` : ''}` : '無'} />
                        <InfoRow label="アレルギー" value={item.trial_allergy_has ? `有${item.trial_allergy_note ? `（${item.trial_allergy_note}）` : ''}` : '無'} />
                      </div>

                      {item.trial_notes && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-xs text-amber-700 font-medium mb-1">特記事項</p>
                          <p className="text-sm text-amber-900 whitespace-pre-wrap">{item.trial_notes}</p>
                        </div>
                      )}
                    </div>

                    {canEdit && (
                      <div className="flex gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                          <Edit className="w-4 h-4 text-slate-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { if (confirm('削除しますか？')) deleteMutation.mutate(item.id); }}>
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

          <div className="space-y-5 py-4">
            {/* 種別 */}
            <div className="space-y-2">
              <Label>種別</Label>
              <div className="flex gap-4">
                {[{ value: 'trial', label: '体験' }, { value: 'consultation', label: '相談' }].map(opt => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="trial_type"
                      checked={form.trial_type === opt.value}
                      onChange={() => setForm({ ...form, trial_type: opt.value })}
                      className="accent-[#2D4A6F]"
                    />
                    <span className="text-sm font-medium">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 体験日 */}
            <div>
              <Label>体験日</Label>
              <Input type="date" value={form.trial_date} onChange={(e) => setForm({ ...form, trial_date: e.target.value })} />
            </div>

            {/* 名前・ふりがな */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>名前 *</Label>
                <Input value={form.trial_client_name} onChange={(e) => setForm({ ...form, trial_client_name: e.target.value })} placeholder="山田 花子" />
              </div>
              <div>
                <Label>ふりがな</Label>
                <Input value={form.trial_furigana} onChange={(e) => setForm({ ...form, trial_furigana: e.target.value })} placeholder="やまだ はなこ" />
              </div>
            </div>

            {/* 性別 */}
            <div className="space-y-2">
              <Label>性別</Label>
              <div className="flex gap-4">
                {GENDERS.map(g => (
                  <label key={g.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      checked={form.trial_gender === g.value}
                      onChange={() => setForm({ ...form, trial_gender: g.value })}
                      className="accent-[#2D4A6F]"
                    />
                    <span className="text-sm">{g.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 住所 */}
            <div>
              <Label>住所</Label>
              <Input value={form.trial_address} onChange={(e) => setForm({ ...form, trial_address: e.target.value })} placeholder="例：大阪府〇〇市..." />
            </div>

            {/* 昼薬 */}
            <YesNoField
              label="昼薬"
              checked={form.trial_medication_has}
              onToggle={(v) => setForm({ ...form, trial_medication_has: v })}
              note={form.trial_medication_note}
              onNoteChange={(v) => setForm({ ...form, trial_medication_note: v })}
              notePlaceholder="薬の内容・注意事項"
            />

            {/* 入浴 */}
            <YesNoField
              label="入浴"
              checked={form.trial_bath_has}
              onToggle={(v) => setForm({ ...form, trial_bath_has: v })}
              note={form.trial_bath_note}
              onNoteChange={(v) => setForm({ ...form, trial_bath_note: v })}
              notePlaceholder="入浴に関する注意事項"
            />

            {/* アレルギー */}
            <YesNoField
              label="アレルギー"
              checked={form.trial_allergy_has}
              onToggle={(v) => setForm({ ...form, trial_allergy_has: v })}
              note={form.trial_allergy_note}
              onNoteChange={(v) => setForm({ ...form, trial_allergy_note: v })}
              notePlaceholder="アレルギーの内容"
            />

            {/* 要介護度 */}
            <div>
              <Label>要介護度</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {CARE_LEVELS.map(level => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setForm({ ...form, trial_care_level: form.trial_care_level === level ? '' : level })}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                      form.trial_care_level === level
                        ? 'bg-[#2D4A6F] text-white border-[#2D4A6F]'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-[#2D4A6F]'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* 紹介先 */}
            <div>
              <Label>紹介先</Label>
              <Input value={form.trial_referral} onChange={(e) => setForm({ ...form, trial_referral: e.target.value })} placeholder="例：〇〇ケアマネ、△△病院" />
            </div>

            {/* 特記 */}
            <div>
              <Label>特記事項</Label>
              <Textarea
                value={form.trial_notes}
                onChange={(e) => setForm({ ...form, trial_notes: e.target.value })}
                className="h-28"
                placeholder="配慮が必要な内容、持病、その他の特記事項"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleSubmit} className="bg-[#2D4A6F]" disabled={createMutation.isPending || updateMutation.isPending}>
              {editingItem ? '更新' : '投稿'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}