import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  Gift, Plus, Calendar, Car, Sparkles, Heart, Home, Bike, Plane, Coffee, 
  ShoppingBag, Utensils, Film, Music, Book, Dumbbell, Palmtree, Umbrella,
  Sun, Moon, Star, Wallet, CreditCard, Ticket, Gamepad, Camera, Laptop,
  Smartphone, Watch, Baby, Dog, Flower2
} from "lucide-react";
import { format } from 'date-fns';

const iconMap = {
  Gift, Car, Sparkles, Heart, Home, Bike, Plane, Coffee, 
  ShoppingBag, Utensils, Film, Music, Book, Dumbbell, Palmtree, Umbrella,
  Sun, Moon, Star, Wallet, CreditCard, Ticket, Gamepad, Camera, Laptop,
  Smartphone, Watch, Baby, Dog, Flower2
};

const benefitTypeConfig = {
  spa_relaxation: { label: 'エステ／リラクゼーション', icon: '💆' },
  car_share: { label: 'カーシェアサービス', icon: '🚗' },
  garage_use: { label: 'ガレージ使用権', icon: '🏠' },
  taxi_discount: { label: '介護タクシー職員割引', icon: '🚕' },
  funeral_discount: { label: '葬祭・遺品整理割引', icon: '🌸' },
};

const statusConfig = {
  pending: { label: '申請中', color: 'bg-yellow-100 text-yellow-700' },
  approved: { label: '承認済み', color: 'bg-green-100 text-green-700' },
  rejected: { label: '却下', color: 'bg-red-100 text-red-700' },
  used: { label: '利用済み', color: 'bg-slate-100 text-slate-500' },
};

