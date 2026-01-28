import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
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
import { Plus, Edit, Trash2, CheckCircle, XCircle, Gift } from "lucide-react";
import { format } from "date-fns";

export default function BenefitManagement() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  const [benefitDialogOpen, setBenefitDialogOpen] = useState(false);
  const [editingBenefit, setEditingBenefit] = useState(null);
  const [benefitForm, setBenefitForm] = useState({
    title: '',
    description: '',
    icon: 'Gift',
    color: 'bg-[#E8A4B8]',
    frequency_type: 'monthly',
    frequency_limit: 1,
    eligible_roles: [],
    status: 'available',
    order: 0,
  });

  const [benefitAppDialogOpen, setBenefitAppDialogOpen] = useState(false);
  const [editingBenefitApp, setEditingBenefitApp] = useState(null);
  const [benefitAppForm, setBenefitAppForm] = useState({
    status: 'pending',
    admin_notes: '',
  });

  useEffect(() => {
    base44.auth.me().then(async u => {
      const staffList = await base44.entities.Staff.filter({ email: u.email });
      const isUserAdmin = u.role === 'admin';
      const staff = staffList.length > 0 ? staffList[0] : null;
      const isStaffAdmin = staff && staff.role === 'admin';
      
      if (!isUserAdmin && !isStaffAdmin) {
        alert('管理者権限がありません');
        window.location.href = '/';
        return;
      }
      
      setUser(u);
    }).catch(() => {
      base44.auth.redirectToLogin();
    });
  }, []);

  const { data: allBenefits = [] } = useQuery({
    queryKey: ['admin-benefits'],
    queryFn: () => base44.entities.Benefit.list('order'),
  });

  const { data: allBenefitApps = [] } = useQuery({
    queryKey: ['admin-benefit-apps'],
    queryFn: () => base44.entities.BenefitApplication.list('-created_date'),
  });

  const createBenefitMutation = useMutation({
    mutationFn: (data) => base44.entities.Benefit.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-benefits']);
      setBenefitDialogOpen(false);
      resetBenefitForm();
    },
  });

  const updateBenefitMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Benefit.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-benefits']);
      setBenefitDialogOpen(false);
      resetBenefitForm();
    },
  });

  const deleteBenefitMutation = useMutation({
    mutationFn: (id) => base44.entities.Benefit.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['admin-benefits']),
  });

  const updateBenefitAppMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BenefitApplication.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-benefit-apps']);
      setBenefitAppDialogOpen(false);
      resetBenefitAppForm();
    },
  });

  const deleteBenefitAppMutation = useMutation({
    mutationFn: (id) => base44.entities.BenefitApplication.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['admin-benefit-apps']),
  });

  const resetBenefitForm = () => {
    setBenefitForm({
      title: '',
      description: '',
      icon: 'Gift',
      color: 'bg-[#E8A4B8]',
      frequency_type: 'monthly',
      frequency_limit: 1,
      eligible_roles: [],
      status: 'available',
      order: 0,
    });
    setEditingBenefit(null);
  };

  const resetBenefitAppForm = () => {
    setBenefitAppForm({
      status: 'pending',
      admin_notes: '',
    });
    setEditingBenefitApp(null);
  };

  const handleEditBenefit = (benefit) => {
    setEditingBenefit(benefit);
    setBenefitForm({
      title: benefit.title,
      description: benefit.description,
      icon: benefit.icon,
      color: benefit.color,
      frequency_type: benefit.frequency_type || 'monthly',
      frequency_limit: benefit.frequency_limit || 1,
      status: benefit.status || 'available',
      order: benefit.order || 0,
    });
    setBenefitDialogOpen(true);
  };

  const handleSubmitBenefit = () => {
    if (editingBenefit) {
      updateBenefitMutation.mutate({ id: editingBenefit.id, data: benefitForm });
    } else {
      createBenefitMutation.mutate(benefitForm);
    }
  };

  const handleEditBenefitApp = (app) => {
    setEditingBenefitApp(app);
    setBenefitAppForm({
      status: app.status,
      admin_notes: app.admin_notes || '',
    });
    setBenefitAppDialogOpen(true);
  };

  const handleSubmitBenefitApp = () => {
    updateBenefitAppMutation.mutate({ id: editingBenefitApp.id, data: benefitAppForm });
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
      <div className="bg-gradient-to-br from-[#7CB342] to-[#6BA02D] text-white">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-light mb-2">福利厚生管理</h1>
          <p className="text-white/70">福利厚生項目の設定と申請の管理</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6">
        <Tabs defaultValue="items" className="w-full">
          <TabsList className="bg-white shadow-lg p-1 mb-6 w-full flex-wrap justify-start gap-1">
            <TabsTrigger value="items" className="data-[state=active]:bg-[#7CB342] data-[state=active]:text-white">
              <Gift className="w-4 h-4 mr-2" />
              福利厚生項目
            </TabsTrigger>
            <TabsTrigger value="applications" className="data-[state=active]:bg-[#7CB342] data-[state=active]:text-white">
              <CheckCircle className="w-4 h-4 mr-2" />
              申請管理
            </TabsTrigger>
          </TabsList>

          {/* Benefits Items Tab */}
          <TabsContent value="items">
            <Card className="border-0 shadow-lg">
              <div className="p-4 sm:p-6 border-b flex flex-col sm:flex-row gap-3 sm:gap-0 sm:justify-between sm:items-center">
                <h2 className="text-lg font-medium">福利厚生項目一覧</h2>
                <Button onClick={() => { resetBenefitForm(); setBenefitDialogOpen(true); }} className="bg-[#7CB342] hover:bg-[#6BA02D] w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  新規福利厚生項目
                </Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>項目名</TableHead>
                      <TableHead>説明</TableHead>
                      <TableHead>利用頻度</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead>アイコン</TableHead>
                      <TableHead>順序</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allBenefits.map((benefit) => (
                      <TableRow key={benefit.id}>
                        <TableCell className="font-medium">{benefit.title}</TableCell>
                        <TableCell className="max-w-xs truncate">{benefit.description}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {benefit.frequency_type === 'unlimited' ? '無制限' :
                             benefit.frequency_type === 'monthly' ? `月${benefit.frequency_limit || 1}回` :
                             benefit.frequency_type === 'yearly' ? `年${benefit.frequency_limit || 1}回` :
                             '1回のみ'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            benefit.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }>
                            {benefit.status === 'available' ? '利用可能' : '準備中'}
                          </Badge>
                        </TableCell>
                        <TableCell>{benefit.icon}</TableCell>
                        <TableCell>{benefit.order || 0}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEditBenefit(benefit)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteBenefitMutation.mutate(benefit.id)}>
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
          </TabsContent>

          {/* Benefit Applications Tab */}
          <TabsContent value="applications">
            <Card className="border-0 shadow-lg">
              <div className="p-4 sm:p-6 border-b">
                <h2 className="text-lg font-medium">福利厚生申請一覧</h2>
                <p className="text-sm text-slate-500 mt-1">スタッフからの福利厚生サービス申請を管理</p>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>申請者</TableHead>
                      <TableHead>福利厚生項目</TableHead>
                      <TableHead>利用希望日</TableHead>
                      <TableHead>申請日</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead>備考</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allBenefitApps.map((app) => (
                      <TableRow key={app.id}>
                        <TableCell className="font-medium">{app.user_name || app.user_email}</TableCell>
                        <TableCell>
                          {allBenefits.find(b => b.id === app.benefit_id)?.title || '不明'}
                        </TableCell>
                        <TableCell>{format(new Date(app.request_date), 'yyyy/M/d')}</TableCell>
                        <TableCell>{format(new Date(app.created_date), 'M/d HH:mm')}</TableCell>
                        <TableCell>
                          <Badge className={
                            app.status === 'approved' ? 'bg-green-100 text-green-700' :
                            app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            app.status === 'used' ? 'bg-slate-100 text-slate-500' :
                            'bg-amber-100 text-amber-700'
                          }>
                            {app.status === 'approved' ? '承認済み' :
                             app.status === 'rejected' ? '却下' :
                             app.status === 'used' ? '利用済み' :
                             '申請中'}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{app.notes || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEditBenefitApp(app)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            {app.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-[#7CB342] hover:bg-[#6BA232]"
                                  onClick={() => updateBenefitAppMutation.mutate({ id: app.id, data: { status: 'approved' } })}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-500 border-red-200 hover:bg-red-50"
                                  onClick={() => updateBenefitAppMutation.mutate({ id: app.id, data: { status: 'rejected' } })}
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => deleteBenefitAppMutation.mutate(app.id)}>
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
          </TabsContent>
        </Tabs>
      </div>

      {/* Benefit Dialog */}
      <Dialog open={benefitDialogOpen} onOpenChange={setBenefitDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBenefit ? '福利厚生項目編集' : '新規福利厚生項目作成'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label>項目名 *</Label>
              <Input value={benefitForm.title} onChange={(e) => setBenefitForm({...benefitForm, title: e.target.value})} />
            </div>
            <div>
              <Label>説明 *</Label>
              <Textarea value={benefitForm.description} onChange={(e) => setBenefitForm({...benefitForm, description: e.target.value})} className="h-24" />
            </div>
            <div>
              <Label>アイコン名</Label>
              <Select value={benefitForm.icon} onValueChange={(v) => setBenefitForm({...benefitForm, icon: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="none">🚫 アイコンなし</SelectItem>
                  <SelectItem value="Gift">🎁 ギフト（Gift）</SelectItem>
                  <SelectItem value="Car">🚗 車（Car）</SelectItem>
                  <SelectItem value="Sparkles">✨ エステ・リラクゼーション（Sparkles）</SelectItem>
                  <SelectItem value="Heart">❤️ ハート（Heart）</SelectItem>
                  <SelectItem value="Home">🏠 ホーム（Home）</SelectItem>
                  <SelectItem value="Bike">🚴 バイク（Bike）</SelectItem>
                  <SelectItem value="Plane">✈️ 飛行機（Plane）</SelectItem>
                  <SelectItem value="Coffee">☕ カフェ（Coffee）</SelectItem>
                  <SelectItem value="ShoppingBag">🛍️ ショッピング（ShoppingBag）</SelectItem>
                  <SelectItem value="Utensils">🍴 レストラン（Utensils）</SelectItem>
                  <SelectItem value="Film">🎬 映画（Film）</SelectItem>
                  <SelectItem value="Music">🎵 音楽（Music）</SelectItem>
                  <SelectItem value="Book">📚 読書（Book）</SelectItem>
                  <SelectItem value="Dumbbell">💪 フィットネス（Dumbbell）</SelectItem>
                  <SelectItem value="Palmtree">🌴 リゾート（Palmtree）</SelectItem>
                  <SelectItem value="Umbrella">☂️ 傘（Umbrella）</SelectItem>
                  <SelectItem value="Sun">☀️ 太陽（Sun）</SelectItem>
                  <SelectItem value="Moon">🌙 月（Moon）</SelectItem>
                  <SelectItem value="Star">⭐ スター（Star）</SelectItem>
                  <SelectItem value="Wallet">💰 ウォレット（Wallet）</SelectItem>
                  <SelectItem value="CreditCard">💳 クレジットカード（CreditCard）</SelectItem>
                  <SelectItem value="Ticket">🎟️ チケット（Ticket）</SelectItem>
                  <SelectItem value="Gamepad">🎮 ゲーム（Gamepad）</SelectItem>
                  <SelectItem value="Camera">📷 カメラ（Camera）</SelectItem>
                  <SelectItem value="Laptop">💻 PC（Laptop）</SelectItem>
                  <SelectItem value="Smartphone">📱 スマホ（Smartphone）</SelectItem>
                  <SelectItem value="Watch">⌚ 時計（Watch）</SelectItem>
                  <SelectItem value="Baby">👶 ベビー（Baby）</SelectItem>
                  <SelectItem value="Dog">🐕 ペット（Dog）</SelectItem>
                  <SelectItem value="Flower2">🌸 花（Flower2）</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>背景カラー *</Label>
              <div className="space-y-2">
                <Select 
                  value={benefitForm.color.startsWith('bg-[') ? 'custom' : benefitForm.color} 
                  onValueChange={(v) => {
                    if (v !== 'custom') {
                      setBenefitForm({...benefitForm, color: v});
                    }
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="プリセットから選択" /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="bg-[#E8A4B8]">🌸 ピンク</SelectItem>
                    <SelectItem value="bg-[#7CB342]">🌿 グリーン</SelectItem>
                    <SelectItem value="bg-[#2D4A6F]">🌊 ブルー</SelectItem>
                    <SelectItem value="bg-indigo-500">💜 インディゴ</SelectItem>
                    <SelectItem value="bg-purple-500">🔮 パープル</SelectItem>
                    <SelectItem value="bg-rose-500">🌹 ローズ</SelectItem>
                    <SelectItem value="bg-orange-500">🍊 オレンジ</SelectItem>
                    <SelectItem value="bg-amber-500">⚡ アンバー</SelectItem>
                    <SelectItem value="bg-yellow-500">☀️ イエロー</SelectItem>
                    <SelectItem value="bg-lime-500">🍋 ライム</SelectItem>
                    <SelectItem value="bg-emerald-500">💚 エメラルド</SelectItem>
                    <SelectItem value="bg-teal-500">🐬 ティール</SelectItem>
                    <SelectItem value="bg-cyan-500">🧊 シアン</SelectItem>
                    <SelectItem value="bg-sky-500">☁️ スカイ</SelectItem>
                    <SelectItem value="bg-slate-500">🪨 スレート</SelectItem>
                    <SelectItem value="custom">🎨 カスタム</SelectItem>
                  </SelectContent>
                </Select>
                {(benefitForm.color.startsWith('bg-[') || benefitForm.color === 'custom') && (
                  <div>
                    <Label className="text-xs text-slate-500">カスタムカラー（例: bg-[#FF5733] または bg-red-500）</Label>
                    <Input 
                      value={benefitForm.color} 
                      onChange={(e) => setBenefitForm({...benefitForm, color: e.target.value})} 
                      placeholder="bg-[#E8A4B8]"
                    />
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label>利用頻度制限 *</Label>
              <Select value={benefitForm.frequency_type} onValueChange={(v) => setBenefitForm({...benefitForm, frequency_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unlimited">無制限</SelectItem>
                  <SelectItem value="monthly">月単位</SelectItem>
                  <SelectItem value="yearly">年単位</SelectItem>
                  <SelectItem value="once">1回のみ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(benefitForm.frequency_type === 'monthly' || benefitForm.frequency_type === 'yearly') && (
              <div>
                <Label>期間内の利用回数上限</Label>
                <Input 
                  type="number" 
                  value={benefitForm.frequency_limit} 
                  onChange={(e) => setBenefitForm({...benefitForm, frequency_limit: Number(e.target.value)})} 
                  min="1"
                />
              </div>
            )}
            <div>
              <Label>ステータス *</Label>
              <Select value={benefitForm.status} onValueChange={(v) => setBenefitForm({...benefitForm, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">利用可能（申請可）</SelectItem>
                  <SelectItem value="coming_soon">準備中（表示のみ）</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>表示順序</Label>
              <Input type="number" value={benefitForm.order} onChange={(e) => setBenefitForm({...benefitForm, order: Number(e.target.value)})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBenefitDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleSubmitBenefit} className="bg-[#7CB342] hover:bg-[#6BA02D]">
              {editingBenefit ? '更新' : '作成'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Benefit Application Dialog */}
      <Dialog open={benefitAppDialogOpen} onOpenChange={setBenefitAppDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>福利厚生申請管理</DialogTitle>
          </DialogHeader>
          {editingBenefitApp && (
            <div className="space-y-4 py-4">
              <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">申請者:</span>
                  <span className="font-medium">{editingBenefitApp.user_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">福利厚生項目:</span>
                  <span className="font-medium">{allBenefits.find(b => b.id === editingBenefitApp.benefit_id)?.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">利用希望日:</span>
                  <span className="font-medium">{format(new Date(editingBenefitApp.request_date), 'yyyy年M月d日')}</span>
                </div>
                {editingBenefitApp.notes && (
                  <div className="pt-2 border-t">
                    <span className="text-sm text-slate-600">備考:</span>
                    <p className="text-sm mt-1">{editingBenefitApp.notes}</p>
                  </div>
                )}
              </div>
              <div>
                <Label>ステータス *</Label>
                <Select value={benefitAppForm.status} onValueChange={(v) => setBenefitAppForm({...benefitAppForm, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">申請中</SelectItem>
                    <SelectItem value="approved">承認済み</SelectItem>
                    <SelectItem value="rejected">却下</SelectItem>
                    <SelectItem value="used">利用済み</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>管理者メモ</Label>
                <Textarea 
                  value={benefitAppForm.admin_notes} 
                  onChange={(e) => setBenefitAppForm({...benefitAppForm, admin_notes: e.target.value})}
                  placeholder="申請者へのメッセージ、却下理由など"
                  className="h-24"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBenefitAppDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleSubmitBenefitApp} className="bg-[#7CB342] hover:bg-[#6BA02D]">
              更新
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}