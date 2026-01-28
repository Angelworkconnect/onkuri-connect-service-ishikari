import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, Calendar, AlertCircle, Download, Trash2, Search } from "lucide-react";
import { format } from "date-fns";

export default function Documents() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [uploadFile, setUploadFile] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    category: 'staff_employment',
    related_type: 'staff',
    related_id: '',
    related_name: '',
    expiry_date: '',
    notes: ''
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      if (!u) {
        base44.auth.redirectToLogin();
        return;
      }
      if (u.role === 'admin') {
        setIsAdmin(true);
      }
      const staffList = await base44.entities.Staff.filter({ email: u.email });
      if (staffList.length > 0 && staffList[0].role === 'admin') {
        setIsAdmin(true);
      }
      setUser(u);
    });
  }, []);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list('-created_date', 1000),
    enabled: !!user && isAdmin
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.Staff.list(),
    enabled: !!user && isAdmin
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['careClients'],
    queryFn: () => base44.entities.CareClient.list(),
    enabled: !!user && isAdmin
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      let fileUrl = '';
      if (uploadFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: uploadFile });
        fileUrl = file_url;
      }
      return base44.entities.Document.create({ ...data, file_url: fileUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setDialogOpen(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Document.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    }
  });

  const resetForm = () => {
    setFormData({
      title: '',
      category: 'staff_employment',
      related_type: 'staff',
      related_id: '',
      related_name: '',
      expiry_date: '',
      notes: ''
    });
    setUploadFile(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const getCategoryLabel = (category) => {
    const labels = {
      staff_employment: '雇用契約書',
      staff_qualification: '資格証',
      staff_training: '研修記録',
      staff_other: 'その他職員書類',
      client_contract: '利用契約書',
      client_agreement: '重要事項説明書',
      client_plan: 'ケアプラン',
      client_other: 'その他利用者書類',
      office_regulation: '運営規定',
      office_bcp: 'BCP計画',
      office_minutes: '議事録',
      office_other: 'その他事業所書類'
    };
    return labels[category] || category;
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.related_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || doc.category === filterCategory;
    const matchesType = filterType === 'all' || doc.related_type === filterType;
    return matchesSearch && matchesCategory && matchesType;
  });

  const expiringDocs = documents.filter(doc => {
    if (!doc.expiry_date) return false;
    const daysUntilExpiry = Math.ceil((new Date(doc.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  });

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              アクセス権限がありません
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600">この機能は管理者のみ利用できます。</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2D4A6F] mx-auto"></div>
          <p className="mt-4 text-slate-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">書類管理</h1>
            <p className="text-slate-600 mt-1">職員・利用者・事業所書類の一元管理</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#2D4A6F] hover:bg-[#1E3A5F]">
                <Upload className="w-4 h-4 mr-2" />
                書類を登録
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>書類を登録</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>書類名 *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>区分 *</Label>
                  <Select
                    value={formData.related_type}
                    onValueChange={(v) => setFormData({ ...formData, related_type: v, category: v === 'staff' ? 'staff_employment' : v === 'client' ? 'client_contract' : 'office_regulation' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">職員</SelectItem>
                      <SelectItem value="client">利用者</SelectItem>
                      <SelectItem value="office">事業所</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>書類種別 *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) => setFormData({ ...formData, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.related_type === 'staff' && (
                        <>
                          <SelectItem value="staff_employment">雇用契約書</SelectItem>
                          <SelectItem value="staff_qualification">資格証</SelectItem>
                          <SelectItem value="staff_training">研修記録</SelectItem>
                          <SelectItem value="staff_other">その他職員書類</SelectItem>
                        </>
                      )}
                      {formData.related_type === 'client' && (
                        <>
                          <SelectItem value="client_contract">利用契約書</SelectItem>
                          <SelectItem value="client_agreement">重要事項説明書</SelectItem>
                          <SelectItem value="client_plan">ケアプラン</SelectItem>
                          <SelectItem value="client_other">その他利用者書類</SelectItem>
                        </>
                      )}
                      {formData.related_type === 'office' && (
                        <>
                          <SelectItem value="office_regulation">運営規定</SelectItem>
                          <SelectItem value="office_bcp">BCP計画</SelectItem>
                          <SelectItem value="office_minutes">議事録</SelectItem>
                          <SelectItem value="office_other">その他事業所書類</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                {formData.related_type === 'staff' && (
                  <div>
                    <Label>関連職員</Label>
                    <Select
                      value={formData.related_id}
                      onValueChange={(v) => {
                        const s = staff.find(s => s.email === v);
                        setFormData({ ...formData, related_id: v, related_name: s?.full_name || '' });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="職員を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {staff.map(s => (
                          <SelectItem key={s.id} value={s.email}>{s.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {formData.related_type === 'client' && (
                  <div>
                    <Label>関連利用者</Label>
                    <Select
                      value={formData.related_id}
                      onValueChange={(v) => {
                        const c = clients.find(c => c.id === v);
                        setFormData({ ...formData, related_id: v, related_name: c?.full_name || '' });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="利用者を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label>ファイル</Label>
                  <Input
                    type="file"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                  />
                </div>
                <div>
                  <Label>有効期限</Label>
                  <Input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>備考</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    キャンセル
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? '登録中...' : '登録'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Expiring Documents Alert */}
        {expiringDocs.length > 0 && (
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-amber-900">有効期限が近い書類があります</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    {expiringDocs.length}件の書類の有効期限が30日以内に切れます
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>検索</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="書類名・氏名で検索"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label>区分</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    <SelectItem value="staff">職員</SelectItem>
                    <SelectItem value="client">利用者</SelectItem>
                    <SelectItem value="office">事業所</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>書類種別</Label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    <SelectItem value="staff_employment">雇用契約書</SelectItem>
                    <SelectItem value="staff_qualification">資格証</SelectItem>
                    <SelectItem value="client_contract">利用契約書</SelectItem>
                    <SelectItem value="office_regulation">運営規定</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents List */}
        <div className="grid gap-4">
          {filteredDocuments.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-slate-500">
                書類が登録されていません
              </CardContent>
            </Card>
          ) : (
            filteredDocuments.map((doc) => {
              const isExpiring = doc.expiry_date && Math.ceil((new Date(doc.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)) <= 30;
              return (
                <Card key={doc.id} className={isExpiring ? 'border-amber-300' : ''}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-6 h-6 text-slate-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium text-lg">{doc.title}</h3>
                            <Badge variant="outline">{getCategoryLabel(doc.category)}</Badge>
                            {doc.related_name && (
                              <Badge variant="secondary">{doc.related_name}</Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                            {doc.expiry_date && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                有効期限: {format(new Date(doc.expiry_date), 'yyyy年MM月dd日')}
                                {isExpiring && (
                                  <Badge className="ml-2 bg-amber-500">期限間近</Badge>
                                )}
                              </div>
                            )}
                            <div>登録日: {format(new Date(doc.created_date), 'yyyy年MM月dd日')}</div>
                          </div>
                          {doc.notes && (
                            <p className="text-sm text-slate-600 mt-2">{doc.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {doc.file_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(doc.file_url, '_blank')}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm('この書類を削除しますか？')) {
                              deleteMutation.mutate(doc.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}