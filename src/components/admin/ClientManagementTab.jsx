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

const DOW = ['日', '月', '火', '水', '木', '金', '土'];

export default function ClientManagementTab() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [form, setForm] = useState({
    client_id: '',
    name: '',
    gender: 'other',
    phone: '',
    address: '',
    wheelchairRequired: false,
    notes: '',
    daysOfWeek: [],
    isActive: true,
  });
  const [viewMode, setViewMode] = useState('table'); // table or by-day
  const queryClient = useQueryClient();

  const { data: allClients = [] } = useQuery({
    queryKey: ['admin-clients'],
    queryFn: () => base44.entities.Client.list('-created_date', 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-clients']);
      setDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Client.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-clients']);
      setDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Client.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['admin-clients']),
  });

  const resetForm = () => {
    setForm({
      client_id: '',
      name: '',
      gender: 'other',
      phone: '',
      address: '',
      wheelchairRequired: false,
      notes: '',
      daysOfWeek: [],
      isActive: true,
    });
    setEditingClient(null);
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setForm({
      client_id: client.client_id || '',
      name: client.name || '',
      gender: client.gender || 'other',
      phone: client.phone || '',
      address: client.address || '',
      wheelchairRequired: client.wheelchairRequired || false,
      notes: client.notes || '',
      daysOfWeek: client.daysOfWeek || [],
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

      {/* テーブル */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>クライアントID</TableHead>
                <TableHead>名前</TableHead>
                <TableHead>性別</TableHead>
                <TableHead>電話</TableHead>
                <TableHead>住所</TableHead>
                <TableHead>車椅子</TableHead>
                <TableHead>利用曜日</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-mono font-medium text-sm">{client.client_id || '-'}</TableCell>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {client.gender === 'male' ? '男' : client.gender === 'female' ? '女' : 'その他'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{client.phone || '-'}</TableCell>
                  <TableCell className="text-sm max-w-xs truncate">{client.address || '-'}</TableCell>
                  <TableCell>
                    {client.wheelchairRequired ? (
                      <Badge className="bg-amber-100 text-amber-700">要</Badge>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {client.daysOfWeek?.length > 0 ? (
                      <div className="flex gap-0.5">
                        {client.daysOfWeek.map(dow => (
                          <span key={dow} className="inline-block w-5 h-5 bg-indigo-100 text-indigo-700 rounded text-center text-xs font-bold">
                            {DOW[dow]}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
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

      {/* ダイアログ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingClient ? 'クライアント編集' : '新規クライアント'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-xs font-medium text-slate-600">クライアントID</label>
              <Input
                placeholder="例: CLI001"
                value={form.client_id}
                onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">名前 *</label>
              <Input
                placeholder="利用者名"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">性別</label>
              <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">男性</SelectItem>
                  <SelectItem value="female">女性</SelectItem>
                  <SelectItem value="other">その他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">電話</label>
              <Input
                placeholder="09x-xxxx-xxxx"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">住所</label>
              <Input
                placeholder="住所"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">利用曜日</label>
              <div className="flex gap-1 mt-1 flex-wrap">
                {DOW.map((day, i) => (
                  <button
                    key={i}
                    onClick={() => toggleDayOfWeek(i)}
                    className={`w-8 h-8 rounded text-xs font-bold border transition-colors ${
                      form.daysOfWeek.includes(i)
                        ? 'bg-indigo-500 text-white border-indigo-500'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">備考</label>
              <Input
                placeholder="備考など"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="mt-1"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.wheelchairRequired}
                onChange={(e) => setForm({ ...form, wheelchairRequired: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-xs font-medium text-slate-600">車椅子使用</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-xs font-medium text-slate-600">有効</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleSubmit} className="bg-[#2D4A6F]" disabled={createMutation.isPending || updateMutation.isPending}>
              {editingClient ? '更新' : '作成'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}