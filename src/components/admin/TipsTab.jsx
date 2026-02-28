import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Sparkles, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";

const safeFormat = (d, f) => { if (!d) return '-'; const dt = new Date(d); if (isNaN(dt.getTime())) return '-'; return format(dt, f); };

const tipTypes = [
  { value: 'everyday_thanks', label: 'エブリデイサンクス' },
  { value: 'special_thanks', label: '現場貢献スペシャルサンクス' },
  { value: 'gratitude_gift', label: '感謝還元サンクスギフト' },
  { value: 'support_thanks', label: '人財穴埋めサンクス' },
  { value: 'snow_removal_thanks', label: '除雪サンクス（冬季限定）' },
  { value: 'qr_attendance_thanks', label: 'QRコード出退勤サンクス' },
  { value: 'sugoroku_thanks', label: 'スゴロクサンクス' },
];

export default function TipsTab({
  allTips, allStaff, dicePrizes,
  tipFilterStaff, setTipFilterStaff,
  tipFilterType, setTipFilterType,
  tipFilterMonth, setTipFilterMonth,
  onOpenTipDialog, onOpenDicePrizeDialog,
  onDeleteTip, onEditDicePrize, onDeleteDicePrize,
  onOpenStaffHistory,
}) {
  const now = new Date();

  const filteredTips = allTips.filter(tip => {
    if (tipFilterStaff !== 'all' && tip.user_email !== tipFilterStaff) return false;
    if (tipFilterType !== 'all' && tip.tip_type !== tipFilterType) return false;
    if (tipFilterMonth) {
      const tipMonth = safeFormat(tip.date, 'yyyy-MM');
      if (tipMonth !== tipFilterMonth) return false;
    }
    return true;
  });

  const monthTips = allTips.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg bg-gradient-to-br from-[#E8A4B8]/10 to-[#C17A8E]/5">
        <div className="p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-[#C17A8E]" />サンクスポイント付与
            </h2>
            <p className="text-sm text-slate-600 mt-1">スタッフへ感謝の気持ちを形にしましょう</p>
          </div>
          <Button onClick={onOpenTipDialog} size="lg"
            className="bg-gradient-to-r from-[#E8A4B8] to-[#C17A8E] hover:from-[#D393A7] hover:to-[#B06979] text-white shadow-lg">
            <Plus className="w-5 h-5 mr-2" />サンクスを付与
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <p className="text-sm text-purple-700 mb-2 font-medium">今月の総付与</p>
          <p className="text-3xl font-bold text-purple-900">{monthTips.reduce((s, t) => s + t.amount, 0).toLocaleString()}pt</p>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
          <p className="text-sm text-pink-700 mb-2 font-medium">今月の付与回数</p>
          <p className="text-3xl font-bold text-pink-900">{monthTips.length}回</p>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <p className="text-sm text-amber-700 mb-2 font-medium">累計付与額</p>
          <p className="text-3xl font-bold text-amber-900">{allTips.reduce((s, t) => s + t.amount, 0).toLocaleString()}pt</p>
        </Card>
      </div>

      <Card className="border-0 shadow-lg">
        <div className="p-6 border-b"><h3 className="text-lg font-medium">スタッフ別累計</h3></div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allStaff.map(staff => {
              const staffTips = allTips.filter(t => t.user_email === staff.email);
              const total = staffTips.reduce((s, t) => s + t.amount, 0);
              return (
                <Card key={staff.id} className="p-4 hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => onOpenStaffHistory(staff)}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#C17A8E] text-white flex items-center justify-center font-semibold text-sm">
                        {staff.full_name[0]}
                      </div>
                      <span className="font-medium text-slate-900">{staff.full_name}</span>
                    </div>
                    <Edit className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-[#C17A8E]">{total.toLocaleString()}</span>
                    <span className="text-sm text-slate-500">pt</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{staffTips.length}回付与</div>
                </Card>
              );
            })}
          </div>
        </div>
      </Card>

      <Card className="border-0 shadow-lg">
        <div className="p-6 border-b">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-lg font-medium">付与履歴</h3>
            <div className="flex flex-wrap gap-2">
              <Select value={tipFilterStaff} onValueChange={setTipFilterStaff}>
                <SelectTrigger className="w-40"><SelectValue placeholder="スタッフ" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全スタッフ</SelectItem>
                  {allStaff.map(s => <SelectItem key={s.email} value={s.email}>{s.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={tipFilterType} onValueChange={setTipFilterType}>
                <SelectTrigger className="w-44"><SelectValue placeholder="種類" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全種類</SelectItem>
                  {tipTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="month" value={tipFilterMonth} onChange={(e) => setTipFilterMonth(e.target.value)} className="w-40" />
            </div>
          </div>
        </div>
        <div className="p-6 space-y-3">
          {filteredTips.map((tip) => (
            <Card key={tip.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-[#C17A8E] text-white flex items-center justify-center font-semibold">
                      {tip.user_name[0]}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{tip.user_name}</p>
                      <Badge variant="outline" className="text-xs">
                        {tipTypes.find(t => t.value === tip.tip_type)?.label}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">{tip.reason || '-'}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-3xl font-bold text-[#C17A8E]">{tip.amount.toLocaleString()}<span className="text-lg">pt</span></div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{safeFormat(tip.date, 'yyyy/M/d')}</span>
                    <Button variant="ghost" size="icon" onClick={() => onDeleteTip(tip.id)} className="h-8 w-8">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
          {filteredTips.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>該当する付与履歴がありません</p>
            </div>
          )}
        </div>
      </Card>

      <Card className="border-0 shadow-lg">
        <div className="p-4 sm:p-6 border-b flex justify-between items-center">
          <h2 className="text-lg font-medium">双六ゲーム賞品設定</h2>
          <Button onClick={onOpenDicePrizeDialog} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" />賞品追加
          </Button>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {dicePrizes.map((prize) => (
              <Card key={prize.id} className="p-3 text-center">
                <div className="text-2xl mb-1">{prize.emoji || '🎁'}</div>
                <div className="text-sm font-bold">{prize.dice_number}の目</div>
                <div className="text-xs text-slate-600 truncate">{prize.prize_name}</div>
                <div className="text-sm font-bold text-purple-600">{prize.points}pt</div>
                <Badge className={prize.is_active !== false ? 'bg-green-100 text-green-700 text-xs mt-1' : 'bg-slate-100 text-slate-500 text-xs mt-1'}>
                  {prize.is_active !== false ? '有効' : '無効'}
                </Badge>
                <div className="flex gap-1 mt-2 justify-center">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditDicePrize(prize)}>
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDeleteDicePrize(prize.id)}>
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}