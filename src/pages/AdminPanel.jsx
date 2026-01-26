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
import { 
        Plus, Calendar, Users, FileText, Bell,
        CheckCircle, XCircle, Trash2, Edit, Clock, UserPlus, Mail, QrCode, Download,
        Eye, EyeOff, Sparkles, Settings
      } from "lucide-react";
import QRCodeManager from '../components/admin/QRCodeManager';
import AttendanceCalendar from '../components/admin/AttendanceCalendar';
import { format } from "date-fns";

const serviceTypes = [
  { value: 'day_service', label: '通所介護' },
  { value: 'home_care', label: '訪問介護' },
  { value: 'taxi', label: '介護タクシー' },
  { value: 'funeral', label: '葬祭' },
  { value: 'estate_clearing', label: '遺品整理' },
  { value: 'other', label: 'その他' },
];

const categoryTypes = [
  { value: 'general', label: '一般' },
  { value: 'shift', label: 'シフト' },
  { value: 'welfare', label: '福利厚生' },
  { value: 'event', label: 'イベント' },
  { value: 'urgent', label: '緊急' },
  { value: 'thanks', label: 'サンクス' },
];

const tipTypes = [
  { value: 'special_thanks', label: '現場貢献スペシャルサンクス' },
  { value: 'gratitude_gift', label: '感謝還元サンクスギフト' },
  { value: 'support_thanks', label: '人財穴埋めサンクス' },
  { value: 'snow_removal_thanks', label: '除雪サンクス（冬季限定）' },
  { value: 'qr_attendance_thanks', label: 'QRコード出退勤サンクス' },
];

