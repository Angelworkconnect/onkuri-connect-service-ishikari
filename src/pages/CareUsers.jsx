import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Users, Search, UserCheck, PenLine } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];
const END_REASONS = [
  { value: 'hospitalization', label: '入院' },
  { value: 'admission', label: '入所' },
  { value: 'death', label: '逝去' },
  { value: 'self_reason', label: '自己都合' },
  { value: 'family_reason', label: '家族都合' },
  { value: 'other_facility', label: '他施設' },
  { value: 'other', label: 'その他' },
];

const EMPTY_FORM = {
  name: '', furigana: '', start_date: '', end_date: '',
  status: 'active', weekly_visits: 2, visit_days: [],
  end_reason: '', end_reason_note: '', care_level: '', notes: '',
};

export default function CareUsers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [inputMode, setInputMode] = useState('client'); // 'client' | 'manual'
  const [clientSearch, setClientSearch] = useState('');

  const { data: users = [] } = useQuery({
    queryKey: ['care-user-records'],
    queryFn: () => base44.entities.CareUserRecord.list('-start_date', 200),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-for-care'],
    queryFn: () => base44.entities.Client.list('name', 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CareUserRecord.create(data),
    onSuccess: () => { queryClient.invalidateQueries(['care-user-records']); closeDialog(); toast({ title: '登録しました' }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CareUserRecord.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['care-user-records']); closeDialog(); toast({ title: '更新しました' }); },
  });

  const closeDialog = () => { setDialogOpen(false); setEditingUser(null); setForm({ ...EMPTY_FORM }); setInputMode('client'); setClientSearch(''); };

  const selectClient = (client) => {
    const CARE_LEVEL_MAP = { none: '', support_1: '要支援1', support_2: '要支援2', care_1: '要介護1', care_2: '要介護2', care_3: '要介護3', care_4: '要介護4', care_5: '要介護5' };
    setForm(f => ({
      ...f,
      name: client.name || '',
      furigana: client.furigana || '',
      care_level: CARE_LEVEL_MAP[client.careLevel] || '',
      visit_days: client.daysOfWeek || [],
      weekly_visits: client.frequencyPerWeek || 2,
    }));
    setClientSearch('');
    setInputMode('manual'); // クライアント選択後は詳細入力に切り替え
  };

  const openEdit = (u) => {
    setEditingUser(u);
    setForm({
      name: u.name || '', furigana: u.furigana || '',
      start_date: u.start_date || '', end_date: u.end_date || '',
      status: u.status || 'active', weekly_visits: u.weekly_visits || 2,
      visit_days: u.visit_days || [], end_reason: u.end_reason || '',
      end_reason_note: u.end_reason_note || '', care_level: u.care_level || '',
      notes: u.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) { alert('名前を入力してください'); return; }
    if (editingUser) updateMutation.mutate({ id: editingUser.id, data: form });
    else createMutation.mutate(form);
  };

  const toggleVisitDay = (dow) => {
    const days = form.visit_days.includes(dow)
      ? form.visit_days.filter(d => d !== dow)
      : [...form.visit_days, dow].sort();
    setForm({ ...form, visit_days: days });
  };

  const filtered = users.filter(u => {
    const matchSearch = !search || u.name?.includes(search) || u.furigana?.includes(search);
    const matchStatus = filterStatus === 'all' || u.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-gradient-to-br from-[#2D4A6F] to-[#1E3A5F] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <Link to="/CareBusinessDashboard" className="flex items-center gap-2 text-white/70 hover:text-white mb-3 text-sm">
            <ArrowLeft className="w-4 h-4" />ダッシュボードへ戻る
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-7 h-7 text-[#E8A4B8]" />
              <h1 className="text-2xl font-bold">利用者管理</h1>
            </div>
            <Button onClick={() => { setForm({ ...EMPTY_FORM }); setEditingUser(null); setDialogOpen(true); }} className="bg-white text-[#2D4A6F] hover:bg-white/90">
              <Plus className="w-4 h-4 mr-2" />新規登録
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input className="pl-9" placeholder="名前で検索" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2">
            {[['active', '利用中'], ['ended', '終了'], ['all', '全員']].map(([v, l]) => (
              <button key={v} onClick={() => setFilterStatus(v)}
                className={`px-3 py-2 rounded-lg text-sm border transition-all ${filterStatus === v ? 'bg-[#2D4A6F] text-white border-[#2D4A6F]' : 'bg-white text-slate-600 border-slate-200'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {filtered.map(u => (
            <Card key={u.id} className="border-0 shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-full bg-[#2D4A6F] text-white flex items-center justify-center font-bold shrink-0">
                {u.name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-800">{u.name}</span>
                  {u.furigana && <span className="text-xs text-slate-400">（{u.furigana}）</span>}
                  {u.care_level && <Badge variant="outline" className="text-xs">{u.care_level}</Badge>}
                  <Badge className={u.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-0 text-xs' : 'bg-slate-100 text-slate-500 border-0 text-xs'}>
                    {u.status === 'active' ? '利用中' : '終了'}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                  {u.start_date && <span>開始：{u.start_date}</span>}
                  {u.status === 'ended' && u.end_date && <span>終了：{u.end_date}</span>}
                  <span>週{u.weekly_visits === 4 ? '4回以上' : `${u.weekly_visits}回`}</span>
                  {(u.visit_days || []).length > 0 && (
                    <span>{(u.visit_days).map(d => DAY_LABELS[d]).join('・')}</span>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => openEdit(u)}>
                <Edit className="w-4 h-4 text-slate-400" />
              </Button>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>利用者が登録されていません</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUser ? '利用者編集' : '利用者登録'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">

            {/* 新規登録時のみ：入力方法切り替え */}
            {!editingUser && (
              <div className="flex gap-2 bg-slate-100 rounded-lg p-1">
                <button type="button" onClick={() => setInputMode('client')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-all ${inputMode === 'client' ? 'bg-white text-[#2D4A6F] shadow-sm' : 'text-slate-500'}`}>
                  <UserCheck className="w-4 h-4" />登録クライアントから選ぶ
                </button>
                <button type="button" onClick={() => setInputMode('manual')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-all ${inputMode === 'manual' ? 'bg-white text-[#2D4A6F] shadow-sm' : 'text-slate-500'}`}>
                  <PenLine className="w-4 h-4" />直接入力
                </button>
              </div>
            )}

            {/* クライアント選択モード */}
            {!editingUser && inputMode === 'client' && (
              <div>
                <Label>クライアント検索</Label>
                <Input className="mt-1 mb-2" placeholder="名前で検索..." value={clientSearch} onChange={e => setClientSearch(e.target.value)} />
                <div className="border rounded-lg max-h-52 overflow-y-auto divide-y">
                  {clients
                    .filter(c => !clientSearch || c.name?.includes(clientSearch) || c.furigana?.includes(clientSearch))
                    .filter(c => c.isActive !== false)
                    .map(client => (
                      <button key={client.id} type="button" onClick={() => selectClient(client)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-slate-800">{client.name}</span>
                            {client.furigana && <span className="text-xs text-slate-400 ml-2">（{client.furigana}）</span>}
                          </div>
                          {client.careLevel && client.careLevel !== 'none' && (
                            <Badge variant="outline" className="text-xs shrink-0">
                              {{ none:'', support_1:'要支援1', support_2:'要支援2', care_1:'要介護1', care_2:'要介護2', care_3:'要介護3', care_4:'要介護4', care_5:'要介護5' }[client.careLevel]}
                            </Badge>
                          )}
                        </div>
                        {(client.daysOfWeek || []).length > 0 && (
                          <p className="text-xs text-slate-400 mt-0.5">{client.daysOfWeek.map(d => DAY_LABELS[d]).join('・')}</p>
                        )}
                      </button>
                    ))}
                  {clients.filter(c => c.isActive !== false).length === 0 && (
                    <p className="text-center py-6 text-slate-400 text-sm">クライアントが登録されていません</p>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-2">クライアントを選ぶと情報が自動入力されます</p>
              </div>
            )}

            {/* 手動入力モード（または編集時） */}
            {(editingUser || inputMode === 'manual') && (
            <><div className="grid grid-cols-2 gap-3">
              <div>
                <Label>名前 *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="山田 花子" />
              </div>
              <div>
                <Label>ふりがな</Label>
                <Input value={form.furigana} onChange={e => setForm({ ...form, furigana: e.target.value })} placeholder="やまだ はなこ" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>要介護度</Label>
                <Input value={form.care_level} onChange={e => setForm({ ...form, care_level: e.target.value })} placeholder="要介護2" />
              </div>
              <div>
                <Label>利用状況</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">利用中</SelectItem>
                    <SelectItem value="ended">終了</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>利用開始日</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <Label>利用終了日</Label>
                <Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>週利用回数</Label>
              <div className="flex gap-2 mt-1">
                {[1,2,3,4].map(v => (
                  <button key={v} type="button" onClick={() => setForm({ ...form, weekly_visits: v })}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${form.weekly_visits === v ? 'bg-[#2D4A6F] text-white border-[#2D4A6F]' : 'bg-white text-slate-600 border-slate-200'}`}>
                    {v === 4 ? '4回+' : `${v}回`}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>利用曜日</Label>
              <div className="flex gap-2 mt-1">
                {[1,2,3,4,5,6,0].map(dow => {
                  const active = form.visit_days.includes(dow);
                  return (
                    <button key={dow} type="button" onClick={() => toggleVisitDay(dow)}
                      className={`w-10 h-10 rounded-full text-sm font-bold border-2 transition-all ${active ? 'bg-[#2D4A6F] text-white border-[#2D4A6F]' : 'bg-white text-slate-400 border-slate-200'}`}>
                      {DAY_LABELS[dow]}
                    </button>
                  );
                })}
              </div>
            </div>
            {form.status === 'ended' && (
              <div>
                <Label>終了理由</Label>
                <Select value={form.end_reason} onValueChange={v => setForm({ ...form, end_reason: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="選択してください" /></SelectTrigger>
                  <SelectContent>
                    {END_REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input className="mt-2" placeholder="補足（任意）" value={form.end_reason_note} onChange={e => setForm({ ...form, end_reason_note: e.target.value })} />
              </div>
            )}
            <div>
              <Label>備考</Label>
              <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            </>) } {/* end manual/edit mode */}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>キャンセル</Button>
            {(editingUser || inputMode === 'manual') && (
              <Button className="bg-[#2D4A6F]" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingUser ? '更新' : '登録'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}