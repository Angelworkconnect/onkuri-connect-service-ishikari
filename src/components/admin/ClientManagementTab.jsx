import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2, Download } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

const DOW = ['日', '月', '火', '水', '木', '金', '土'];

export default function ClientManagementTab() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [form, setForm] = useState({
    name: '',
    furigana: '',
    clientCode: '',
    gender: 'other',
    phone: '',
    address: '',
    careLevel: 'none',
    daysOfWeek: [],
    wheelchairRequired: false,
    pickupRequired: false,
    dropoffRequired: false,
    frequencyPerWeek: 1,
    emergencyContactName: '',
    emergencyContactPhone: '',
    specialNeeds: '',
    medicationInfo: '',
    allergies: '',
    notes: '',
    isActive: true,
  });
  const [viewMode, setViewMode] = useState('table'); // table or by-day
  const queryClient = useQueryClient();

  const { data: allClients = [] } = useQuery({
    queryKey: ['admin-clients'],
    queryFn: () => base44.entities.Client.list('-created_date', 500),
    staleTime: 30000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  const sortedClients = [...allClients].sort((a, b) => 
    a.name.localeCompare(b.name, 'ja')
  );

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-clients'] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Client.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-clients'] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Client.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-clients'] }),
  });

  const resetForm = () => {
    setForm({
      name: '',
      furigana: '',
      clientCode: '',
      gender: 'other',
      phone: '',
      address: '',
      careLevel: 'none',
      daysOfWeek: [],
      wheelchairRequired: false,
      pickupRequired: false,
      dropoffRequired: false,
      frequencyPerWeek: 1,
      emergencyContactName: '',
      emergencyContactPhone: '',
      specialNeeds: '',
      medicationInfo: '',
      allergies: '',
      notes: '',
      isActive: true,
    });
    setEditingClient(null);
    setDialogOpen(false);
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setForm({
      name: client.name || '',
      furigana: client.furigana || '',
      clientCode: client.clientCode || '',
      gender: client.gender || 'other',
      phone: client.phone || '',
      address: client.address || '',
      careLevel: client.careLevel || 'none',
      daysOfWeek: client.daysOfWeek || [],
      wheelchairRequired: client.wheelchairRequired || false,
      pickupRequired: client.pickupRequired || false,
      dropoffRequired: client.dropoffRequired || false,
      frequencyPerWeek: client.frequencyPerWeek || 1,
      emergencyContactName: client.emergencyContactName || '',
      emergencyContactPhone: client.emergencyContactPhone || '',
      specialNeeds: client.specialNeeds || '',
      medicationInfo: client.medicationInfo || '',
      allergies: client.allergies || '',
      notes: client.notes || '',
      isActive: client.isActive !== false,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      alert('名前を入力してください');
      return;
    }
    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleExport = async () => {
    try {
      const response = await base44.functions.invoke('exportClients', {});
      const blob = new Blob([response.data], { type: 'text/csv; charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clients_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('エクスポートエラー:', error);
      alert('エクスポートに失敗しました');
    }
  };

  const toggleDayOfWeek = (dow) => {
    setForm(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(dow)
        ? prev.daysOfWeek.filter(d => d !== dow)
        : [...prev.daysOfWeek, dow].sort()
    }));
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <Card className="border-0 shadow-lg p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-0 sm:justify-between sm:items-center flex-wrap">
          <div>
            <h2 className="text-lg font-medium">クライアント管理</h2>
            <p className="text-xs text-slate-500 mt-1">登録利用者を曜日別に管理</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-[#2D4A6F]">
              <Plus className="w-4 h-4 mr-2" />
              新規利用者
            </Button>
            <Button onClick={handleExport} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              CSV出力
            </Button>
          </div>
        </div>
      </Card>

      {/* ビューモード切り替え */}
      <div className="flex gap-2">
        <Button 
          size="sm"
          variant={viewMode === 'table' ? 'default' : 'outline'}
          onClick={() => setViewMode('table')}
          className={viewMode === 'table' ? 'bg-[#2D4A6F]' : ''}
        >
          📋 一覧表示
        </Button>
        <Button 
          size="sm"
          variant={viewMode === 'by-day' ? 'default' : 'outline'}
          onClick={() => setViewMode('by-day')}
          className={viewMode === 'by-day' ? 'bg-[#2D4A6F]' : ''}
        >
          📅 曜日別表示
        </Button>
      </div>

      {/* ビュー切り替え */}
      {viewMode === 'table' ? (
        // テーブル表示
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>利用者ID</TableHead>
                  <TableHead>名前</TableHead>
                  <TableHead>性別</TableHead>
                  <TableHead>電話</TableHead>
                  <TableHead>利用曜日</TableHead>
                  <TableHead>車椅子</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="text-sm text-slate-600">{client.clientCode || '-'}</TableCell>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {client.gender === 'male' ? '男' : client.gender === 'female' ? '女' : 'その他'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{client.phone || '-'}</TableCell>
                    <TableCell className="text-xs">
                      {client.daysOfWeek?.length > 0 ? (
                        <div className="flex gap-0.5 flex-wrap">
                          {client.daysOfWeek.map(dow => (
                            <span key={dow} className="inline-block w-5 h-5 bg-indigo-100 text-indigo-700 rounded text-center text-xs font-bold">
                              {DOW[dow]}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400">未設定</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {client.wheelchairRequired ? (
                        <Badge className="bg-amber-100 text-amber-700 text-xs">♿</Badge>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={client.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}>
                        {client.isActive ? '有効' : '無効'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(client)}>
                        <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { if (confirm('削除しますか？')) deleteMutation.mutate(client.id); }}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : (
        // 曜日別表示
         <div className="space-y-4">
           {DOW.map((dayLabel, dayIdx) => {
             const dayClients = sortedClients.filter(c => c.isActive !== false && c.daysOfWeek && c.daysOfWeek.includes(dayIdx));
            return (
              <Card key={dayIdx} className="border-0 shadow-lg overflow-hidden">
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                  <h3 className="font-bold text-base">{dayLabel}曜日（{dayClients.length}名）</h3>
                </div>
                {dayClients.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <p className="text-sm">この曜日の利用者はいません</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {dayClients.map((client) => (
                      <div key={client.id} className="p-4 hover:bg-slate-50 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{client.name}</span>
                            {client.wheelchairRequired && <Badge className="bg-amber-100 text-amber-700 text-xs">♿</Badge>}
                          </div>
                          <p className="text-sm text-slate-600">
                            {client.gender === 'male' ? '男性' : client.gender === 'female' ? '女性' : client.gender === 'other' ? 'その他' : ''}
                            {client.gender && client.phone && ' / '}
                            {client.phone}
                          </p>
                          {client.notes && <p className="text-xs text-slate-500 mt-1">📝 {client.notes}</p>}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(client)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { if (confirm('削除しますか？')) deleteMutation.mutate(client.id); }}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ダイアログ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingClient ? '利用者編集' : '新規利用者登録'}</DialogTitle>
            <p className="text-xs text-slate-500 mt-1">詳細な情報を設定できます</p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* 基本情報 */}
            <div className="space-y-3 pb-4 border-b">
              <h3 className="font-semibold text-sm">基本情報</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                    <Label>名前 *</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="山田 花子"
                    />
                  </div>
                  <div>
                    <Label>ID</Label>
                    <Input
                      value={form.clientCode}
                      onChange={(e) => setForm((f) => ({ ...f, clientCode: e.target.value }))}
                      placeholder="例: C001"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>性別</Label>
                    <Select value={form.gender} onValueChange={(v) => setForm((f) => ({ ...f, gender: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">男性</SelectItem>
                        <SelectItem value="female">女性</SelectItem>
                        <SelectItem value="other">その他</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>電話</Label><Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="090-1234-5678" /></div>
                </div>
                <div><Label>住所</Label><Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="札幌市北区..." /></div>
                </div>

            {/* 利用情報 */}
            <div className="space-y-3 pb-4 border-b">
              <h3 className="font-semibold text-sm">利用情報</h3>
              <div>
                <Label className="mb-2 block">利用曜日（複数選択可）</Label>
                <div className="grid grid-cols-7 gap-2">
                  {DOW.map((label, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        const days = form.daysOfWeek.includes(idx)
                          ? form.daysOfWeek.filter((d) => d !== idx)
                          : [...form.daysOfWeek, idx];
                        setForm((f) => ({ ...f, daysOfWeek: days }));
                      }}
                      className={`py-2 rounded border-2 text-sm font-bold transition-all ${
                        form.daysOfWeek.includes(idx)
                          ? 'border-[#2D4A6F] bg-[#2D4A6F]/10 text-[#2D4A6F]'
                          : 'border-slate-300 text-slate-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>週の通所回数</Label>
                <Select value={form.frequencyPerWeek.toString()} onValueChange={(v) => setForm((f) => ({ ...f, frequencyPerWeek: parseInt(v) }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <SelectItem key={n} value={n.toString()}>{n}回</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 送迎・対応情報 */}
            <div className="space-y-3 pb-4 border-b">
              <h3 className="font-semibold text-sm">送迎・対応</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Switch checked={form.pickupRequired} onCheckedChange={(v) => setForm((f) => ({ ...f, pickupRequired: v }))} />
                  <Label>朝の送迎（迎え）が必要</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.dropoffRequired} onCheckedChange={(v) => setForm((f) => ({ ...f, dropoffRequired: v }))} />
                  <Label>帰宅の送迎（送り）が必要</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.wheelchairRequired} onCheckedChange={(v) => setForm((f) => ({ ...f, wheelchairRequired: v }))} />
                  <Label>車椅子使用</Label>
                </div>
              </div>
            </div>

            {/* 健康・緊急連絡先情報 */}
            <div className="space-y-3 pb-4 border-b">
              <h3 className="font-semibold text-sm">健康・緊急連絡先</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>緊急連絡先名</Label>
                  <Input value={form.emergencyContactName} onChange={(e) => setForm((f) => ({ ...f, emergencyContactName: e.target.value }))} placeholder="山田 太郎" />
                </div>
                <div>
                  <Label>緊急連絡先電話</Label>
                  <Input value={form.emergencyContactPhone} onChange={(e) => setForm((f) => ({ ...f, emergencyContactPhone: e.target.value }))} placeholder="090-9999-9999" />
                </div>
              </div>
              <div>
                <Label>アレルギー情報</Label>
                <Input value={form.allergies} onChange={(e) => setForm((f) => ({ ...f, allergies: e.target.value }))} placeholder="例: 卵、エビ、パイナップル" />
              </div>
              <div>
                <Label>服用中の薬・病歴等</Label>
                <Textarea value={form.medicationInfo} onChange={(e) => setForm((f) => ({ ...f, medicationInfo: e.target.value }))} placeholder="高血圧の薬を毎朝服用..." className="h-16" />
              </div>
            </div>

            {/* 特別対応・備考 */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">特別対応・備考</h3>
              <div>
                <Label>特別な対応が必要な内容</Label>
                <Textarea value={form.specialNeeds} onChange={(e) => setForm((f) => ({ ...f, specialNeeds: e.target.value }))} placeholder="例: 言語が日本語のみ、聴覚障害あり..." className="h-16" />
              </div>
              <div>
                <Label>その他備考</Label>
                <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="その他の重要な情報..." className="h-16" />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
                <Label>有効</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              キャンセル
            </Button>
            <Button
              className="bg-[#2D4A6F]"
              disabled={!form.name}
              onClick={() => {
                if (editingClient) {
                  updateMutation.mutate({ id: editingClient.id, data: form });
                } else {
                  createMutation.mutate(form);
                }
              }}
            >
              {editingClient ? '更新' : '登録'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}