import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Mail, Trash2, Sparkles, Send } from "lucide-react";
import StaffTaxFields from './StaffTaxFields';

const tipTypes = [
  { value: 'everyday_thanks', label: 'エブリデイサンクス' },
  { value: 'special_thanks', label: '現場貢献スペシャルサンクス' },
  { value: 'gratitude_gift', label: '感謝還元サンクスギフト' },
  { value: 'support_thanks', label: '人財穴埋めサンクス' },
  { value: 'snow_removal_thanks', label: '除雪サンクス（冬季限定）' },
  { value: 'qr_attendance_thanks', label: 'QRコード出退勤サンクス' },
  { value: 'sugoroku_thanks', label: 'スゴロクサンクス' },
];

const categoryTypes = [
  { value: 'general', label: '一般' },
  { value: 'shift', label: 'シフト' },
  { value: 'welfare', label: '福利厚生' },
  { value: 'event', label: 'イベント' },
  { value: 'urgent', label: '緊急' },
  { value: 'thanks', label: 'サンクス' },
  { value: 'trial', label: '体験' },
];

export default function AdminDialogs({
  // Shift dialog
  shiftDialogOpen, setShiftDialogOpen, editingShift, shiftForm, setShiftForm, handleSubmitShift, serviceTypes,
  // Staff dialog
  staffDialogOpen, setStaffDialogOpen, editingStaff, staffForm, setStaffForm, handleSubmitStaff, inviteStaffMutation,
  // Announcement dialog
  announcementDialogOpen, setAnnouncementDialogOpen, editingAnnouncement, announcementForm, setAnnouncementForm, handleSubmitAnnouncement,
  // Report dialog
  reportDialogOpen, setReportDialogOpen, reportForm, setReportForm, handleGenerateReport, isGeneratingReport,
  // Tip dialog
  tipDialogOpen, setTipDialogOpen, tipForm, setTipForm, allStaff, createTipMutation, resetTipForm,
  // Service dialog
  serviceDialogOpen, setServiceDialogOpen, editingService, serviceForm, setServiceForm, handleSubmitService,
  // Benefit dialog
  benefitDialogOpen, setBenefitDialogOpen, editingBenefit, benefitForm, setBenefitForm, handleSubmitBenefit,
  // Benefit app dialog
  benefitAppDialogOpen, setBenefitAppDialogOpen, editingBenefitApp, benefitAppForm, setBenefitAppForm, handleSubmitBenefitApp, allBenefits, safeFormat,
  // Dice prize dialog
  dicePrizeDialogOpen, setDicePrizeDialogOpen, editingDicePrize, dicePrizeForm, setDicePrizeForm, handleSubmitDicePrize,
  // Broadcast dialog
  broadcastDialogOpen, setBroadcastDialogOpen, broadcastForm, setBroadcastForm, broadcastMessageMutation,
  // Staff tip history dialog
  staffTipHistoryDialogOpen, setStaffTipHistoryDialogOpen, selectedStaffForTips, allTips, allPayouts,
  deleteTipMutation, restoreTipMutation, deletePayoutMutation, restorePayoutMutation,
  resetPayoutForm, payoutForm, setPayoutForm, setPayoutDialogOpen, setTipDialogOpen: setTipDialogOpenAlias,
  // Payout dialog
  payoutDialogOpen, createPayoutMutation,
  // Attendance dialog
  attendanceDialogOpen, setAttendanceDialogOpen, editingAttendance, attendanceForm, setAttendanceForm,
  handleSubmitAttendance, createAttendanceMutation, updateAttendanceMutation, deleteAttendanceMutation,
}) {
  return (
    <>
      {/* Shift Dialog */}
      <Dialog open={shiftDialogOpen} onOpenChange={setShiftDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingShift ? 'シフト編集' : '新規シフト作成'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div><Label>タイトル *</Label><Input value={shiftForm.title} onChange={(e) => setShiftForm({...shiftForm, title: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>日付 *</Label><Input type="date" value={shiftForm.date} onChange={(e) => setShiftForm({...shiftForm, date: e.target.value})} /></div>
              <div><Label>サービス種別 *</Label>
                <Select value={shiftForm.service_type} onValueChange={(v) => setShiftForm({...shiftForm, service_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{serviceTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>募集状態 *</Label>
              <Select value={shiftForm.status} onValueChange={(v) => setShiftForm({...shiftForm, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">募集中</SelectItem>
                  <SelectItem value="filled">募集終了</SelectItem>
                  <SelectItem value="cancelled">募集停止</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>開始時間 *</Label><Input type="time" value={shiftForm.start_time} onChange={(e) => setShiftForm({...shiftForm, start_time: e.target.value})} /></div>
              <div><Label>終了時間 *</Label><Input type="time" value={shiftForm.end_time} onChange={(e) => setShiftForm({...shiftForm, end_time: e.target.value})} /></div>
            </div>
            <div><Label>勤務場所 *</Label><Input value={shiftForm.location} onChange={(e) => setShiftForm({...shiftForm, location: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>時給（円）</Label><Input type="number" value={shiftForm.hourly_rate} onChange={(e) => setShiftForm({...shiftForm, hourly_rate: e.target.value})} /></div>
              <div><Label>募集人数</Label><Input type="number" value={shiftForm.max_applicants} onChange={(e) => setShiftForm({...shiftForm, max_applicants: e.target.value})} /></div>
            </div>
            <div><Label>必要スキル（カンマ区切り）</Label><Input value={shiftForm.required_skills} onChange={(e) => setShiftForm({...shiftForm, required_skills: e.target.value})} placeholder="介護福祉士, 普通免許" /></div>
            <div><Label>詳細説明</Label><Textarea value={shiftForm.description} onChange={(e) => setShiftForm({...shiftForm, description: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShiftDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleSubmitShift} className="bg-[#2D4A6F]">{editingShift ? '更新' : '作成'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Staff Dialog */}
      <Dialog open={staffDialogOpen} onOpenChange={setStaffDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingStaff ? 'スタッフ編集' : '新規スタッフ登録'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4 max-h-[65vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>苗字 *</Label><Input value={staffForm.last_name || ''} onChange={(e) => { const ln = e.target.value; setStaffForm(prev => ({...prev, last_name: ln, full_name: [ln, prev.first_name].filter(Boolean).join(' ')})); }} placeholder="山下" /></div>
              <div><Label>名前 *</Label><Input value={staffForm.first_name || ''} onChange={(e) => { const fn = e.target.value; setStaffForm(prev => ({...prev, first_name: fn, full_name: [prev.last_name, fn].filter(Boolean).join(' ')})); }} placeholder="恵" /></div>
            </div>
            <div><Label>メールアドレス *</Label><Input type="email" value={staffForm.email} onChange={(e) => setStaffForm({...staffForm, email: e.target.value})} placeholder="yamada@example.com" /></div>
            <div><Label>電話番号</Label><Input type="tel" value={staffForm.phone} onChange={(e) => setStaffForm({...staffForm, phone: e.target.value})} placeholder="090-1234-5678" /></div>
            <div><Label>住所</Label><Input value={staffForm.address} onChange={(e) => setStaffForm({...staffForm, address: e.target.value})} placeholder="札幌市中央区..." /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>生年月日</Label><Input type="date" value={staffForm.date_of_birth} onChange={(e) => setStaffForm({...staffForm, date_of_birth: e.target.value})} /></div>
              <div><Label>性別</Label>
                <Select value={staffForm.gender} onValueChange={(v) => setStaffForm({...staffForm, gender: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="male">男性</SelectItem><SelectItem value="female">女性</SelectItem><SelectItem value="other">その他</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>外部連携コード <span className="text-xs font-normal text-slate-400">（給与ソフト・勤怠システムの社員番号）</span></Label>
              <Input value={staffForm.external_staff_code || ''} onChange={(e) => setStaffForm({...staffForm, external_staff_code: e.target.value})} placeholder="例: 001, E0042" />
              <p className="text-xs text-slate-400 mt-1">MFクラウド勤怠・freee・弥生・ジョブカンなど各ソフトのCSV出力時に使用されます</p>
            </div>
            <div><Label>カテゴリー *</Label>
              <Select value={staffForm.role} onValueChange={(v) => setStaffForm({...staffForm, role: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">管理者</SelectItem><SelectItem value="full_time">正社員</SelectItem>
                  <SelectItem value="part_time">パート</SelectItem><SelectItem value="temporary">単発</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>在籍ステータス *</Label>
              <Select value={staffForm.status || 'active'} onValueChange={(v) => setStaffForm({...staffForm, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">✅ 在籍中</SelectItem>
                  <SelectItem value="leave">🟡 休職中</SelectItem>
                  <SelectItem value="inactive">❌ 退職・停止</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>承認ステータス *</Label>
              <Select value={staffForm.approval_status} onValueChange={(v) => setStaffForm({...staffForm, approval_status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">承認待ち</SelectItem><SelectItem value="approved">承認済み</SelectItem><SelectItem value="rejected">却下</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 p-2 border rounded-lg bg-blue-50">
              <input
                type="checkbox"
                checked={staffForm.display_in_shift_calendar !== false}
                onChange={(e) => setStaffForm({...staffForm, display_in_shift_calendar: e.target.checked})}
                className="w-4 h-4 accent-indigo-600"
              />
              <Label className="mb-0">シフトカレンダーに表示する</Label>
            </div>
            <div>
              <Label>保有資格（複数選択可）</Label>
              <div className="mt-2 border rounded-lg p-3 max-h-48 overflow-y-auto bg-slate-50 space-y-1.5">
                {[
                  '無資格','看護師','准看護師','介護福祉士','実務者研修','初任者研修',
                  '理学療法士','作業療法士','言語聴覚士','柔道整復師','あん摩マッサージ指圧師',
                  '社会福祉士','精神保健福祉士','社会福祉主事任用資格',
                  '管理栄養士','栄養士','介護支援専門員','認知症介護実践者研修',
                  '普通自動車免許','普通二種免許','福祉有償運送講習',
                ].map(q => {
                  const checked = (staffForm.qualifications || []).includes(q);
                  return (
                    <label key={q} className="flex items-center gap-2 cursor-pointer hover:bg-white rounded px-1 py-0.5">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const cur = staffForm.qualifications || [];
                          setStaffForm({
                            ...staffForm,
                            qualifications: checked ? cur.filter(x => x !== q) : [...cur, q],
                          });
                        }}
                        className="w-4 h-4 accent-indigo-600"
                      />
                      <span className="text-sm text-slate-700">{q}</span>
                    </label>
                  );
                })}
              </div>
              {(staffForm.qualifications || []).length > 0 && (
                <p className="text-xs text-indigo-600 mt-1">選択中: {(staffForm.qualifications || []).join('、')}</p>
              )}
            </div>
            <StaffTaxFields form={staffForm} setForm={setStaffForm} />
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-3">
            {editingStaff && (
              <Button variant="outline" onClick={() => inviteStaffMutation.mutate({ email: staffForm.email })}
                className="w-full sm:w-auto gap-2 border-blue-200 text-blue-600 hover:bg-blue-50" disabled={inviteStaffMutation.isPending}>
                <Mail className="w-4 h-4" />{inviteStaffMutation.isPending ? '送信中...' : '招待メールを送信'}
              </Button>
            )}
            <div className="flex gap-2 ml-auto w-full sm:w-auto">
              <Button variant="outline" onClick={() => setStaffDialogOpen(false)} className="flex-1 sm:flex-none">キャンセル</Button>
              <Button onClick={handleSubmitStaff} className="bg-[#2D4A6F] flex-1 sm:flex-none" disabled={(!staffForm.full_name && !staffForm.last_name) || !staffForm.email}>
                {editingStaff ? '更新' : '登録'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Announcement Dialog */}
      <Dialog open={announcementDialogOpen} onOpenChange={setAnnouncementDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingAnnouncement ? 'お知らせ編集' : '新規お知らせ'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label>タイトル *</Label><Input value={announcementForm.title} onChange={(e) => setAnnouncementForm({...announcementForm, title: e.target.value})} /></div>
            <div><Label>カテゴリ</Label>
              <Select value={announcementForm.category} onValueChange={(v) => setAnnouncementForm({...announcementForm, category: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{categoryTypes.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>内容 *</Label><Textarea value={announcementForm.content} onChange={(e) => setAnnouncementForm({...announcementForm, content: e.target.value})} className="h-32" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnnouncementDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleSubmitAnnouncement} className="bg-[#2D4A6F]">{editingAnnouncement ? '更新' : '投稿'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>勤怠レポート生成</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label>レポートタイプ *</Label>
              <Select value={reportForm.reportType} onValueChange={(v) => setReportForm({...reportForm, reportType: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="monthly">月次</SelectItem><SelectItem value="weekly">週次</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>開始日 *</Label><Input type="date" value={reportForm.startDate} onChange={(e) => setReportForm({...reportForm, startDate: e.target.value})} /></div>
            <div><Label>終了日 *</Label><Input type="date" value={reportForm.endDate} onChange={(e) => setReportForm({...reportForm, endDate: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleGenerateReport} className="bg-[#2D4A6F]" disabled={isGeneratingReport}>
              {isGeneratingReport ? '生成中...' : 'PDFダウンロード'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tip Dialog */}
      <Dialog open={tipDialogOpen} onOpenChange={setTipDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>サンクス付与</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label>スタッフ *</Label>
              <Select value={tipForm.user_email} onValueChange={(v) => setTipForm({...tipForm, user_email: v})}>
                <SelectTrigger><SelectValue placeholder="スタッフを選択" /></SelectTrigger>
                <SelectContent>{allStaff.map(s => <SelectItem key={s.email} value={s.email}>{s.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>サンクス種類 *</Label>
              <Select value={tipForm.tip_type} onValueChange={(v) => setTipForm({...tipForm, tip_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{tipTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>ポイント / 金額（円）*</Label>
              <Input type="number" value={tipForm.amount} onChange={(e) => setTipForm({...tipForm, amount: e.target.value})} placeholder="5000" />
              <p className="text-xs text-slate-500 mt-1">※1ポイント = 1円として換算されます</p>
            </div>
            <div><Label>理由 *</Label><Textarea value={tipForm.reason} onChange={(e) => setTipForm({...tipForm, reason: e.target.value})} placeholder="業務への貢献内容を記入してください" className="h-24" /></div>
            <div><Label>付与日 *</Label><Input type="date" value={tipForm.date} onChange={(e) => setTipForm({...tipForm, date: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTipDialogOpen(false)}>キャンセル</Button>
            <Button onClick={() => createTipMutation.mutate({...tipForm, amount: Number(tipForm.amount)})}
              className="bg-[#2D4A6F]" disabled={!tipForm.user_email || !tipForm.amount || !tipForm.reason || createTipMutation.isPending}>
              付与
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Service Dialog */}
      <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingService ? 'サービス編集' : '新規サービス作成'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label>サービス名 *</Label><Input value={serviceForm.title} onChange={(e) => setServiceForm({...serviceForm, title: e.target.value})} /></div>
            <div><Label>説明 *</Label><Textarea value={serviceForm.description} onChange={(e) => setServiceForm({...serviceForm, description: e.target.value})} className="h-24" /></div>
            <div><Label>アイコン名（Lucide React）*</Label><Input value={serviceForm.icon} onChange={(e) => setServiceForm({...serviceForm, icon: e.target.value})} placeholder="Heart, Truck, Flower2など" /></div>
            <div><Label>背景カラークラス *</Label><Input value={serviceForm.color} onChange={(e) => setServiceForm({...serviceForm, color: e.target.value})} placeholder="bg-[#2D4A6F]" /></div>
            <div><Label>表示順序</Label><Input type="number" value={serviceForm.order} onChange={(e) => setServiceForm({...serviceForm, order: Number(e.target.value)})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setServiceDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleSubmitService} className="bg-[#2D4A6F]">{editingService ? '更新' : '作成'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Benefit Dialog */}
      <Dialog open={benefitDialogOpen} onOpenChange={setBenefitDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingBenefit ? '福利厚生項目編集' : '新規福利厚生項目作成'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div><Label>項目名 *</Label><Input value={benefitForm.title} onChange={(e) => setBenefitForm({...benefitForm, title: e.target.value})} /></div>
            <div><Label>説明 *</Label><Textarea value={benefitForm.description} onChange={(e) => setBenefitForm({...benefitForm, description: e.target.value})} className="h-24" /></div>
            <div><Label>利用頻度制限 *</Label>
              <Select value={benefitForm.frequency_type} onValueChange={(v) => setBenefitForm({...benefitForm, frequency_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unlimited">無制限</SelectItem><SelectItem value="monthly">月単位</SelectItem>
                  <SelectItem value="yearly">年単位</SelectItem><SelectItem value="once">1回のみ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(benefitForm.frequency_type === 'monthly' || benefitForm.frequency_type === 'yearly') && (
              <div><Label>期間内の利用回数上限</Label>
                <Input type="number" value={benefitForm.frequency_limit} onChange={(e) => setBenefitForm({...benefitForm, frequency_limit: Number(e.target.value)})} min="1" />
              </div>
            )}
            <div><Label>ステータス *</Label>
              <Select value={benefitForm.status} onValueChange={(v) => setBenefitForm({...benefitForm, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">利用可能（申請可）</SelectItem>
                  <SelectItem value="coming_soon">準備中（表示のみ）</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>表示順序</Label><Input type="number" value={benefitForm.order} onChange={(e) => setBenefitForm({...benefitForm, order: Number(e.target.value)})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBenefitDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleSubmitBenefit} className="bg-[#2D4A6F]">{editingBenefit ? '更新' : '作成'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Benefit Application Dialog */}
      <Dialog open={benefitAppDialogOpen} onOpenChange={setBenefitAppDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>福利厚生申請管理</DialogTitle></DialogHeader>
          {editingBenefitApp && (
            <div className="space-y-4 py-4">
              <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between"><span className="text-sm text-slate-600">申請者:</span><span className="font-medium">{editingBenefitApp.user_name}</span></div>
                <div className="flex justify-between"><span className="text-sm text-slate-600">福利厚生項目:</span><span className="font-medium">{allBenefits.find(b => b.id === editingBenefitApp.benefit_id)?.title}</span></div>
                <div className="flex justify-between"><span className="text-sm text-slate-600">利用希望日:</span><span className="font-medium">{safeFormat(editingBenefitApp.request_date, 'yyyy年M月d日')}</span></div>
              </div>
              <div><Label>ステータス *</Label>
                <Select value={benefitAppForm.status} onValueChange={(v) => setBenefitAppForm({...benefitAppForm, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">申請中</SelectItem><SelectItem value="approved">承認済み</SelectItem>
                    <SelectItem value="rejected">却下</SelectItem><SelectItem value="used">利用済み</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>管理者メモ</Label>
                <Textarea value={benefitAppForm.admin_notes} onChange={(e) => setBenefitAppForm({...benefitAppForm, admin_notes: e.target.value})} placeholder="申請者へのメッセージ、却下理由など" className="h-24" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBenefitAppDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleSubmitBenefitApp} className="bg-[#2D4A6F]">更新</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dice Prize Dialog */}
      <Dialog open={dicePrizeDialogOpen} onOpenChange={setDicePrizeDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingDicePrize ? '賞品編集' : '新規賞品追加'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label>サイコロの出目 *</Label>
              <Select value={String(dicePrizeForm.dice_number)} onValueChange={(v) => setDicePrizeForm({...dicePrizeForm, dice_number: Number(v)})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6].map(n => <SelectItem key={n} value={String(n)}>{['⚀','⚁','⚂','⚃','⚄','⚅'][n-1]} {n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>賞品名 *</Label><Input value={dicePrizeForm.prize_name} onChange={(e) => setDicePrizeForm({...dicePrizeForm, prize_name: e.target.value})} placeholder="例: ラッキーボーナス" /></div>
            <div><Label>ポイント *</Label><Input type="number" value={dicePrizeForm.points} onChange={(e) => setDicePrizeForm({...dicePrizeForm, points: e.target.value})} placeholder="例: 1000" /></div>
            <div><Label>絵文字</Label><Input value={dicePrizeForm.emoji} onChange={(e) => setDicePrizeForm({...dicePrizeForm, emoji: e.target.value})} placeholder="例: 🎁" maxLength={2} /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={dicePrizeForm.is_active} onChange={(e) => setDicePrizeForm({...dicePrizeForm, is_active: e.target.checked})} className="w-4 h-4" />
              <Label>有効にする</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDicePrizeDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleSubmitDicePrize} className="bg-purple-600 hover:bg-purple-700" disabled={!dicePrizeForm.prize_name || !dicePrizeForm.points}>
              {editingDicePrize ? '更新' : '追加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Broadcast Dialog */}
      <Dialog open={broadcastDialogOpen} onOpenChange={setBroadcastDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>一斉メッセージ送信</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label>送信対象 *</Label>
              <Select value={broadcastForm.target} onValueChange={(v) => setBroadcastForm({...broadcastForm, target: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">全スタッフ</SelectItem><SelectItem value="role">職種指定</SelectItem></SelectContent>
              </Select>
            </div>
            {broadcastForm.target === 'role' && (
              <div><Label>職種選択 *</Label>
                <Select value={broadcastForm.targetRole} onValueChange={(v) => setBroadcastForm({...broadcastForm, targetRole: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全職種</SelectItem><SelectItem value="admin">管理者</SelectItem>
                    <SelectItem value="full_time">正社員</SelectItem><SelectItem value="part_time">パート</SelectItem><SelectItem value="temporary">単発</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div><Label>対象人数</Label>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-2xl font-bold text-[#2D4A6F]">
                  {broadcastForm.target === 'all' ? allStaff.length : broadcastForm.targetRole === 'all' ? allStaff.length : allStaff.filter(s => s.role === broadcastForm.targetRole).length}名
                </span>
              </div>
            </div>
            <div><Label>メッセージ内容 *</Label>
              <Textarea value={broadcastForm.content} onChange={(e) => setBroadcastForm({...broadcastForm, content: e.target.value})} placeholder="全スタッフに送信するメッセージを入力してください" className="h-32" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBroadcastDialogOpen(false)}>キャンセル</Button>
            <Button onClick={() => broadcastMessageMutation.mutate(broadcastForm)} disabled={!broadcastForm.content.trim() || broadcastMessageMutation.isPending} className="bg-[#E8A4B8] hover:bg-[#D393A7]">
              {broadcastMessageMutation.isPending ? '送信中...' : '一斉送信'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Staff Tip History Dialog */}
      <Dialog open={staffTipHistoryDialogOpen} onOpenChange={setStaffTipHistoryDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedStaffForTips && (
                <>
                  <div className="w-12 h-12 rounded-full bg-[#C17A8E] text-white flex items-center justify-center font-bold text-lg">{selectedStaffForTips.full_name[0]}</div>
                  <div><p className="text-xl">{selectedStaffForTips.full_name}</p><p className="text-sm font-normal text-slate-500">{selectedStaffForTips.email}</p></div>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedStaffForTips && (() => {
            const totalEarned = allTips.filter(t => t.user_email === selectedStaffForTips.email && !t.is_deleted).reduce((sum, t) => sum + t.amount, 0);
            const totalPaidOut = allPayouts.filter(p => p.user_email === selectedStaffForTips.email && !p.is_deleted).reduce((sum, p) => sum + p.amount, 0);
            const balance = totalEarned - totalPaidOut;
            return (
              <div className="py-4">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100"><p className="text-sm text-purple-700 mb-1">累計獲得</p><p className="text-3xl font-bold text-purple-900">{totalEarned.toLocaleString()}pt</p></Card>
                  <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100"><p className="text-sm text-red-700 mb-1">払い出し済み</p><p className="text-3xl font-bold text-red-900">{totalPaidOut.toLocaleString()}pt</p></Card>
                  <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100"><p className="text-sm text-green-700 mb-1">現在の残高</p><p className="text-3xl font-bold text-green-900">{balance.toLocaleString()}pt</p></Card>
                </div>
                <Tabs defaultValue="tips">
                  <TabsList className="w-full mb-4">
                    <TabsTrigger value="tips" className="flex-1">付与履歴</TabsTrigger>
                    <TabsTrigger value="payouts" className="flex-1">払い出し履歴</TabsTrigger>
                  </TabsList>
                  <TabsContent value="tips" className="space-y-3 max-h-[400px] overflow-y-auto">
                    {allTips.filter(t => t.user_email === selectedStaffForTips.email && !t.is_deleted).map((tip) => (
                      <Card key={tip.id} className="p-4 border-l-4 border-l-green-400">
                        <div className="flex justify-between items-center">
                          <div>
                            <Badge variant="outline" className="bg-green-50 text-green-700">{tipTypes.find(t2 => t2.value === tip.tip_type)?.label}</Badge>
                            <p className="text-sm text-slate-600 mt-1">{tip.reason}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-xl font-bold text-green-600">+{tip.amount.toLocaleString()}pt</p>
                            <Button variant="ghost" size="icon" onClick={() => deleteTipMutation.mutate(tip.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </TabsContent>
                  <TabsContent value="payouts" className="space-y-3 max-h-[400px] overflow-y-auto">
                    {allPayouts.filter(p => p.user_email === selectedStaffForTips.email && !p.is_deleted).map((payout) => (
                      <Card key={payout.id} className="p-4 border-l-4 border-l-red-400">
                        <div className="flex justify-between items-center">
                          <div><p className="text-sm text-slate-600">{payout.reason}</p></div>
                          <div className="flex items-center gap-2">
                            <p className="text-xl font-bold text-red-600">-{payout.amount.toLocaleString()}pt</p>
                            <Button variant="ghost" size="icon" onClick={() => deletePayoutMutation.mutate(payout.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </TabsContent>
                </Tabs>
              </div>
            );
          })()}
          <DialogFooter>
            <Button onClick={() => { resetPayoutForm(); setPayoutForm(p => ({...p, user_email: selectedStaffForTips?.email || ''})); setStaffTipHistoryDialogOpen(false); setPayoutDialogOpen(true); }}
              variant="outline" className="mr-auto text-red-600 border-red-200 hover:bg-red-50">
              <Trash2 className="w-4 h-4 mr-2" />払い出し
            </Button>
            <Button onClick={() => { setStaffTipHistoryDialogOpen(false); setTipDialogOpenAlias(true); }} className="bg-[#C17A8E] hover:bg-[#B06979]">
              <Plus className="w-4 h-4 mr-2" />ポイント付与
            </Button>
            <Button variant="outline" onClick={() => setStaffTipHistoryDialogOpen(false)}>閉じる</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payout Dialog */}
      <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>ポイント払い出し</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label>スタッフ *</Label>
              <Select value={payoutForm.user_email} onValueChange={(v) => setPayoutForm({...payoutForm, user_email: v})}>
                <SelectTrigger><SelectValue placeholder="スタッフを選択" /></SelectTrigger>
                <SelectContent>{allStaff.map(s => <SelectItem key={s.email} value={s.email}>{s.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>払い出し金額（円）*</Label>
              <Input type="number" value={payoutForm.amount} onChange={(e) => setPayoutForm({...payoutForm, amount: e.target.value})} placeholder="5000" />
            </div>
            <div><Label>払い出し方法 *</Label>
              <Select value={payoutForm.payout_method} onValueChange={(v) => setPayoutForm({...payoutForm, payout_method: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="cash">現金</SelectItem><SelectItem value="bank_transfer">銀行振込</SelectItem><SelectItem value="other">その他</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>理由 *</Label><Textarea value={payoutForm.reason} onChange={(e) => setPayoutForm({...payoutForm, reason: e.target.value})} placeholder="例：給与振込、現金交換" className="h-24" /></div>
            <div><Label>払い出し日 *</Label><Input type="date" value={payoutForm.date} onChange={(e) => setPayoutForm({...payoutForm, date: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayoutDialogOpen(false)}>キャンセル</Button>
            <Button onClick={() => createPayoutMutation.mutate({...payoutForm, amount: Number(payoutForm.amount)})}
              className="bg-red-600 hover:bg-red-700" disabled={!payoutForm.user_email || !payoutForm.amount || !payoutForm.reason || createPayoutMutation.isPending}>
              払い出し
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attendance Dialog */}
      <Dialog open={attendanceDialogOpen} onOpenChange={setAttendanceDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingAttendance ? '勤怠編集' : '勤怠追加'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label>スタッフ *</Label>
              <Select value={attendanceForm.user_email} onValueChange={(v) => { const s = allStaff.find(s => s.email === v); setAttendanceForm({...attendanceForm, user_email: v, user_name: s?.full_name || ''}); }}>
                <SelectTrigger><SelectValue placeholder="スタッフを選択" /></SelectTrigger>
                <SelectContent>
                  {allStaff.filter(s => s.status !== 'inactive').map(s => (
                    <SelectItem key={s.email} value={s.email}>
                      {s.status === 'leave' ? '🟡 ' : ''}{s.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>日付 *</Label><Input type="date" value={attendanceForm.date} onChange={(e) => setAttendanceForm({...attendanceForm, date: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>出勤時間</Label><Input type="time" value={attendanceForm.clock_in} onChange={(e) => setAttendanceForm({...attendanceForm, clock_in: e.target.value})} /></div>
              <div><Label>退勤時間</Label><Input type="time" value={attendanceForm.clock_out} onChange={(e) => setAttendanceForm({...attendanceForm, clock_out: e.target.value})} /></div>
            </div>
            <div><Label>状態 *</Label>
              <Select value={attendanceForm.status} onValueChange={(v) => setAttendanceForm({...attendanceForm, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="working">勤務中</SelectItem><SelectItem value="completed">完了</SelectItem><SelectItem value="approved">承認済</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            {editingAttendance && (
              <Button variant="outline" className="text-red-600 hover:bg-red-50 mr-auto"
                onClick={() => { if (confirm('この勤怠記録を削除してもよろしいですか？')) deleteAttendanceMutation.mutate(editingAttendance.id); }}>
                <Trash2 className="w-4 h-4 mr-2" />削除
              </Button>
            )}
            <Button variant="outline" onClick={() => setAttendanceDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleSubmitAttendance} className="bg-[#2D4A6F]"
              disabled={!attendanceForm.user_email || !attendanceForm.date || createAttendanceMutation.isPending || updateAttendanceMutation.isPending}>
              {editingAttendance ? '更新' : '追加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}