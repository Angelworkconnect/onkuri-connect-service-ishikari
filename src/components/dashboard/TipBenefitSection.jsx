import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Sparkles, Gift, Plus, Calendar } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

const tipTypeConfig = {
  special_thanks: { label: '現場貢献スペシャルサンクス', color: 'bg-[#7CB342]' },
  gratitude_gift: { label: '感謝還元サンクスギフト', color: 'bg-[#E8A4B8]' },
  support_thanks: { label: '人財穴埋めサンクス', color: 'bg-[#2D4A6F]' },
  snow_removal_thanks: { label: '除雪サンクス（冬季限定）', color: 'bg-cyan-500' },
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

export default function TipBenefitSection({ user }) {
  const [benefitDialogOpen, setBenefitDialogOpen] = useState(false);
  const [newBenefit, setNewBenefit] = useState({
    benefit_type: '',
    request_date: '',
    notes: '',
  });
  const queryClient = useQueryClient();

  const { data: tips = [] } = useQuery({
    queryKey: ['tips', user?.email],
    queryFn: () => user ? base44.entities.TipRecord.filter({ user_email: user.email }, '-date') : [],
    enabled: !!user,
  });

  const { data: benefits = [] } = useQuery({
    queryKey: ['benefits', user?.email],
    queryFn: () => user ? base44.entities.BenefitApplication.filter({ user_email: user.email }, '-created_date') : [],
    enabled: !!user,
  });

  const createBenefitMutation = useMutation({
    mutationFn: (data) => base44.entities.BenefitApplication.create({
      ...data,
      user_email: user.email,
      user_name: user.full_name,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['benefits']);
      setBenefitDialogOpen(false);
      setNewBenefit({ benefit_type: '', request_date: '', notes: '' });
    },
  });

  const totalTips = tips.reduce((sum, tip) => sum + (tip.amount || 0), 0);

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <Tabs defaultValue="tips" className="w-full">
        <div className="border-b border-slate-100">
          <TabsList className="w-full justify-start rounded-none bg-transparent p-0 h-auto">
            <TabsTrigger 
              value="tips" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#E8A4B8] data-[state=active]:bg-transparent px-6 py-4"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              サンクス履歴
            </TabsTrigger>
            <TabsTrigger 
              value="benefits"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#7CB342] data-[state=active]:bg-transparent px-6 py-4"
            >
              <Gift className="w-4 h-4 mr-2" />
              福利厚生
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="tips" className="p-6 mt-0">
          <div className="mb-6">
            <div className="bg-gradient-to-r from-[#E8A4B8]/10 to-[#E8A4B8]/5 rounded-lg p-4">
              <div className="text-sm text-slate-600 mb-1">累計サンクスポイント</div>
              <div className="text-3xl font-medium text-[#C17A8E]">{totalTips.toLocaleString()}pt</div>
            </div>
          </div>

          <div className="space-y-3">
            {tips.length > 0 ? (
              tips.map((tip) => (
                <div key={tip.id} className="border border-slate-100 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <Badge className={`${tipTypeConfig[tip.tip_type]?.color} text-white`}>
                      {tipTypeConfig[tip.tip_type]?.label}
                    </Badge>
                    <span className="text-lg font-medium text-[#C17A8E]">{tip.amount.toLocaleString()}pt</span>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{tip.reason}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span>{format(new Date(tip.date), 'yyyy年M月d日')}</span>
                    {tip.given_by && <span>付与者: {tip.given_by}</span>}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-slate-400">
                <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>まだサンクス履歴がありません</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="benefits" className="p-6 mt-0">
          <div className="mb-4">
            <Dialog open={benefitDialogOpen} onOpenChange={setBenefitDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full bg-[#7CB342] hover:bg-[#6BA02D]">
                  <Plus className="w-4 h-4 mr-2" />
                  福利厚生を申請する
                </Button>
              </DialogTrigger>
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
                      value={newBenefit.benefit_type}
                      onValueChange={(value) => setNewBenefit({ ...newBenefit, benefit_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="選択してください" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(benefitTypeConfig).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {config.icon} {config.label}
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
                    disabled={!newBenefit.benefit_type || !newBenefit.request_date || createBenefitMutation.isPending}
                  >
                    申請する
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            {benefits.length > 0 ? (
              benefits.map((benefit) => (
                <div key={benefit.id} className="border border-slate-100 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-sm font-medium text-slate-800 mb-1">
                        {benefitTypeConfig[benefit.benefit_type]?.icon} {benefitTypeConfig[benefit.benefit_type]?.label}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(benefit.request_date), 'yyyy年M月d日')}
                      </div>
                    </div>
                    <Badge className={statusConfig[benefit.status]?.color}>
                      {statusConfig[benefit.status]?.label}
                    </Badge>
                  </div>
                  {benefit.notes && (
                    <p className="text-sm text-slate-600 mt-2">{benefit.notes}</p>
                  )}
                  {benefit.admin_notes && (
                    <div className="mt-2 p-2 bg-slate-50 rounded text-xs text-slate-600">
                      <span className="font-medium">管理者メモ:</span> {benefit.admin_notes}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-slate-400">
                <Gift className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>まだ福利厚生の申請履歴がありません</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}