export default function Benefits() {
  const [user, setUser] = useState(null);
  const [staff, setStaff] = useState(null);
  const [benefitDialogOpen, setBenefitDialogOpen] = useState(false);
  const [newBenefit, setNewBenefit] = useState({
    benefit_id: '',
    request_date: '',
    notes: '',
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      // Fetch staff info to check role
      const staffList = await base44.entities.Staff.filter({ email: u.email });
      if (staffList.length > 0) {
        setStaff(staffList[0]);
      }
    }).catch(() => {
      base44.auth.redirectToLogin();
    });
  }, []);

  const { data: benefits = [] } = useQuery({
    queryKey: ['benefits', user?.email],
    queryFn: () => user ? base44.entities.BenefitApplication.filter({ user_email: user.email }, '-created_date') : [],
    enabled: !!user,
  });

  const { data: allBenefits = [] } = useQuery({
    queryKey: ['all-benefits'],
    queryFn: () => base44.entities.Benefit.list('order'),
  });

  const createBenefitMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('createBenefitApplication', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['benefits']);
      setBenefitDialogOpen(false);
      setNewBenefit({ benefit_id: '', request_date: '', notes: '' });
    },
  });

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
        <div className="max-w-4xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-light mb-2">福利厚生サービス</h1>
          <p className="text-white/70">充実した働きやすさをサポート</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-8">
        <Card className="border-0 shadow-lg mb-6 p-6">
          <div className="mb-4">
            <h2 className="text-lg font-medium mb-2">利用可能なサービス</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {allBenefits.map((benefit) => {
                const IconComponent = benefit.icon && benefit.icon !== 'none' ? iconMap[benefit.icon] : null;
                const isComingSoon = benefit.status === 'coming_soon';
                return (
                  <div key={benefit.id} className={`${benefit.color} rounded-lg p-4 text-white ${isComingSoon ? 'opacity-75' : ''}`}>
                    <div className="flex items-start gap-3">
                      {IconComponent && <IconComponent className="w-6 h-6 flex-shrink-0 mt-0.5" />}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-lg">{benefit.title}</h3>
                          {isComingSoon && (
                            <span className="text-xs bg-white/20 px-2 py-0.5 rounded">準備中</span>
                          )}
                        </div>
                        <p className="text-sm opacity-90">{benefit.description}</p>
                        <div className="mt-2 text-xs opacity-75">
                          {benefit.frequency_type === 'unlimited' ? '利用制限なし' :
                           benefit.frequency_type === 'monthly' ? `月${benefit.frequency_limit || 1}回まで` :
                           benefit.frequency_type === 'yearly' ? `年${benefit.frequency_limit || 1}回まで` :
                           '1回のみ'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            </div>

            <div className="text-xs text-slate-400 mb-4">
             Debug: staff role = {staff?.role || 'no staff'}
            </div>

            {staff !== null && staff.role !== 'temporary' && (
            <>
              <Button 
                className="w-full bg-[#7CB342] hover:bg-[#6BA02D] mt-4"
                onClick={() => setBenefitDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                福利厚生を申請する
              </Button>

              <Dialog open={benefitDialogOpen} onOpenChange={setBenefitDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>福利厚生サービス申請</DialogTitle>
                    <DialogDescription>
                      利用したい福利厚生サービスを選択してください
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>サービス種類</Label>
                      <Select
                        value={newBenefit.benefit_id}
                        onValueChange={(value) => setNewBenefit({ ...newBenefit, benefit_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="選択してください" />
                        </SelectTrigger>
                        <SelectContent>
                          {allBenefits.filter(b => b.status === 'available').map((benefit) => (
                            <SelectItem key={benefit.id} value={benefit.id}>
                              {benefit.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>利用希望日</Label>
                      <Input
                        type="date"
                        value={newBenefit.request_date}
                        onChange={(e) => setNewBenefit({ ...newBenefit, request_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>備考</Label>
                      <Textarea
                        value={newBenefit.notes}
                        onChange={(e) => setNewBenefit({ ...newBenefit, notes: e.target.value })}
                        placeholder="その他ご要望などがあればご記入ください"
                      />
                    </div>
                    <Button 
                      className="w-full bg-[#7CB342] hover:bg-[#6BA02D]"
                      onClick={() => createBenefitMutation.mutate(newBenefit)}
                      disabled={!newBenefit.benefit_id || !newBenefit.request_date || createBenefitMutation.isPending}
                    >
                      申請する
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </Card>

        <div className="mb-4">
          <h2 className="text-lg font-medium">申請履歴</h2>
        </div>

        <div className="space-y-4">
          {benefits.length > 0 ? (
            benefits.map((benefit) => (
              <Card key={benefit.id} className="border-0 shadow-sm p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-lg font-medium text-slate-800 mb-2">
                      {allBenefits.find(b => b.id === benefit.benefit_id)?.title || '不明な福利厚生'}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Calendar className="w-4 h-4" />
                      利用希望日: {format(new Date(benefit.request_date), 'yyyy年M月d日')}
                    </div>
                  </div>
                  <Badge className={statusConfig[benefit.status]?.color}>
                    {statusConfig[benefit.status]?.label}
                  </Badge>
                </div>
                {benefit.notes && (
                  <p className="text-sm text-slate-600 mt-3 p-3 bg-slate-50 rounded">{benefit.notes}</p>
                )}
                {benefit.admin_notes && (
                  <div className="mt-3 p-3 bg-blue-50 rounded text-sm text-slate-700">
                    <span className="font-medium">管理者メモ:</span> {benefit.admin_notes}
                  </div>
                )}
                <div className="text-xs text-slate-400 mt-3">
                  申請日: {format(new Date(benefit.created_date), 'yyyy年M月d日 HH:mm')}
                </div>
              </Card>
            ))
          ) : (
            <Card className="border-0 shadow-sm p-12">
              <div className="text-center text-slate-400">
                <Gift className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">まだ福利厚生の申請履歴がありません</p>
                <p className="text-sm mt-2">上記のボタンから福利厚生サービスを申請できます</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}