export default function AdminPanel() {
  const [user, setUser] = useState(null);
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [announcementDialogOpen, setAnnouncementDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const queryClient = useQueryClient();

  const [shiftForm, setShiftForm] = useState({
    title: '',
    date: '',
    start_time: '',
    end_time: '',
    location: '',
    service_type: 'day_service',
    hourly_rate: '',
    description: '',
    required_skills: '',
    max_applicants: 1,
  });

  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    category: 'general',
    is_pinned: false,
  });

  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [staffForm, setStaffForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    date_of_birth: '',
    gender: 'other',
    role: 'temporary',
  });

  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState(null);
  const [attendanceForm, setAttendanceForm] = useState({
    user_email: '',
    user_name: '',
    date: '',
    clock_in: '',
    clock_out: '',
    status: 'working',
  });

  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportForm, setReportForm] = useState({
    reportType: 'monthly',
    startDate: '',
    endDate: '',
  });
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const [tipDialogOpen, setTipDialogOpen] = useState(false);
  const [tipForm, setTipForm] = useState({
    user_email: '',
    tip_type: 'special_thanks',
    amount: '',
    reason: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [settingsForm, setSettingsForm] = useState({
    hero_title: '',
    hero_subtitle: '',
    cta_text: '',
    footer_text: '',
  });

  useEffect(() => {
    base44.auth.me().then(async u => {
      // Check if user is in Staff entity with admin role
      const staffList = await base44.entities.Staff.filter({ email: u.email });
      if (staffList.length === 0 || staffList[0].role !== 'admin') {
        alert('管理者権限がありません。この画面へのアクセスは管理者カテゴリのスタッフのみに制限されています。');
        window.location.href = '/';
        return;
      }
      
      setUser(u);
    }).catch(() => {
      base44.auth.redirectToLogin();
    });
  }, []);

  const { data: shifts = [] } = useQuery({
    queryKey: ['admin-shifts'],
    queryFn: () => base44.entities.Shift.list('-date'),
  });

  const { data: applications = [] } = useQuery({
    queryKey: ['admin-applications'],
    queryFn: () => base44.entities.ShiftApplication.list('-created_date'),
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: () => base44.entities.Announcement.list('-created_date'),
  });

  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ['admin-attendance'],
    queryFn: () => base44.entities.Attendance.list('-date'),
  });

  const { data: allStaff = [] } = useQuery({
    queryKey: ['admin-staff'],
    queryFn: () => base44.entities.Staff.list('-created_date'),
    refetchInterval: 1000,
  });

  const { data: allTips = [] } = useQuery({
    queryKey: ['admin-tips'],
    queryFn: () => base44.entities.TipRecord.list('-date'),
  });

  const { data: siteSettings = {} } = useQuery({
    queryKey: ['admin-site-settings'],
    queryFn: async () => {
      const settings = await base44.entities.SiteSettings.list();
      return settings.length > 0 ? settings[0] : {};
    },
  });

  useEffect(() => {
    if (siteSettings && siteSettings.id) {
      setSettingsForm({
        hero_title: siteSettings.hero_title || '',
        hero_subtitle: siteSettings.hero_subtitle || '',
        cta_text: siteSettings.cta_text || '',
        footer_text: siteSettings.footer_text || '',
      });
    }
  }, [siteSettings?.id]);

  const createStaffMutation = useMutation({
    mutationFn: (data) => base44.entities.Staff.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-staff']);
      setStaffDialogOpen(false);
      resetStaffForm();
    },
  });

  const updateStaffMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Staff.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-staff']);
      setStaffDialogOpen(false);
      resetStaffForm();
    },
  });

  const deleteStaffMutation = useMutation({
    mutationFn: (id) => base44.entities.Staff.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['admin-staff']),
  });

  const inviteStaffMutation = useMutation({
    mutationFn: ({ email }) => base44.users.inviteUser(email, 'user'),
    onSuccess: () => {
      alert('招待メールを送信しました。登録後、必要に応じて権限を変更してください。');
    },
    onError: (error) => {
      console.error('招待エラー:', error);
      alert(`招待メール送信に失敗しました: ${error.message}`);
    },
  });

  const createShiftMutation = useMutation({
    mutationFn: (data) => base44.entities.Shift.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-shifts']);
      setShiftDialogOpen(false);
      resetShiftForm();
    },
  });

  const updateShiftMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Shift.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-shifts']);
      setShiftDialogOpen(false);
      resetShiftForm();
    },
  });

  const deleteShiftMutation = useMutation({
    mutationFn: (id) => base44.entities.Shift.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['admin-shifts']),
  });

  const toggleShiftVisibilityMutation = useMutation({
    mutationFn: ({ id, isVisible }) => base44.entities.Shift.update(id, { is_visible: isVisible }),
    onSuccess: () => queryClient.invalidateQueries(['admin-shifts']),
  });

  const createAnnouncementMutation = useMutation({
    mutationFn: (data) => base44.entities.Announcement.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-announcements']);
      setAnnouncementDialogOpen(false);
      resetAnnouncementForm();
    },
  });

  const updateApplicationMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.ShiftApplication.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries(['admin-applications']),
  });

  const deleteAnnouncementMutation = useMutation({
    mutationFn: (id) => base44.entities.Announcement.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['admin-announcements']),
  });

  const updateAttendanceMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Attendance.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-attendance']);
      setAttendanceDialogOpen(false);
      resetAttendanceForm();
    },
  });

  const createTipMutation = useMutation({
    mutationFn: (data) => {
      const staff = allStaff.find(s => s.email === data.user_email);
      return base44.entities.TipRecord.create({
        ...data,
        user_name: staff?.full_name || data.user_email,
        given_by: user.full_name,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-tips']);
      setTipDialogOpen(false);
      resetTipForm();
    },
  });

  const deleteTipMutation = useMutation({
    mutationFn: (id) => base44.entities.TipRecord.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['admin-tips']),
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (data) => {
      if (siteSettings && siteSettings.id) {
        return base44.entities.SiteSettings.update(siteSettings.id, data);
      } else {
        return base44.entities.SiteSettings.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-site-settings']);
      alert('サイト設定を保存しました');
    },
  });

  const resetShiftForm = () => {
    setShiftForm({
      title: '', date: '', start_time: '', end_time: '', location: '',
      service_type: 'day_service', hourly_rate: '', description: '',
      required_skills: '', max_applicants: 1,
    });
    setEditingShift(null);
  };

  const resetAnnouncementForm = () => {
    setAnnouncementForm({ title: '', content: '', category: 'general', is_pinned: false });
    setEditingAnnouncement(null);
  };

  const resetStaffForm = () => {
    setStaffForm({
      full_name: '',
      email: '',
      phone: '',
      address: '',
      date_of_birth: '',
      gender: 'other',
      role: 'temporary',
    });
    setEditingStaff(null);
  };

  const resetAttendanceForm = () => {
    setAttendanceForm({
      user_email: '',
      user_name: '',
      date: '',
      clock_in: '',
      clock_out: '',
      status: 'working',
    });
    setEditingAttendance(null);
  };

  const resetTipForm = () => {
    setTipForm({
      user_email: '',
      tip_type: 'special_thanks',
      amount: '',
      reason: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  const handleEditAttendance = (attendance) => {
    setEditingAttendance(attendance);
    setAttendanceForm({
      user_email: attendance.user_email,
      user_name: attendance.user_name || '',
      date: attendance.date,
      clock_in: attendance.clock_in || '',
      clock_out: attendance.clock_out || '',
      status: attendance.status,
    });
    setAttendanceDialogOpen(true);
  };

  const handleSubmitAttendance = () => {
    updateAttendanceMutation.mutate({ id: editingAttendance.id, data: attendanceForm });
  };

  const getStaffName = (userEmail) => {
    const staff = allStaff.find(s => s.email === userEmail);
    return staff?.full_name || userEmail;
  };

  const calculateTotalHours = (email) => {
    const staffRecords = attendanceRecords.filter(r => r.user_email === email && r.clock_in && r.clock_out);
    let totalMinutes = 0;
    
    staffRecords.forEach(record => {
      const [inHour, inMin] = record.clock_in.split(':').map(Number);
      const [outHour, outMin] = record.clock_out.split(':').map(Number);
      const inTotalMin = inHour * 60 + inMin;
      const outTotalMin = outHour * 60 + outMin;
      totalMinutes += Math.max(0, outTotalMin - inTotalMin);
    });
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h${minutes}m`;
  };

  const getUniqueStaffEmails = () => {
    return [...new Set(attendanceRecords.map(r => r.user_email))];
  };

  const handleGenerateReport = async () => {
    if (!reportForm.startDate || !reportForm.endDate) {
      alert('開始日と終了日を指定してください');
      return;
    }
    
    setIsGeneratingReport(true);
    try {
      const response = await base44.functions.invoke('generateAttendanceReport', {
        reportType: reportForm.reportType,
        startDate: reportForm.startDate,
        endDate: reportForm.endDate,
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-report-${reportForm.startDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      setReportDialogOpen(false);
      setReportForm({ reportType: 'monthly', startDate: '', endDate: '' });
    } catch (error) {
      console.error('レポート生成エラー:', error);
      alert('レポート生成に失敗しました');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleEditStaff = (staff) => {
    setEditingStaff(staff);
    setStaffForm({
      full_name: staff.full_name || '',
      email: staff.email,
      phone: staff.phone || '',
      address: staff.address || '',
      date_of_birth: staff.date_of_birth || '',
      gender: staff.gender || 'other',
      role: staff.role,
    });
    setStaffDialogOpen(true);
  };

  const handleSubmitStaff = () => {
    if (editingStaff) {
      updateStaffMutation.mutate({ id: editingStaff.id, data: staffForm });
    } else {
      createStaffMutation.mutate(staffForm);
    }
  };

  const handleEditShift = (shift) => {
    setEditingShift(shift);
    setShiftForm({
      title: shift.title,
      date: shift.date,
      start_time: shift.start_time,
      end_time: shift.end_time,
      location: shift.location,
      service_type: shift.service_type,
      hourly_rate: shift.hourly_rate || '',
      description: shift.description || '',
      required_skills: shift.required_skills?.join(', ') || '',
      max_applicants: shift.max_applicants || 1,
    });
    setShiftDialogOpen(true);
  };

  const handleSubmitShift = () => {
    const data = {
      ...shiftForm,
      hourly_rate: shiftForm.hourly_rate ? Number(shiftForm.hourly_rate) : null,
      max_applicants: Number(shiftForm.max_applicants),
      required_skills: shiftForm.required_skills ? shiftForm.required_skills.split(',').map(s => s.trim()).filter(Boolean) : [],
      status: 'open',
    };

    if (editingShift) {
      updateShiftMutation.mutate({ id: editingShift.id, data });
    } else {
      createShiftMutation.mutate(data);
    }
  };

  const handleSubmitAnnouncement = () => {
    if (editingAnnouncement) {
      base44.entities.Announcement.update(editingAnnouncement.id, announcementForm).then(() => {
        queryClient.invalidateQueries(['admin-announcements']);
        setAnnouncementDialogOpen(false);
        resetAnnouncementForm();
      });
    } else {
      createAnnouncementMutation.mutate(announcementForm);
    }
  };

  const getShiftTitle = (shiftId) => {
    const shift = shifts.find(s => s.id === shiftId);
    return shift?.title || 'シフト不明';
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
      {/* Header */}
      <div className="bg-gradient-to-br from-[#2D4A6F] to-[#1E3A5F] text-white">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-light mb-2">管理画面</h1>
          <p className="text-white/70">シフト・お知らせ・応募の管理</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6">
        <Tabs defaultValue="settings" className="w-full">
            <TabsList className="bg-white shadow-lg p-1 mb-6 w-full flex-wrap justify-start gap-1">
              <TabsTrigger value="settings" className="data-[state=active]:bg-[#2D4A6F] data-[state=active]:text-white text-xs sm:text-sm">
                <Settings className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">サイト設定</span>
                <span className="sm:hidden">設定</span>
              </TabsTrigger>
              <TabsTrigger value="qrcode" className="data-[state=active]:bg-[#2D4A6F] data-[state=active]:text-white text-xs sm:text-sm">
                <QrCode className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">QRコード</span>
                <span className="sm:hidden">QR</span>
              </TabsTrigger>
              <TabsTrigger value="shifts" className="data-[state=active]:bg-[#2D4A6F] data-[state=active]:text-white text-xs sm:text-sm">
              <Calendar className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">シフト管理</span>
              <span className="sm:hidden">シフト</span>
            </TabsTrigger>
            <TabsTrigger value="applications" className="data-[state=active]:bg-[#2D4A6F] data-[state=active]:text-white text-xs sm:text-sm">
              <FileText className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">応募管理</span>
              <span className="sm:hidden">応募</span>
            </TabsTrigger>
            <TabsTrigger value="attendance" className="data-[state=active]:bg-[#2D4A6F] data-[state=active]:text-white text-xs sm:text-sm">
              <Clock className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">勤怠管理</span>
              <span className="sm:hidden">勤怠</span>
            </TabsTrigger>
            <TabsTrigger value="announcements" className="data-[state=active]:bg-[#2D4A6F] data-[state=active]:text-white text-xs sm:text-sm">
              <Bell className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">お知らせ</span>
              <span className="sm:hidden">知</span>
            </TabsTrigger>
            <TabsTrigger value="staff" className="data-[state=active]:bg-[#2D4A6F] data-[state=active]:text-white text-xs sm:text-sm">
              <Users className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">スタッフ管理</span>
              <span className="sm:hidden">スタッフ</span>
            </TabsTrigger>
            <TabsTrigger value="tips" className="data-[state=active]:bg-[#2D4A6F] data-[state=active]:text-white text-xs sm:text-sm">
              <Sparkles className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">サンクス管理</span>
              <span className="sm:hidden">サンクス</span>
            </TabsTrigger>
          </TabsList>

          {/* Site Settings Tab */}
          <TabsContent value="settings">
            <Card className="border-0 shadow-lg">
              <div className="p-6 border-b">
                <h2 className="text-lg font-medium">TOPページカスタマイズ</h2>
              </div>
              <div className="p-6 space-y-6 max-w-2xl">
                <div>
                  <Label>ヒーロータイトル</Label>
                  <Textarea 
                    value={settingsForm.hero_title}
                    onChange={(e) => setSettingsForm({...settingsForm, hero_title: e.target.value})}
                    placeholder="地域で支える、人生に寄り添う。"
                    className="h-20"
                  />
                </div>
                <div>
                  <Label>ヒーロー説明文</Label>
                  <Input
                    value={settingsForm.hero_subtitle}
                    onChange={(e) => setSettingsForm({...settingsForm, hero_subtitle: e.target.value})}
                    placeholder="タイミー的単発・短時間から参加できるお仕事"
                  />
                </div>
                <div>
                  <Label>ヒーロー詳細説明</Label>
                  <Textarea 
                    value={settingsForm.hero_description || ''}
                    onChange={(e) => setSettingsForm({...settingsForm, hero_description: e.target.value})}
                    placeholder="おんくりの輪は、介護から葬祭まで人生のすべての節目に寄り添う地域密着型のワーク＆サポートプラットフォームです。"
                    className="h-20"
                  />
                </div>
                <div>
                  <Label>CTA（行動喚起）テキスト</Label>
                  <Input
                    value={settingsForm.cta_text}
                    onChange={(e) => setSettingsForm({...settingsForm, cta_text: e.target.value})}
                    placeholder="おんくりの輪で一緒に働きませんか？"
                  />
                </div>
                <div>
                  <Label>フッターテキスト</Label>
                  <Input
                    value={settingsForm.footer_text}
                    onChange={(e) => setSettingsForm({...settingsForm, footer_text: e.target.value})}
                    placeholder="石狩市を拠点とした地域密着型介護・生活支援事業体"
                  />
                </div>
                <Button 
                  onClick={() => updateSettingsMutation.mutate(settingsForm)}
                  className="bg-[#2D4A6F]"
                  disabled={updateSettingsMutation.isPending}
                >
                  {updateSettingsMutation.isPending ? '保存中...' : '設定を保存'}
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* QR Code Tab */}
          <TabsContent value="qrcode">
            <QRCodeManager />
          </TabsContent>

          {/* Shifts Tab */}
          <TabsContent value="shifts">
           <Card className="border-0 shadow-lg">
             <div className="p-4 sm:p-6 border-b flex flex-col sm:flex-row gap-3 sm:gap-0 sm:justify-between sm:items-center">
               <h2 className="text-lg font-medium">シフト一覧</h2>
               <Button onClick={() => { resetShiftForm(); setShiftDialogOpen(true); }} className="bg-[#2D4A6F] w-full sm:w-auto">
                 <Plus className="w-4 h-4 mr-2" />
                 新規シフト
               </Button>
             </div>
             <div className="overflow-x-auto">
             <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>タイトル</TableHead>
                    <TableHead>日時</TableHead>
                    <TableHead>場所</TableHead>
                    <TableHead>種別</TableHead>
                    <TableHead>状態</TableHead>
                    <TableHead>表示</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shifts.map((shift) => (
                    <TableRow key={shift.id}>
                      <TableCell className="font-medium">{shift.title}</TableCell>
                      <TableCell>
                        {format(new Date(shift.date), 'M/d')} {shift.start_time}〜{shift.end_time}
                      </TableCell>
                      <TableCell>{shift.location}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {serviceTypes.find(t => t.value === shift.service_type)?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={shift.status === 'open' ? 'bg-[#7CB342]/10 text-[#7CB342]' : 'bg-slate-100 text-slate-500'}>
                          {shift.status === 'open' ? '募集中' : shift.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => toggleShiftVisibilityMutation.mutate({ id: shift.id, isVisible: !shift.is_visible })}
                          className={shift.is_visible ? 'text-[#2D4A6F]' : 'text-slate-400'}
                        >
                          {shift.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditShift(shift)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteShiftMutation.mutate(shift.id)}>
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

          {/* Applications Tab */}
          <TabsContent value="applications">
           <Card className="border-0 shadow-lg">
             <div className="p-4 sm:p-6 border-b">
               <h2 className="text-lg font-medium">応募一覧</h2>
             </div>
             <div className="overflow-x-auto">
             <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>応募者</TableHead>
                    <TableHead>シフト</TableHead>
                    <TableHead>応募日</TableHead>
                    <TableHead>メッセージ</TableHead>
                    <TableHead>状態</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell className="font-medium">{app.applicant_name || app.applicant_email}</TableCell>
                      <TableCell>{getShiftTitle(app.shift_id)}</TableCell>
                      <TableCell>{format(new Date(app.created_date), 'M/d HH:mm')}</TableCell>
                      <TableCell className="max-w-xs truncate">{app.message || '-'}</TableCell>
                      <TableCell>
                        <Badge className={
                          app.status === 'approved' ? 'bg-[#7CB342]/10 text-[#7CB342]' :
                          app.status === 'rejected' ? 'bg-red-100 text-red-600' :
                          'bg-amber-100 text-amber-700'
                        }>
                          {app.status === 'approved' ? '承認' : app.status === 'rejected' ? '不承認' : '審査中'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {app.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-[#7CB342] hover:bg-[#6BA232]"
                              onClick={() => updateApplicationMutation.mutate({ id: app.id, status: 'approved' })}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-500 border-red-200 hover:bg-red-50"
                              onClick={() => updateApplicationMutation.mutate({ id: app.id, status: 'rejected' })}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  </TableBody>
                  </Table>
                  </div>
                  </Card>
                  </TabsContent>

                  {/* Attendance Tab */}
                  <TabsContent value="attendance">
            <div className="space-y-6">
              <Card className="border-0 shadow-lg p-6 bg-white">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium">レポート生成</h2>
                  <Button onClick={() => setReportDialogOpen(true)} className="bg-[#2D4A6F]">
                    <Download className="w-4 h-4 mr-2" />
                    レポート生成
                  </Button>
                </div>
              </Card>

              <Card className="border-0 shadow-lg p-6">
                <AttendanceCalendar 
                  attendanceRecords={attendanceRecords} 
                  staff={allStaff}
                />
              </Card>

              <Card className="border-0 shadow-lg">
                <div className="p-6 border-b">
                  <h2 className="text-lg font-medium">勤怠一覧（テーブル表示）</h2>
                </div>
                {getUniqueStaffEmails().length > 0 && (
                  <div className="p-6 border-b bg-slate-50">
                    <h3 className="text-sm font-medium mb-4 text-slate-700">人別合計時間</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {getUniqueStaffEmails().map(email => (
                        <div key={email} className="bg-white p-3 rounded-lg border border-slate-200">
                          <p className="text-sm font-medium text-slate-900">{getStaffName(email)}</p>
                          <p className="text-lg font-semibold text-[#2D4A6F]">{calculateTotalHours(email)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>スタッフ</TableHead>
                    <TableHead>カテゴリー</TableHead>
                    <TableHead>日付</TableHead>
                    <TableHead>出勤</TableHead>
                    <TableHead>退勤</TableHead>
                    <TableHead>状態</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceRecords.slice(0, 50).map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{getStaffName(record.user_email)}</TableCell>
                      <TableCell>
                        <Badge className={
                          allStaff.find(s => s.email === record.user_email)?.role === 'admin' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
                          allStaff.find(s => s.email === record.user_email)?.role === 'full_time' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                          allStaff.find(s => s.email === record.user_email)?.role === 'part_time' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                          'bg-cyan-100 text-cyan-700 border-cyan-200'
                        } variant="outline">
                          {allStaff.find(s => s.email === record.user_email)?.role === 'admin' ? '管理者' : 
                           allStaff.find(s => s.email === record.user_email)?.role === 'full_time' ? '正社員' : 
                           allStaff.find(s => s.email === record.user_email)?.role === 'part_time' ? 'パート' : 
                           '単発'}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(record.date), 'M/d')}</TableCell>
                      <TableCell>{record.clock_in}</TableCell>
                      <TableCell>{record.clock_out || '-'}</TableCell>
                      <TableCell>
                        <Badge className={
                          record.status === 'working' ? 'bg-[#7CB342]/10 text-[#7CB342]' :
                          record.status === 'approved' ? 'bg-[#2D4A6F]/10 text-[#2D4A6F]' :
                          'bg-slate-100 text-slate-500'
                        }>
                          {record.status === 'working' ? '勤務中' : record.status === 'approved' ? '承認済' : '完了'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleEditAttendance(record)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </Card>
            </div>
          </TabsContent>

          {/* Staff Tab */}
          <TabsContent value="staff">
           <Card className="border-0 shadow-lg">
             <div className="p-4 sm:p-6 border-b flex flex-col sm:flex-row gap-3 sm:gap-0 sm:justify-between sm:items-center">
               <h2 className="text-lg font-medium">スタッフ一覧</h2>
               <Button onClick={() => { resetStaffForm(); setStaffDialogOpen(true); }} className="bg-[#2D4A6F] w-full sm:w-auto">
                 <UserPlus className="w-4 h-4 mr-2" />
                 新規スタッフ登録
               </Button>
             </div>
             <div className="overflow-x-auto">
             <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名前</TableHead>
                    <TableHead>メールアドレス</TableHead>
                    <TableHead>電話番号</TableHead>
                    <TableHead>カテゴリー</TableHead>
                    <TableHead>登録日</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allStaff.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.full_name}</TableCell>
                      <TableCell>{s.email}</TableCell>
                      <TableCell>{s.phone || '-'}</TableCell>
                      <TableCell>
                        <Badge className={
                          s.role === 'admin' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
                          s.role === 'full_time' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                          s.role === 'part_time' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                          'bg-cyan-100 text-cyan-700 border-cyan-200'
                        } variant="outline">
                          {s.role === 'admin' ? '管理者' : 
                           s.role === 'full_time' ? '正社員' : 
                           s.role === 'part_time' ? 'パート' : 
                           '単発'}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(s.created_date), 'yyyy/M/d')}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditStaff(s)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => inviteStaffMutation.mutate({ email: s.email })}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            <Mail className="w-4 h-4 mr-1" />
                            招待送信
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteStaffMutation.mutate(s.id)}>
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

                  {/* Announcements Tab */}
                  <TabsContent value="announcements">
                    <Card className="border-0 shadow-lg">
                      <div className="p-4 sm:p-6 border-b flex flex-col sm:flex-row gap-3 sm:gap-0 sm:justify-between sm:items-center">
                        <h2 className="text-lg font-medium">お知らせ一覧</h2>
                        <Button onClick={() => { resetAnnouncementForm(); setAnnouncementDialogOpen(true); }} className="bg-[#2D4A6F] w-full sm:w-auto">
                          <Plus className="w-4 h-4 mr-2" />
                          新規お知らせ
                        </Button>
                      </div>
                      <div className="overflow-x-auto">
                      <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>タイトル</TableHead>
                    <TableHead>カテゴリ</TableHead>
                    <TableHead>投稿日</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {announcements.map((announcement) => (
                    <TableRow key={announcement.id}>
                      <TableCell className="font-medium">{announcement.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {categoryTypes.find(c => c.value === announcement.category)?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(announcement.created_date), 'M/d HH:mm')}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteAnnouncementMutation.mutate(announcement.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  </TableBody>
                  </Table>
                  </div>
                  </Card>
                  </TabsContent>

                  {/* Tips Tab */}
                  <TabsContent value="tips">
                  <Card className="border-0 shadow-lg">
                  <div className="p-4 sm:p-6 border-b flex flex-col sm:flex-row gap-3 sm:gap-0 sm:justify-between sm:items-center">
                  <h2 className="text-lg font-medium">サンクス管理</h2>
                  <Button onClick={() => { resetTipForm(); setTipDialogOpen(true); }} className="bg-[#2D4A6F] w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  サンクス付与
                  </Button>
                  </div>
                  <div className="overflow-x-auto">
                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>スタッフ</TableHead>
                      <TableHead>種類</TableHead>
                      <TableHead>ポイント</TableHead>
                      <TableHead>金額</TableHead>
                      <TableHead>理由</TableHead>
                      <TableHead>付与日</TableHead>
                      <TableHead>付与者</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allTips.map((tip) => (
                      <TableRow key={tip.id}>
                        <TableCell className="font-medium">{tip.user_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {tipTypes.find(t => t.value === tip.tip_type)?.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-[#C17A8E]">{tip.amount.toLocaleString()}pt</TableCell>
                        <TableCell className="font-semibold text-[#2D4A6F]">¥{tip.amount.toLocaleString()}</TableCell>
                        <TableCell className="max-w-xs truncate">{tip.reason || '-'}</TableCell>
                        <TableCell>{format(new Date(tip.date), 'M/d')}</TableCell>
                        <TableCell>{tip.given_by || '-'}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => deleteTipMutation.mutate(tip.id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
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

      {/* Shift Dialog */}
      <Dialog open={shiftDialogOpen} onOpenChange={setShiftDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingShift ? 'シフト編集' : '新規シフト作成'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label>タイトル *</Label>
              <Input value={shiftForm.title} onChange={(e) => setShiftForm({...shiftForm, title: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>日付 *</Label>
                <Input type="date" value={shiftForm.date} onChange={(e) => setShiftForm({...shiftForm, date: e.target.value})} />
              </div>
              <div>
                <Label>サービス種別 *</Label>
                <Select value={shiftForm.service_type} onValueChange={(v) => setShiftForm({...shiftForm, service_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {serviceTypes.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>開始時間 *</Label>
                <Input type="time" value={shiftForm.start_time} onChange={(e) => setShiftForm({...shiftForm, start_time: e.target.value})} />
              </div>
              <div>
                <Label>終了時間 *</Label>
                <Input type="time" value={shiftForm.end_time} onChange={(e) => setShiftForm({...shiftForm, end_time: e.target.value})} />
              </div>
            </div>
            <div>
              <Label>勤務場所 *</Label>
              <Input value={shiftForm.location} onChange={(e) => setShiftForm({...shiftForm, location: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>時給（円）</Label>
                <Input type="number" value={shiftForm.hourly_rate} onChange={(e) => setShiftForm({...shiftForm, hourly_rate: e.target.value})} />
              </div>
              <div>
                <Label>募集人数</Label>
                <Input type="number" value={shiftForm.max_applicants} onChange={(e) => setShiftForm({...shiftForm, max_applicants: e.target.value})} />
              </div>
            </div>
            <div>
              <Label>必要スキル（カンマ区切り）</Label>
              <Input value={shiftForm.required_skills} onChange={(e) => setShiftForm({...shiftForm, required_skills: e.target.value})} placeholder="介護福祉士, 普通免許" />
            </div>
            <div>
              <Label>詳細説明</Label>
              <Textarea value={shiftForm.description} onChange={(e) => setShiftForm({...shiftForm, description: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShiftDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleSubmitShift} className="bg-[#2D4A6F]">
              {editingShift ? '更新' : '作成'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Staff Dialog */}
      <Dialog open={staffDialogOpen} onOpenChange={setStaffDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingStaff ? 'スタッフ編集' : '新規スタッフ登録'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label>名前 *</Label>
              <Input 
                value={staffForm.full_name} 
                onChange={(e) => setStaffForm({...staffForm, full_name: e.target.value})} 
                placeholder="山田 太郎"
              />
            </div>
            <div>
              <Label>メールアドレス *</Label>
              <Input 
                type="email" 
                value={staffForm.email} 
                onChange={(e) => setStaffForm({...staffForm, email: e.target.value})} 
                placeholder="yamada@example.com"
              />
            </div>
            <div>
              <Label>電話番号</Label>
              <Input 
                type="tel"
                value={staffForm.phone} 
                onChange={(e) => setStaffForm({...staffForm, phone: e.target.value})} 
                placeholder="090-1234-5678"
              />
            </div>
            <div>
              <Label>住所</Label>
              <Input 
                value={staffForm.address} 
                onChange={(e) => setStaffForm({...staffForm, address: e.target.value})} 
                placeholder="札幌市中央区..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>生年月日</Label>
                <Input 
                  type="date"
                  value={staffForm.date_of_birth} 
                  onChange={(e) => setStaffForm({...staffForm, date_of_birth: e.target.value})} 
                />
              </div>
              <div>
                <Label>性別</Label>
                <Select value={staffForm.gender} onValueChange={(v) => setStaffForm({...staffForm, gender: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">男性</SelectItem>
                    <SelectItem value="female">女性</SelectItem>
                    <SelectItem value="other">その他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>カテゴリー *</Label>
              <Select value={staffForm.role} onValueChange={(v) => setStaffForm({...staffForm, role: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">管理者</SelectItem>
                  <SelectItem value="full_time">正社員</SelectItem>
                  <SelectItem value="part_time">パート</SelectItem>
                  <SelectItem value="temporary">単発</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-3">
            {editingStaff && (
              <Button 
                variant="outline"
                onClick={() => inviteStaffMutation.mutate({ email: staffForm.email })}
                className="w-full sm:w-auto gap-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                disabled={inviteStaffMutation.isPending}
              >
                <Mail className="w-4 h-4" />
                {inviteStaffMutation.isPending ? '送信中...' : '招待メールを送信'}
              </Button>
            )}
            <div className="flex gap-2 ml-auto w-full sm:w-auto">
              <Button variant="outline" onClick={() => setStaffDialogOpen(false)} className="flex-1 sm:flex-none">キャンセル</Button>
              <Button 
                onClick={handleSubmitStaff} 
                className="bg-[#2D4A6F] flex-1 sm:flex-none"
                disabled={!staffForm.full_name || !staffForm.email}
              >
                {editingStaff ? '更新' : '登録'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Announcement Dialog */}
      <Dialog open={announcementDialogOpen} onOpenChange={setAnnouncementDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新規お知らせ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>タイトル *</Label>
              <Input value={announcementForm.title} onChange={(e) => setAnnouncementForm({...announcementForm, title: e.target.value})} />
            </div>
            <div>
              <Label>カテゴリ</Label>
              <Select value={announcementForm.category} onValueChange={(v) => setAnnouncementForm({...announcementForm, category: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categoryTypes.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>内容 *</Label>
              <Textarea value={announcementForm.content} onChange={(e) => setAnnouncementForm({...announcementForm, content: e.target.value})} className="h-32" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnnouncementDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleSubmitAnnouncement} className="bg-[#2D4A6F]">投稿</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>勤怠レポート生成</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>レポートタイプ *</Label>
              <Select value={reportForm.reportType} onValueChange={(v) => setReportForm({...reportForm, reportType: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">月次</SelectItem>
                  <SelectItem value="weekly">週次</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>開始日 *</Label>
              <Input 
                type="date" 
                value={reportForm.startDate} 
                onChange={(e) => setReportForm({...reportForm, startDate: e.target.value})} 
              />
            </div>
            <div>
              <Label>終了日 *</Label>
              <Input 
                type="date" 
                value={reportForm.endDate} 
                onChange={(e) => setReportForm({...reportForm, endDate: e.target.value})} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialogOpen(false)}>キャンセル</Button>
            <Button 
              onClick={handleGenerateReport} 
              className="bg-[#2D4A6F]"
              disabled={isGeneratingReport}
            >
              {isGeneratingReport ? '生成中...' : 'PDFダウンロード'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tip Dialog */}
      <Dialog open={tipDialogOpen} onOpenChange={setTipDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>サンクス付与</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>スタッフ *</Label>
              <Select value={tipForm.user_email} onValueChange={(v) => setTipForm({...tipForm, user_email: v})}>
                <SelectTrigger><SelectValue placeholder="スタッフを選択" /></SelectTrigger>
                <SelectContent>
                  {allStaff.map(s => (
                    <SelectItem key={s.email} value={s.email}>{s.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>サンクス種類 *</Label>
              <Select value={tipForm.tip_type} onValueChange={(v) => setTipForm({...tipForm, tip_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tipTypes.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>ポイント / 金額（円）*</Label>
              <Input 
                type="number" 
                value={tipForm.amount} 
                onChange={(e) => setTipForm({...tipForm, amount: e.target.value})}
                placeholder="5000"
              />
              <p className="text-xs text-slate-500 mt-1">※1ポイント = 1円として換算されます</p>
            </div>
            <div>
              <Label>理由 *</Label>
              <Textarea 
                value={tipForm.reason} 
                onChange={(e) => setTipForm({...tipForm, reason: e.target.value})}
                placeholder="業務への貢献内容を記入してください"
                className="h-24"
              />
            </div>
            <div>
              <Label>付与日 *</Label>
              <Input 
                type="date" 
                value={tipForm.date} 
                onChange={(e) => setTipForm({...tipForm, date: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTipDialogOpen(false)}>キャンセル</Button>
            <Button 
              onClick={() => createTipMutation.mutate({
                ...tipForm,
                amount: Number(tipForm.amount),
              })} 
              className="bg-[#2D4A6F]"
              disabled={!tipForm.user_email || !tipForm.amount || !tipForm.reason || createTipMutation.isPending}
            >
              付与
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attendance Dialog */}
      <Dialog open={attendanceDialogOpen} onOpenChange={setAttendanceDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>勤怠編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>スタッフ *</Label>
              <Select value={attendanceForm.user_email} onValueChange={(v) => {
                const staff = allStaff.find(s => s.email === v);
                setAttendanceForm({...attendanceForm, user_email: v, user_name: staff?.full_name || ''});
              }}>
                <SelectTrigger><SelectValue placeholder="スタッフを選択" /></SelectTrigger>
                <SelectContent>
                  {allStaff.map(s => (
                    <SelectItem key={s.email} value={s.email}>{s.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>日付 *</Label>
              <Input type="date" value={attendanceForm.date} onChange={(e) => setAttendanceForm({...attendanceForm, date: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>出勤時刻</Label>
                <Input type="time" value={attendanceForm.clock_in} onChange={(e) => setAttendanceForm({...attendanceForm, clock_in: e.target.value})} />
              </div>
              <div>
                <Label>退勤時刻</Label>
                <Input type="time" value={attendanceForm.clock_out} onChange={(e) => setAttendanceForm({...attendanceForm, clock_out: e.target.value})} />
              </div>
            </div>
            <div>
              <Label>状態 *</Label>
              <Select value={attendanceForm.status} onValueChange={(v) => setAttendanceForm({...attendanceForm, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="working">勤務中</SelectItem>
                  <SelectItem value="completed">完了</SelectItem>
                  <SelectItem value="approved">承認済</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttendanceDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleSubmitAttendance} className="bg-[#2D4A6F]">更新</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}