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
         Eye, EyeOff, Sparkles, Settings, Gift, MessageCircle, Send, Truck, Shield
        } from "lucide-react";
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import QRCodeManager from '../components/admin/QRCodeManager';
import AttendanceCalendar from '../components/admin/AttendanceCalendar';
import HelpRequestManager from '../components/admin/HelpRequestManager';
import { format } from "date-fns";
import { getDisplayTimeText, getMessageTimestamp } from "@/components/utils/datetime";

const safeFormat = (dateValue, formatStr) => {
  if (!dateValue) return '-';
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return '-';
  return format(d, formatStr);
};

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
  { value: 'everyday_thanks', label: 'エブリデイサンクス' },
  { value: 'special_thanks', label: '現場貢献スペシャルサンクス' },
  { value: 'gratitude_gift', label: '感謝還元サンクスギフト' },
  { value: 'support_thanks', label: '人財穴埋めサンクス' },
  { value: 'snow_removal_thanks', label: '除雪サンクス（冬季限定）' },
  { value: 'qr_attendance_thanks', label: 'QRコード出退勤サンクス' },
  { value: 'sugoroku_thanks', label: 'スゴロクサンクス' },
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
    status: 'open',
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
    approval_status: 'pending',
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
  const [tipFilterStaff, setTipFilterStaff] = useState('all');
  const [tipFilterType, setTipFilterType] = useState('all');
  const [tipFilterMonth, setTipFilterMonth] = useState('');
  const [staffTipHistoryDialogOpen, setStaffTipHistoryDialogOpen] = useState(false);
  const [selectedStaffForTips, setSelectedStaffForTips] = useState(null);
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [payoutForm, setPayoutForm] = useState({
    user_email: '',
    amount: '',
    reason: '',
    payout_method: 'cash',
    date: new Date().toISOString().split('T')[0],
  });

  const [dicePrizeDialogOpen, setDicePrizeDialogOpen] = useState(false);
  const [editingDicePrize, setEditingDicePrize] = useState(null);
  const [dicePrizeForm, setDicePrizeForm] = useState({
    dice_number: 1,
    prize_name: '',
    points: '',
    emoji: '🎁',
    color: 'bg-gradient-to-br from-purple-400 to-pink-400',
    is_active: true,
  });

  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceForm, setServiceForm] = useState({
    title: '',
    description: '',
    icon: 'Heart',
    color: 'bg-[#2D4A6F]',
    order: 0,
  });

  const [benefitDialogOpen, setBenefitDialogOpen] = useState(false);
  const [editingBenefit, setEditingBenefit] = useState(null);
  const [benefitForm, setBenefitForm] = useState({
    title: '',
    description: '',
    icon: 'Gift',
    color: 'bg-[#E8A4B8]',
    frequency_type: 'monthly',
    frequency_limit: 1,
    status: 'available',
    order: 0,
  });

  const [benefitAppDialogOpen, setBenefitAppDialogOpen] = useState(false);
  const [editingBenefitApp, setEditingBenefitApp] = useState(null);
  const [benefitAppForm, setBenefitAppForm] = useState({
    status: 'pending',
    admin_notes: '',
  });

  const [selectedStaffForMessage, setSelectedStaffForMessage] = useState(null);
  const [messageContent, setMessageContent] = useState('');
  const [markedAsReadIds, setMarkedAsReadIds] = useState(new Set());
  const [broadcastDialogOpen, setBroadcastDialogOpen] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({
    content: '',
    target: 'all',
    targetRole: 'all',
  });

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [settingsForm, setSettingsForm] = useState({
    hero_title: '',
    hero_subtitle: '',
    hero_description: '',
    cta_text: '',
    footer_text: '',
    info_qr_title: '',
    info_qr_description: '',
    info_thanks_title: '',
    info_thanks_description: '',
    info_thanks_items: [],
    info_benefits_title: '',
    info_benefits_description: '',
    info_benefits_items: [],
  });

  useEffect(() => {
    base44.auth.me().then(async u => {
      // Check if user is admin - either in User entity or Staff entity
      const staffList = await base44.entities.Staff.filter({ email: u.email });
      const isUserAdmin = u.role === 'admin';
      const staff = staffList.length > 0 ? staffList[0] : null;
      const isStaffAdmin = staff && staff.role === 'admin';
      
      // Set full_name from Staff entity
      if (staff) {
        u.full_name = staff.full_name;
      }
      
      // User entity admin has full access regardless of Staff entity
      if (isUserAdmin) {
        // Auto-create Staff record if missing
        if (!staff) {
          try {
            await base44.entities.Staff.create({
              full_name: u.full_name || u.email,
              email: u.email,
              role: 'admin',
              approval_status: 'approved',
              status: 'active',
            });
          } catch (error) {
            console.error('スタッフ自動登録エラー:', error);
          }
        }
        setUser(u);
        return;
      }
      
      // Staff entity admin - check approval status
      if (isStaffAdmin) {
        if (staff.approval_status === 'approved') {
          setUser(u);
          return;
        }
        // If pending or rejected, allow access anyway (removed blocking)
        setUser(u);
        return;
      }
      
      // No admin access
      alert('管理者権限がありません。');
      window.location.href = '/';
    }).catch(() => {
      base44.auth.redirectToLogin();
    });
  }, []);

  // リアルタイム更新
  useEffect(() => {
    const map = { Shift: 'admin-shifts', ShiftApplication: 'admin-applications', Announcement: 'admin-announcements', Attendance: 'admin-attendance', Staff: 'admin-staff', TipRecord: 'admin-tips', Payout: 'admin-payouts', BenefitApplication: 'admin-benefit-apps' };
    const unsubs = Object.entries(map).map(([e, k]) => base44.entities[e].subscribe(() => queryClient.invalidateQueries([k])));
    return () => unsubs.forEach(fn => fn());
  }, [queryClient]);

  const { data: shifts = [] } = useQuery({ queryKey: ['admin-shifts'], queryFn: () => base44.entities.Shift.list('-date') });
  const { data: applications = [] } = useQuery({ queryKey: ['admin-applications'], queryFn: () => base44.entities.ShiftApplication.list('-created_date') });
  const { data: announcements = [] } = useQuery({ queryKey: ['admin-announcements'], queryFn: () => base44.entities.Announcement.list('-created_date') });
  const { data: attendanceRecords = [] } = useQuery({ queryKey: ['admin-attendance'], queryFn: () => base44.entities.Attendance.list('-date') });
  const { data: allStaff = [] } = useQuery({ queryKey: ['admin-staff'], queryFn: () => base44.entities.Staff.list('-created_date') });
  const { data: allTips = [] } = useQuery({ queryKey: ['admin-tips'], queryFn: () => base44.entities.TipRecord.list('-date') });
  const { data: allPayouts = [] } = useQuery({ queryKey: ['admin-payouts'], queryFn: () => base44.entities.Payout.list('-date') });
  const { data: dicePrizes = [] } = useQuery({ queryKey: ['admin-dice-prizes'], queryFn: () => base44.entities.DicePrize.list('dice_number') });
  const { data: allServices = [] } = useQuery({ queryKey: ['admin-services'], queryFn: () => base44.entities.Service.list('order') });
  const { data: allBenefits = [] } = useQuery({ queryKey: ['admin-benefits'], queryFn: () => base44.entities.Benefit.list('order') });
  const { data: allBenefitApps = [] } = useQuery({ queryKey: ['admin-benefit-apps'], queryFn: () => base44.entities.BenefitApplication.list('-created_date') });
  const { data: allMessages = [] } = useQuery({
    queryKey: ['admin-messages'],
    queryFn: async () => {
      if (!user) return [];
      const sent = await base44.entities.Message.filter({ sender_email: user.email });
      const received = await base44.entities.Message.filter({ receiver_email: user.email });
      return [...sent, ...received].sort((a, b) => getMessageTimestamp(b) - getMessageTimestamp(a));
    },
    enabled: !!user,
    refetchInterval: 10000,
    staleTime: 5000,
  });
  const { data: siteSettings = {} } = useQuery({
    queryKey: ['admin-site-settings'],
    queryFn: async () => { const s = await base44.entities.SiteSettings.list(); return s.length > 0 ? s[0] : {}; },
  });

  useEffect(() => {
    if (siteSettings && siteSettings.id) {
      setSettingsForm({
        hero_title: siteSettings.hero_title || '',
        hero_subtitle: siteSettings.hero_subtitle || '',
        hero_description: siteSettings.hero_description || '',
        cta_text: siteSettings.cta_text || '',
        footer_text: siteSettings.footer_text || '',
        info_qr_title: siteSettings.info_qr_title || '',
        info_qr_description: siteSettings.info_qr_description || '',
        info_thanks_title: siteSettings.info_thanks_title || '',
        info_thanks_description: siteSettings.info_thanks_description || '',
        info_thanks_items: siteSettings.info_thanks_items || [],
        info_benefits_title: siteSettings.info_benefits_title || '',
        info_benefits_description: siteSettings.info_benefits_description || '',
        info_benefits_items: siteSettings.info_benefits_items || [],
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

  const approveStaffMutation = useMutation({
    mutationFn: (id) => base44.entities.Staff.update(id, { status: 'active', approval_status: 'approved' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-staff']);
      alert('スタッフを承認しました');
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
    mutationFn: async (data) => {
      const shift = await base44.entities.Shift.create(data);
      
      // お知らせを作成
      await base44.entities.Announcement.create({
        title: `新しいシフト募集: ${data.title}`,
        content: `${data.date} ${data.start_time}〜${data.end_time}\n場所: ${data.location}\n${data.description || ''}`,
        category: 'shift',
        is_pinned: false,
      });
      
      // 全スタッフに通知を送信
      const nowUtc = Date.now();
      const notifications = allStaff.map(staff => ({
        user_email: staff.email,
        type: 'shift',
        title: `新しいシフト募集: ${data.title}`,
        content: `${data.date} ${data.start_time}〜${data.end_time} ${data.location}`,
        related_id: shift.id,
        link_url: '/Shifts',
        createdAtUtc: nowUtc
      }));
      
      await base44.entities.Notification.bulkCreate(notifications);
      
      return shift;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-shifts']);
      queryClient.invalidateQueries(['admin-announcements']);
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

  const deleteAttendanceMutation = useMutation({
    mutationFn: (id) => base44.entities.Attendance.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-attendance']);
      setAttendanceDialogOpen(false);
      resetAttendanceForm();
    },
  });

  const createTipMutation = useMutation({
    mutationFn: async (data) => {
      const staff = allStaff.find(s => s.email === data.user_email);
      const tipRecord = await base44.entities.TipRecord.create({
        ...data,
        user_name: staff?.full_name || data.user_email,
        given_by: user.full_name,
      });

      // 通知を作成
      const nowUtc = Date.now();
      const jstMs = nowUtc + (9 * 60 * 60 * 1000);
      const date = new Date(jstMs);
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      const hours = String(date.getUTCHours()).padStart(2, '0');
      const minutes = String(date.getUTCMinutes()).padStart(2, '0');
      const displayTimeText = `${year}/${month}/${day} ${hours}:${minutes}`;

      const tipTypeName = tipTypes.find(t => t.value === data.tip_type)?.label || 'サンクスポイント';
      await base44.entities.Notification.create({
        user_email: data.user_email,
        type: 'tip',
        title: `${tipTypeName}を獲得しました！`,
        content: `${data.amount}ポイントが付与されました。${data.reason}`,
        related_id: tipRecord.id,
        link_url: '/TipsHistory',
        createdAtUtc: nowUtc,
        displayTimeText: displayTimeText
      });

      return tipRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-tips']);
      queryClient.invalidateQueries(['notifications']);
      setTipDialogOpen(false);
      resetTipForm();
    },
  });

  const deleteTipMutation = useMutation({
    mutationFn: (id) => base44.entities.TipRecord.update(id, { is_deleted: true }),
    onSuccess: () => queryClient.invalidateQueries(['admin-tips']),
  });

  const restoreTipMutation = useMutation({
    mutationFn: (id) => base44.entities.TipRecord.update(id, { is_deleted: false }),
    onSuccess: () => queryClient.invalidateQueries(['admin-tips']),
  });

  const createPayoutMutation = useMutation({
    mutationFn: (data) => {
      const staff = allStaff.find(s => s.email === data.user_email);
      return base44.entities.Payout.create({
        ...data,
        user_name: staff?.full_name || data.user_email,
        processed_by: user.full_name,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-payouts']);
      setPayoutDialogOpen(false);
      resetPayoutForm();
    },
  });

  const deletePayoutMutation = useMutation({
    mutationFn: (id) => base44.entities.Payout.update(id, { is_deleted: true }),
    onSuccess: () => queryClient.invalidateQueries(['admin-payouts']),
  });

  const restorePayoutMutation = useMutation({
    mutationFn: (id) => base44.entities.Payout.update(id, { is_deleted: false }),
    onSuccess: () => queryClient.invalidateQueries(['admin-payouts']),
  });

  const createDicePrizeMutation = useMutation({
    mutationFn: (data) => base44.entities.DicePrize.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-dice-prizes']);
      setDicePrizeDialogOpen(false);
      resetDicePrizeForm();
    },
  });

  const updateDicePrizeMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DicePrize.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-dice-prizes']);
      setDicePrizeDialogOpen(false);
      resetDicePrizeForm();
    },
  });

  const deleteDicePrizeMutation = useMutation({
    mutationFn: (id) => base44.entities.DicePrize.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['admin-dice-prizes']),
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

  const createServiceMutation = useMutation({
    mutationFn: (data) => base44.entities.Service.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-services']);
      setServiceDialogOpen(false);
      resetServiceForm();
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Service.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-services']);
      setServiceDialogOpen(false);
      resetServiceForm();
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: (id) => base44.entities.Service.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['admin-services']),
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

  const sendMessageMutation = useMutation({
    mutationFn: async (data) => {
      const nowUtc = Date.now();
      const message = await base44.entities.Message.create({
        ...data,
        createdAtUtc: nowUtc
      });
      
      // 受信者に通知を送信
      await base44.entities.Notification.create({
        user_email: data.receiver_email,
        type: 'message',
        title: `${data.sender_name}からメッセージ`,
        content: data.content.substring(0, 50) + (data.content.length > 50 ? '...' : ''),
        related_id: message.id,
        link_url: '/Messages',
        createdAtUtc: nowUtc
      });
      
      return message;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-messages']);
      setMessageContent('');
    },
  });

  const broadcastMessageMutation = useMutation({
    mutationFn: async (data) => {
      const nowUtc = Date.now();
      
      // 送信対象のスタッフを絞り込み
      let targetStaff = allStaff;
      if (data.target === 'role' && data.targetRole !== 'all') {
        targetStaff = allStaff.filter(s => s.role === data.targetRole);
      }
      
      // メッセージと通知を一斉作成
      const messages = targetStaff.map(staff => ({
        sender_email: user.email,
        sender_name: user.full_name,
        receiver_email: staff.email,
        receiver_name: staff.full_name,
        content: data.content,
        related_type: 'general',
        createdAtUtc: nowUtc
      }));
      
      const notifications = targetStaff.map(staff => ({
        user_email: staff.email,
        type: 'message',
        title: `${user.full_name}から一斉メッセージ`,
        content: data.content.substring(0, 50) + (data.content.length > 50 ? '...' : ''),
        link_url: '/Messages',
        createdAtUtc: nowUtc
      }));
      
      await base44.entities.Message.bulkCreate(messages);
      await base44.entities.Notification.bulkCreate(notifications);
      
      return { count: targetStaff.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['admin-messages']);
      setBroadcastDialogOpen(false);
      setBroadcastForm({ content: '', target: 'all', targetRole: 'all' });
      alert(`${result.count}名にメッセージを送信しました`);
    },
  });

  const markMessageAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Message.update(id, { is_read: true }),
    onSuccess: () => queryClient.invalidateQueries(['admin-messages']),
  });

  const resetShiftForm = () => {
    setShiftForm({
      title: '', date: '', start_time: '', end_time: '', location: '',
      service_type: 'day_service', hourly_rate: '', description: '',
      required_skills: '', max_applicants: 1, status: 'open',
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
      approval_status: 'pending',
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

  const resetPayoutForm = () => {
    setPayoutForm({
      user_email: '',
      amount: '',
      reason: '',
      payout_method: 'cash',
      date: new Date().toISOString().split('T')[0],
    });
  };

  const resetDicePrizeForm = () => {
    setDicePrizeForm({
      dice_number: 1,
      prize_name: '',
      points: '',
      emoji: '🎁',
      color: 'bg-gradient-to-br from-purple-400 to-pink-400',
      is_active: true,
    });
    setEditingDicePrize(null);
  };

  const handleEditDicePrize = (prize) => {
    setEditingDicePrize(prize);
    setDicePrizeForm({
      dice_number: prize.dice_number,
      prize_name: prize.prize_name,
      points: prize.points,
      emoji: prize.emoji || '🎁',
      color: prize.color || 'bg-gradient-to-br from-purple-400 to-pink-400',
      is_active: prize.is_active !== false,
    });
    setDicePrizeDialogOpen(true);
  };

  const handleSubmitDicePrize = () => {
    const data = {
      ...dicePrizeForm,
      points: Number(dicePrizeForm.points),
    };
    if (editingDicePrize) {
      updateDicePrizeMutation.mutate({ id: editingDicePrize.id, data });
    } else {
      createDicePrizeMutation.mutate(data);
    }
  };

  const resetServiceForm = () => {
    setServiceForm({
      title: '',
      description: '',
      icon: 'Heart',
      color: 'bg-[#2D4A6F]',
      order: 0,
    });
    setEditingService(null);
  };

  const resetBenefitForm = () => {
    setBenefitForm({
      title: '',
      description: '',
      icon: 'Gift',
      color: 'bg-[#E8A4B8]',
      frequency_type: 'monthly',
      frequency_limit: 1,
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

  const handleSendMessage = () => {
    if (!messageContent.trim() || !selectedStaffForMessage) return;
    
    sendMessageMutation.mutate({
      sender_email: user.email,
      sender_name: user.full_name,
      receiver_email: selectedStaffForMessage.email,
      receiver_name: selectedStaffForMessage.full_name,
      content: messageContent,
      related_type: 'general',
    });
  };

  const getConversationWithStaff = (staffEmail) => {
    const conversation = allMessages.filter(m => 
      (m.sender_email === user.email && m.receiver_email === staffEmail) ||
      (m.receiver_email === user.email && m.sender_email === staffEmail)
    ).sort((a, b) => getMessageTimestamp(a) - getMessageTimestamp(b));
    
    // Mark unread messages as read (only once per message)
    conversation.forEach(msg => {
      if (msg.receiver_email === user.email && !msg.is_read && !markedAsReadIds.has(msg.id)) {
        setMarkedAsReadIds(prev => new Set([...prev, msg.id]));
        markMessageAsReadMutation.mutate(msg.id);
      }
    });
    
    return conversation;
  };

  const getUnreadCountForStaff = (staffEmail) => {
    return allMessages.filter(m => 
      m.sender_email === staffEmail && 
      m.receiver_email === user.email && 
      !m.is_read
    ).length;
  };

  const handleEditService = (service) => {
    setEditingService(service);
    setServiceForm({
      title: service.title,
      description: service.description,
      icon: service.icon,
      color: service.color,
      order: service.order || 0,
    });
    setServiceDialogOpen(true);
  };

  const handleSubmitService = () => {
    if (editingService) {
      updateServiceMutation.mutate({ id: editingService.id, data: serviceForm });
    } else {
      createServiceMutation.mutate(serviceForm);
    }
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

  const createAttendanceMutation = useMutation({
    mutationFn: (data) => base44.entities.Attendance.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-attendance']);
      setAttendanceDialogOpen(false);
      resetAttendanceForm();
    },
  });

  const handleSubmitAttendance = () => {
    if (editingAttendance) {
      updateAttendanceMutation.mutate({ id: editingAttendance.id, data: attendanceForm });
    } else {
      const staffMember = allStaff.find(s => s.email === attendanceForm.user_email);
      createAttendanceMutation.mutate({
        ...attendanceForm,
        user_name: staffMember?.full_name || attendanceForm.user_email,
      });
    }
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
      approval_status: staff.approval_status || 'pending',
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
      status: shift.status || 'open',
    });
    setShiftDialogOpen(true);
  };

  const handleSubmitShift = () => {
    const data = {
      ...shiftForm,
      hourly_rate: shiftForm.hourly_rate ? Number(shiftForm.hourly_rate) : null,
      max_applicants: Number(shiftForm.max_applicants),
      required_skills: shiftForm.required_skills ? shiftForm.required_skills.split(',').map(s => s.trim()).filter(Boolean) : [],
      status: shiftForm.status,
    };

    if (editingShift) {
      updateShiftMutation.mutate({ id: editingShift.id, data });
    } else {
      createShiftMutation.mutate(data);
    }
  };

  const updateAnnouncementMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Announcement.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-announcements']);
      setAnnouncementDialogOpen(false);
      resetAnnouncementForm();
    },
  });

  const handleEditAnnouncement = (announcement) => {
    setEditingAnnouncement(announcement);
    setAnnouncementForm({
      title: announcement.title,
      content: announcement.content,
      category: announcement.category,
      is_pinned: announcement.is_pinned || false,
    });
    setAnnouncementDialogOpen(true);
  };

  const handleSubmitAnnouncement = () => {
    if (editingAnnouncement) {
      updateAnnouncementMutation.mutate({ id: editingAnnouncement.id, data: announcementForm });
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
            <TabsList className="bg-white shadow-lg p-1.5 mb-6 w-full flex-wrap justify-start gap-1.5 h-auto">
              {[
                { value: 'settings', icon: Settings, label: 'サイト設定' },
                { value: 'services', icon: Gift, label: 'サービス' },
                { value: 'qrcode', icon: QrCode, label: 'QRコード' },
                { value: 'shifts', icon: Calendar, label: '単発管理' },
                { value: 'applications', icon: FileText, label: '応募管理' },
                { value: 'attendance', icon: Clock, label: '勤怠管理' },
                { value: 'announcements', icon: Bell, label: 'お知らせ' },
                { value: 'staff', icon: Users, label: 'スタッフ' },
                { value: 'tips', icon: Sparkles, label: 'サンクス' },
                { value: 'benefits', icon: Gift, label: '福利厚生' },
                { value: 'help', icon: Bell, label: 'ヘルプ' },
                { value: 'messages', icon: MessageCircle, label: 'メッセージ' },
                { value: 'transport', icon: Truck, label: '送迎管理' },
              ].map(({ value, icon: Icon, label }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="data-[state=active]:bg-[#2D4A6F] data-[state=active]:text-white text-xs flex flex-col items-center gap-1 py-2 px-3 min-w-[56px] h-auto rounded-lg"
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="leading-tight text-center">{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

          {/* Site Settings Tab */}
          <TabsContent value="settings">
            <div className="space-y-6">
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
                </div>
              </Card>

              <Card className="border-0 shadow-lg">
                <div className="p-6 border-b">
                  <h2 className="text-lg font-medium">ダッシュボード右側情報セクション</h2>
                </div>
                <div className="p-6 space-y-6 max-w-2xl">
                  <div className="space-y-4 p-4 bg-[#2D4A6F]/5 rounded-lg">
                    <h3 className="font-medium text-sm text-slate-800">QR勤怠打刻セクション</h3>
                    <div>
                      <Label>タイトル</Label>
                      <Input
                        value={settingsForm.info_qr_title}
                        onChange={(e) => setSettingsForm({...settingsForm, info_qr_title: e.target.value})}
                        placeholder="勤怠打刻方法"
                      />
                    </div>
                    <div>
                      <Label>説明文</Label>
                      <Textarea 
                        value={settingsForm.info_qr_description}
                        onChange={(e) => setSettingsForm({...settingsForm, info_qr_description: e.target.value})}
                        placeholder="勤務開始時・終了時に、事業所内に設置されたQRコードを読み取ってください。位置情報を確認し、自動的に打刻されます。"
                        className="h-24"
                      />
                    </div>
                  </div>

                  <div className="space-y-4 p-4 bg-[#E8A4B8]/5 rounded-lg">
                    <h3 className="font-medium text-sm text-slate-800">サンクス制度セクション</h3>
                    <div>
                      <Label>タイトル</Label>
                      <Input
                        value={settingsForm.info_thanks_title}
                        onChange={(e) => setSettingsForm({...settingsForm, info_thanks_title: e.target.value})}
                        placeholder="感謝が見える仕組み"
                      />
                    </div>
                    <div>
                      <Label>説明文</Label>
                      <Textarea 
                        value={settingsForm.info_thanks_description}
                        onChange={(e) => setSettingsForm({...settingsForm, info_thanks_description: e.target.value})}
                        placeholder="チップは、利用者・ご家族・事業所からの評価に基づき、不定期で付与されます。"
                        className="h-20"
                      />
                    </div>
                    <div>
                      <Label>項目リスト（1行1項目）</Label>
                      <Textarea 
                        value={settingsForm.info_thanks_items.join('\n')}
                        onChange={(e) => setSettingsForm({...settingsForm, info_thanks_items: e.target.value.split('\n').filter(Boolean)})}
                        placeholder="現場貢献スペシャルサンクス&#10;感謝還元サンクスギフト&#10;人財穴埋めサンクス"
                        className="h-24 font-mono text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-4 p-4 bg-[#7CB342]/5 rounded-lg">
                    <h3 className="font-medium text-sm text-slate-800">福利厚生制度セクション</h3>
                    <div>
                      <Label>タイトル</Label>
                      <Input
                        value={settingsForm.info_benefits_title}
                        onChange={(e) => setSettingsForm({...settingsForm, info_benefits_title: e.target.value})}
                        placeholder="福利厚生制度"
                      />
                    </div>
                    <div>
                      <Label>説明文</Label>
                      <Textarea 
                        value={settingsForm.info_benefits_description}
                        onChange={(e) => setSettingsForm({...settingsForm, info_benefits_description: e.target.value})}
                        placeholder="働く人の人生の質を高める福利厚生制度を整えています。"
                        className="h-20"
                      />
                    </div>
                    <div>
                      <Label>項目リスト（1行1項目）</Label>
                      <Textarea 
                        value={settingsForm.info_benefits_items.join('\n')}
                        onChange={(e) => setSettingsForm({...settingsForm, info_benefits_items: e.target.value.split('\n').filter(Boolean)})}
                        placeholder="エステ／リラクゼーション利用券&#10;カーシェアサービス利用権&#10;ガレージ使用権&#10;介護タクシー職員割引&#10;葬祭・遺品整理 割引制度"
                        className="h-32 font-mono text-sm"
                      />
                    </div>
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
            </div>
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services">
            <Card className="border-0 shadow-lg">
              <div className="p-4 sm:p-6 border-b flex flex-col sm:flex-row gap-3 sm:gap-0 sm:justify-between sm:items-center">
                <h2 className="text-lg font-medium">サービス一覧</h2>
                <Button onClick={() => { resetServiceForm(); setServiceDialogOpen(true); }} className="bg-[#2D4A6F] w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  新規サービス
                </Button>
              </div>
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>サービス名</TableHead>
                    <TableHead>説明</TableHead>
                    <TableHead>アイコン</TableHead>
                    <TableHead>カラー</TableHead>
                    <TableHead>順序</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allServices.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell className="font-medium">{service.title}</TableCell>
                      <TableCell className="max-w-xs truncate">{service.description}</TableCell>
                      <TableCell>{service.icon}</TableCell>
                      <TableCell>
                        <div className={`w-6 h-6 rounded ${service.color}`} />
                      </TableCell>
                      <TableCell>{service.order || 0}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditService(service)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteServiceMutation.mutate(service.id)}>
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

          {/* QR Code Tab */}
          <TabsContent value="qrcode">
            <QRCodeManager />
          </TabsContent>

          {/* Shifts Tab */}
          <TabsContent value="shifts">
           <Card className="border-0 shadow-lg">
             <div className="p-4 sm:p-6 border-b flex flex-col sm:flex-row gap-3 sm:gap-0 sm:justify-between sm:items-center">
               <h2 className="text-lg font-medium">単発募集一覧</h2>
               <Button onClick={() => { resetShiftForm(); setShiftDialogOpen(true); }} className="bg-[#2D4A6F] w-full sm:w-auto">
                 <Plus className="w-4 h-4 mr-2" />
                 新規単発募集
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
                        {safeFormat(shift.date, 'M/d')} {shift.start_time}〜{shift.end_time}
                      </TableCell>
                      <TableCell>{shift.location}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {serviceTypes.find(t => t.value === shift.service_type)?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={shift.status} 
                          onValueChange={(newStatus) => updateShiftMutation.mutate({ id: shift.id, data: { status: newStatus } })}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">募集中</SelectItem>
                            <SelectItem value="filled">募集終了</SelectItem>
                            <SelectItem value="cancelled">募集停止</SelectItem>
                          </SelectContent>
                        </Select>
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
                      <TableCell>{safeFormat(app.created_date, 'M/d HH:mm')}</TableCell>
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
                        <div className="flex flex-wrap justify-between items-center gap-3">
                          <h2 className="text-lg font-medium">勤怠管理</h2>
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              onClick={() => {
                                setEditingAttendance(null);
                                setAttendanceForm({ user_email: '', user_name: '', date: new Date().toISOString().split('T')[0], clock_in: '', clock_out: '', status: 'completed' });
                                setAttendanceDialogOpen(true);
                              }}
                              className="bg-[#7CB342] hover:bg-[#6BA232]"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              勤怠追加
                            </Button>
                            <Button onClick={() => setReportDialogOpen(true)} className="bg-[#2D4A6F]">
                              <Download className="w-4 h-4 mr-2" />
                              レポート生成
                            </Button>
                          </div>
                        </div>
                      </Card>

                      <Card className="border-0 shadow-lg">
                        <Tabs defaultValue="calendar" className="w-full">
                          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-white">
                            <TabsTrigger value="calendar" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#2D4A6F] data-[state=active]:bg-transparent px-6 py-3">
                              カレンダー
                            </TabsTrigger>
                            <TabsTrigger value="by-date" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#2D4A6F] data-[state=active]:bg-transparent px-6 py-3">
                              日別
                            </TabsTrigger>
                            <TabsTrigger value="by-staff" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#2D4A6F] data-[state=active]:bg-transparent px-6 py-3">
                              人別
                            </TabsTrigger>
                            <TabsTrigger value="by-month" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#2D4A6F] data-[state=active]:bg-transparent px-6 py-3">
                              月別統計
                            </TabsTrigger>
                          </TabsList>

                          <TabsContent value="calendar" className="p-6">
                            <AttendanceCalendar 
                              attendanceRecords={attendanceRecords} 
                              staff={allStaff}
                            />
                          </TabsContent>

                          <TabsContent value="by-date" className="p-6">
                            <div className="space-y-6">
                              <div className="flex gap-4 items-center">
                                <Label className="min-w-[80px]">対象日付</Label>
                                <Input 
                                  type="date" 
                                  className="max-w-xs"
                                  value={selectedDate}
                                  onChange={(e) => setSelectedDate(e.target.value)}
                                />
                              </div>
                              <div className="overflow-x-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>スタッフ</TableHead>
                                      <TableHead>カテゴリー</TableHead>
                                      <TableHead>出勤</TableHead>
                                      <TableHead>退勤</TableHead>
                                      <TableHead>勤務時間</TableHead>
                                      <TableHead>状態</TableHead>
                                      <TableHead>操作</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {attendanceRecords
                                      .filter(r => r.date === selectedDate)
                                      .map((record) => {
                                        let hours = 0;
                                        if (record.clock_in && record.clock_out) {
                                          const [inH, inM] = record.clock_in.split(':').map(Number);
                                          const [outH, outM] = record.clock_out.split(':').map(Number);
                                          hours = ((outH * 60 + outM) - (inH * 60 + inM)) / 60;
                                        }
                                        return (
                                          <TableRow key={record.id}>
                                            <TableCell className="font-medium">{getStaffName(record.user_email)}</TableCell>
                                            <TableCell>
                                              <Badge className={
                                                allStaff.find(s => s.email === record.user_email)?.role === 'admin' ? 'bg-indigo-100 text-indigo-700' :
                                                allStaff.find(s => s.email === record.user_email)?.role === 'full_time' ? 'bg-emerald-100 text-emerald-700' :
                                                allStaff.find(s => s.email === record.user_email)?.role === 'part_time' ? 'bg-amber-100 text-amber-700' :
                                                'bg-cyan-100 text-cyan-700'
                                              } variant="outline">
                                                {allStaff.find(s => s.email === record.user_email)?.role === 'admin' ? '管理者' : 
                                                 allStaff.find(s => s.email === record.user_email)?.role === 'full_time' ? '正社員' : 
                                                 allStaff.find(s => s.email === record.user_email)?.role === 'part_time' ? 'パート' : 
                                                 '単発'}
                                              </Badge>
                                            </TableCell>
                                            <TableCell className="font-mono">{record.clock_in}</TableCell>
                                            <TableCell className="font-mono">{record.clock_out || '-'}</TableCell>
                                            <TableCell className="font-semibold text-[#2D4A6F]">
                                              {hours > 0 ? `${hours.toFixed(1)}h` : '-'}
                                            </TableCell>
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
                                              <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => handleEditAttendance(record)}>
                                                  <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => { if (confirm('削除しますか？')) deleteAttendanceMutation.mutate(record.id); }}>
                                                  <Trash2 className="w-4 h-4 text-red-500" />
                                                </Button>
                                              </div>
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          </TabsContent>

                          <TabsContent value="by-staff" className="p-6">
                            <div className="space-y-6">
                              {getUniqueStaffEmails().map(email => {
                                const staffRecords = attendanceRecords.filter(r => r.user_email === email);
                                const staffInfo = allStaff.find(s => s.email === email);
                                return (
                                  <Card key={email} className="border border-slate-200">
                                    <div className="p-4 bg-gradient-to-r from-slate-50 to-white border-b">
                                      <div className="flex items-center justify-between flex-wrap gap-3">
                                        <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 rounded-full bg-[#2D4A6F] text-white flex items-center justify-center font-semibold">
                                            {getStaffName(email)[0]}
                                          </div>
                                          <div>
                                            <p className="font-semibold text-slate-900">{getStaffName(email)}</p>
                                            <p className="text-xs text-slate-500">{email}</p>
                                          </div>
                                          <Badge className={
                                            staffInfo?.role === 'admin' ? 'bg-indigo-100 text-indigo-700' :
                                            staffInfo?.role === 'full_time' ? 'bg-emerald-100 text-emerald-700' :
                                            staffInfo?.role === 'part_time' ? 'bg-amber-100 text-amber-700' :
                                            'bg-cyan-100 text-cyan-700'
                                          } variant="outline">
                                            {staffInfo?.role === 'admin' ? '管理者' : 
                                             staffInfo?.role === 'full_time' ? '正社員' : 
                                             staffInfo?.role === 'part_time' ? 'パート' : 
                                             '単発'}
                                          </Badge>
                                        </div>
                                        <div className="flex gap-6 text-sm">
                                          <div className="text-center">
                                            <p className="text-slate-600">出勤日数</p>
                                            <p className="text-xl font-bold text-slate-900">{staffRecords.length}</p>
                                          </div>
                                          <div className="text-center">
                                            <p className="text-slate-600">合計時間</p>
                                            <p className="text-xl font-bold text-[#2D4A6F]">{calculateTotalHours(email)}</p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>日付</TableHead>
                                            <TableHead>出勤</TableHead>
                                            <TableHead>退勤</TableHead>
                                            <TableHead>勤務時間</TableHead>
                                            <TableHead>状態</TableHead>
                                            <TableHead>操作</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {staffRecords.map((record) => {
                                            let hours = 0;
                                            if (record.clock_in && record.clock_out) {
                                              const [inH, inM] = record.clock_in.split(':').map(Number);
                                              const [outH, outM] = record.clock_out.split(':').map(Number);
                                              hours = ((outH * 60 + outM) - (inH * 60 + inM)) / 60;
                                            }
                                            return (
                                              <TableRow key={record.id}>
                                                <TableCell className="font-medium">{safeFormat(record.date, 'M/d')}</TableCell>
                                                <TableCell className="font-mono">{record.clock_in}</TableCell>
                                                <TableCell className="font-mono">{record.clock_out || '-'}</TableCell>
                                                <TableCell className="font-semibold text-[#2D4A6F]">
                                                  {hours > 0 ? `${hours.toFixed(1)}h` : '-'}
                                                </TableCell>
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
                                                  <div className="flex gap-1">
                                                    <Button variant="ghost" size="icon" onClick={() => handleEditAttendance(record)}>
                                                      <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => { if (confirm('削除しますか？')) deleteAttendanceMutation.mutate(record.id); }}>
                                                      <Trash2 className="w-4 h-4 text-red-500" />
                                                    </Button>
                                                  </div>
                                                </TableCell>
                                              </TableRow>
                                            );
                                          })}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </Card>
                                );
                              })}
                            </div>
                          </TabsContent>

                          <TabsContent value="by-month" className="p-6">
                            <div className="space-y-6">
                              <div className="flex gap-4 items-center">
                                <Label className="min-w-[80px]">対象月</Label>
                                <Input 
                                  type="month" 
                                  className="max-w-xs"
                                  defaultValue={new Date().toISOString().slice(0, 7)}
                                />
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                                  <p className="text-sm text-blue-700 mb-2 font-medium">総出勤日数</p>
                                  <p className="text-4xl font-bold text-blue-900">{attendanceRecords.length}</p>
                                </Card>
                                <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                                  <p className="text-sm text-green-700 mb-2 font-medium">スタッフ数</p>
                                  <p className="text-4xl font-bold text-green-900">{getUniqueStaffEmails().length}</p>
                                </Card>
                                <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                                  <p className="text-sm text-purple-700 mb-2 font-medium">総勤務時間</p>
                                  <p className="text-4xl font-bold text-purple-900">
                                    {(() => {
                                      let totalMinutes = 0;
                                      attendanceRecords.forEach(r => {
                                        if (r.clock_in && r.clock_out) {
                                          const [inH, inM] = r.clock_in.split(':').map(Number);
                                          const [outH, outM] = r.clock_out.split(':').map(Number);
                                          totalMinutes += (outH * 60 + outM) - (inH * 60 + inM);
                                        }
                                      });
                                      return `${Math.floor(totalMinutes / 60)}h`;
                                    })()}
                                  </p>
                                </Card>
                              </div>

                              <Card className="border border-slate-200">
                                <div className="overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="bg-slate-50">
                                        <TableHead>スタッフ</TableHead>
                                        <TableHead>カテゴリー</TableHead>
                                        <TableHead>出勤日数</TableHead>
                                        <TableHead>合計時間</TableHead>
                                        <TableHead>平均時間/日</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {getUniqueStaffEmails().map(email => {
                                        const staffRecords = attendanceRecords.filter(r => r.user_email === email);
                                        let totalMinutes = 0;
                                        staffRecords.forEach(r => {
                                          if (r.clock_in && r.clock_out) {
                                            const [inH, inM] = r.clock_in.split(':').map(Number);
                                            const [outH, outM] = r.clock_out.split(':').map(Number);
                                            totalMinutes += (outH * 60 + outM) - (inH * 60 + inM);
                                          }
                                        });
                                        const avgMinutes = staffRecords.length > 0 ? totalMinutes / staffRecords.length : 0;
                                        return (
                                          <TableRow key={email}>
                                            <TableCell className="font-medium">{getStaffName(email)}</TableCell>
                                            <TableCell>
                                              <Badge className={
                                                allStaff.find(s => s.email === email)?.role === 'admin' ? 'bg-indigo-100 text-indigo-700' :
                                                allStaff.find(s => s.email === email)?.role === 'full_time' ? 'bg-emerald-100 text-emerald-700' :
                                                allStaff.find(s => s.email === email)?.role === 'part_time' ? 'bg-amber-100 text-amber-700' :
                                                'bg-cyan-100 text-cyan-700'
                                              } variant="outline">
                                                {allStaff.find(s => s.email === email)?.role === 'admin' ? '管理者' : 
                                                 allStaff.find(s => s.email === email)?.role === 'full_time' ? '正社員' : 
                                                 allStaff.find(s => s.email === email)?.role === 'part_time' ? 'パート' : 
                                                 '単発'}
                                              </Badge>
                                            </TableCell>
                                            <TableCell className="text-lg font-semibold">{staffRecords.length}日</TableCell>
                                            <TableCell className="text-lg font-bold text-[#2D4A6F]">{calculateTotalHours(email)}</TableCell>
                                            <TableCell className="text-slate-600 font-medium">
                                              {avgMinutes > 0 ? `${(avgMinutes / 60).toFixed(1)}h` : '-'}
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </TableBody>
                                  </Table>
                                </div>
                              </Card>
                            </div>
                          </TabsContent>
                        </Tabs>
                      </Card>
                    </div>
                  </TabsContent>

          {/* Staff Tab */}
          <TabsContent value="staff">
            <StaffListTabComponent
              allStaff={allStaff}
              onEdit={handleEditStaff}
              onDelete={(id) => deleteStaffMutation.mutate(id)}
              onInvite={(email) => inviteStaffMutation.mutate({ email })}
              onAddNew={() => { resetStaffForm(); setStaffDialogOpen(true); }}
              invitePending={inviteStaffMutation.isPending}
            />
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
                      <TableCell>{safeFormat(announcement.created_date, 'M/d HH:mm')}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditAnnouncement(announcement)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteAnnouncementMutation.mutate(announcement.id)}>
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

                  {/* Tips Tab */}
                  <TabsContent value="tips">
                  <div className="space-y-6">

                  {/* クイック付与エリア */}
                  <Card className="border-0 shadow-lg bg-gradient-to-br from-[#E8A4B8]/10 to-[#C17A8E]/5">
                  <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                  <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-[#C17A8E]" />
                  サンクスポイント付与
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">スタッフへ感謝の気持ちを形にしましょう</p>
                  </div>
                  <Button 
                  onClick={() => { resetTipForm(); setTipDialogOpen(true); }} 
                  size="lg"
                  className="bg-gradient-to-r from-[#E8A4B8] to-[#C17A8E] hover:from-[#D393A7] hover:to-[#B06979] text-white shadow-lg"
                  >
                  <Plus className="w-5 h-5 mr-2" />
                  サンクスを付与
                  </Button>
                  </div>
                  </div>
                  </Card>

                  {/* 統計サマリー */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                  <p className="text-sm text-purple-700 mb-2 font-medium">今月の総付与</p>
                  <p className="text-3xl font-bold text-purple-900">
                  {allTips
                  .filter(t => {
                  const tipDate = new Date(t.date);
                  const now = new Date();
                  return tipDate.getMonth() === now.getMonth() && tipDate.getFullYear() === now.getFullYear();
                  })
                  .reduce((sum, t) => sum + t.amount, 0)
                  .toLocaleString()}pt
                  </p>
                  </Card>
                  <Card className="p-6 bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
                  <p className="text-sm text-pink-700 mb-2 font-medium">今月の付与回数</p>
                  <p className="text-3xl font-bold text-pink-900">
                  {allTips
                  .filter(t => {
                  const tipDate = new Date(t.date);
                  const now = new Date();
                  return tipDate.getMonth() === now.getMonth() && tipDate.getFullYear() === now.getFullYear();
                  })
                  .length}回
                  </p>
                  </Card>
                  <Card className="p-6 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                  <p className="text-sm text-amber-700 mb-2 font-medium">累計付与額</p>
                  <p className="text-3xl font-bold text-amber-900">
                  {allTips.reduce((sum, t) => sum + t.amount, 0).toLocaleString()}pt
                  </p>
                  </Card>
                  </div>

                  {/* スタッフ別サマリー */}
                  <Card className="border-0 shadow-lg">
                  <div className="p-6 border-b">
                  <h3 className="text-lg font-medium">スタッフ別累計</h3>
                  </div>
                  <div className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allStaff
                  .map(staff => {
                  const staffTips = allTips.filter(t => t.user_email === staff.email);
                  const total = staffTips.reduce((sum, t) => sum + t.amount, 0);
                  return { staff, total, count: staffTips.length };
                  })
                  .sort((a, b) => b.total - a.total)
                  .slice(0, 12)
                  .map(({ staff, total, count }) => (
                  <Card 
                  key={staff.id} 
                  className="p-4 bg-gradient-to-br from-slate-50 to-white hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => {
                  setSelectedStaffForTips(staff);
                  setStaffTipHistoryDialogOpen(true);
                  }}
                  >
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
                  <div className="text-xs text-slate-500 mt-1">{count}回付与</div>
                  </Card>
                  ))}
                  </div>
                  </div>
                  </Card>

                  {/* 付与履歴 */}
                  <Card className="border-0 shadow-lg">
                  <div className="p-6 border-b">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h3 className="text-lg font-medium">付与履歴</h3>
                  <div className="flex flex-wrap gap-2">
                  <Select value={tipFilterStaff} onValueChange={setTipFilterStaff}>
                  <SelectTrigger className="w-40">
                  <SelectValue placeholder="スタッフ" />
                  </SelectTrigger>
                  <SelectContent>
                  <SelectItem value="all">全スタッフ</SelectItem>
                  {allStaff.map(s => (
                  <SelectItem key={s.email} value={s.email}>{s.full_name}</SelectItem>
                  ))}
                  </SelectContent>
                  </Select>
                  <Select value={tipFilterType} onValueChange={setTipFilterType}>
                  <SelectTrigger className="w-44">
                  <SelectValue placeholder="種類" />
                  </SelectTrigger>
                  <SelectContent>
                  <SelectItem value="all">全種類</SelectItem>
                  {tipTypes.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                  </SelectContent>
                  </Select>
                  <Input 
                  type="month" 
                  value={tipFilterMonth}
                  onChange={(e) => setTipFilterMonth(e.target.value)}
                  className="w-40"
                  placeholder="月を選択"
                  />
                  </div>
                  </div>
                  </div>
                  <div className="p-6">
                  <div className="space-y-3">
                  {allTips
                  .filter(tip => {
                  if (tipFilterStaff !== 'all' && tip.user_email !== tipFilterStaff) return false;
                  if (tipFilterType !== 'all' && tip.tip_type !== tipFilterType) return false;
                  if (tipFilterMonth) {
                  const tipMonth = safeFormat(tip.date, 'yyyy-MM');
                  if (tipMonth !== tipFilterMonth) return false;
                  }
                  return true;
                  })
                  .map((tip) => (
                  <Card key={tip.id} className="p-4 hover:shadow-md transition-shadow bg-gradient-to-r from-white to-slate-50">
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
                  <p className="text-sm text-slate-600 ml-13">{tip.reason || '-'}</p>
                  </div>
                  <div className="flex flex-col items-end justify-between gap-2 sm:min-w-[180px]">
                  <div className="text-right">
                  <div className="text-3xl font-bold text-[#C17A8E]">{tip.amount.toLocaleString()}<span className="text-lg">pt</span></div>
                  <div className="text-sm text-slate-500">¥{tip.amount.toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{safeFormat(tip.date, 'yyyy/M/d')} by {tip.given_by}</span>
                  <Button variant="ghost" size="icon" onClick={() => deleteTipMutation.mutate(tip.id)} className="h-8 w-8">
                  <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                  </div>
                  </div>
                  </div>
                  </Card>
                  ))}
                  {allTips.filter(tip => {
                  if (tipFilterStaff !== 'all' && tip.user_email !== tipFilterStaff) return false;
                  if (tipFilterType !== 'all' && tip.tip_type !== tipFilterType) return false;
                  if (tipFilterMonth) {
                  const tipMonth = safeFormat(tip.date, 'yyyy-MM');
                  if (tipMonth !== tipFilterMonth) return false;
                  }
                  return true;
                  }).length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                  <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>該当する付与履歴がありません</p>
                  </div>
                  )}
                  </div>
                  </div>
                  </Card>

                  <Card className="border-0 shadow-lg">
                  <div className="p-4 sm:p-6 border-b flex flex-col sm:flex-row gap-3 sm:gap-0 sm:justify-between sm:items-center">
                  <h2 className="text-lg font-medium">双六ゲーム賞品設定</h2>
                  <Button onClick={() => { resetDicePrizeForm(); setDicePrizeDialogOpen(true); }} className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  賞品追加
                  </Button>
                  </div>
                  <div className="overflow-x-auto">
                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>出目</TableHead>
                      <TableHead>絵文字</TableHead>
                      <TableHead>賞品名</TableHead>
                      <TableHead>ポイント</TableHead>
                      <TableHead>カラー</TableHead>
                      <TableHead>状態</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dicePrizes.map((prize) => (
                      <TableRow key={prize.id}>
                        <TableCell className="font-bold text-lg">{prize.dice_number}</TableCell>
                        <TableCell className="text-2xl">{prize.emoji || '🎁'}</TableCell>
                        <TableCell className="font-medium">{prize.prize_name}</TableCell>
                        <TableCell className="font-semibold text-purple-600">{prize.points}pt</TableCell>
                        <TableCell>
                          <div className={`w-16 h-8 rounded ${prize.color}`} />
                        </TableCell>
                        <TableCell>
                          <Badge className={prize.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}>
                            {prize.is_active !== false ? '有効' : '無効'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEditDicePrize(prize)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteDicePrizeMutation.mutate(prize.id)}>
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
                  </div>
                  </TabsContent>



          {/* Transport Admin Tab */}
          <TabsContent value="transport">
            <div className="bg-white rounded-xl shadow p-8 text-center">
              <div className="text-5xl mb-4">🚌</div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">送迎管理センター</h2>
              <p className="text-slate-500 mb-6">承認・修正・車両管理・ルート設定・PDF出力は専用の管理センターで行います。</p>
              <a href={`/TransportAdmin`}>
                <Button className="bg-[#2D4A6F] hover:bg-[#1E3A5F] text-white text-lg px-8 py-4 h-auto">
                  送迎管理センターを開く →
                </Button>
              </a>
            </div>
          </TabsContent>

          {/* Help Call Tab */}
          <TabsContent value="help">
            <HelpRequestManager user={user} allStaff={allStaff} />
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* スタッフ一覧 */}
              <Card className="border-0 shadow-lg lg:col-span-1">
                <div className="p-4 sm:p-6 border-b flex justify-between items-center">
                  <h2 className="text-lg font-medium">スタッフ一覧</h2>
                  <Button 
                    onClick={() => setBroadcastDialogOpen(true)} 
                    size="sm"
                    className="bg-[#E8A4B8] hover:bg-[#D393A7]"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    一斉送信
                  </Button>
                </div>
                <div className="divide-y max-h-[600px] overflow-y-auto">
                  {allStaff.map((staff) => {
                    const unreadCount = getUnreadCountForStaff(staff.email);
                    const lastMessage = allMessages.find(m => 
                      (m.sender_email === staff.email && m.receiver_email === user.email) ||
                      (m.receiver_email === staff.email && m.sender_email === user.email)
                    );

                    return (
                      <div
                        key={staff.id}
                        onClick={() => setSelectedStaffForMessage(staff)}
                        className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${
                          selectedStaffForMessage?.id === staff.id ? 'bg-[#2D4A6F]/5' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#2D4A6F] text-white flex items-center justify-center font-semibold">
                              {staff.full_name[0]}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{staff.full_name}</p>
                              {lastMessage && (
                                <p className="text-xs text-slate-500 truncate max-w-[150px]">
                                  {lastMessage.content}
                                </p>
                              )}
                            </div>
                          </div>
                          {unreadCount > 0 && (
                            <Badge className="bg-red-500 text-white">{unreadCount}</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* メッセージエリア */}
              <Card className="border-0 shadow-lg lg:col-span-2">
                {selectedStaffForMessage ? (
                  <>
                    <div className="p-4 sm:p-6 border-b">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#2D4A6F] text-white flex items-center justify-center font-semibold">
                          {selectedStaffForMessage.full_name[0]}
                        </div>
                        <div>
                          <h2 className="text-lg font-medium">{selectedStaffForMessage.full_name}</h2>
                          <p className="text-sm text-slate-500">{selectedStaffForMessage.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto">
                      {getConversationWithStaff(selectedStaffForMessage.email).map((msg) => {
                        const isSent = msg.sender_email === user.email;

                        return (
                          <div key={msg.id} className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] ${isSent ? 'bg-[#2D4A6F] text-white' : 'bg-slate-100 text-slate-900'} rounded-lg p-3`}>
                              <p className="text-sm">{msg.content}</p>
                              <p className={`text-xs mt-1 ${isSent ? 'text-white/70' : 'text-slate-500'}`}>
                                {getDisplayTimeText(msg)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="p-4 border-t">
                      <div className="flex gap-2">
                        <Textarea
                          value={messageContent}
                          onChange={(e) => setMessageContent(e.target.value)}
                          placeholder="メッセージを入力..."
                          className="flex-1"
                          rows={2}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                        />
                        <Button 
                          onClick={handleSendMessage}
                          disabled={!messageContent.trim() || sendMessageMutation.isPending}
                          className="bg-[#2D4A6F]"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-12 text-center text-slate-400">
                    <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>スタッフを選択してメッセージを開始してください</p>
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

          {/* Benefits Tab */}
          <TabsContent value="benefits">
            <div className="space-y-6">
              <Card className="border-0 shadow-lg">
                <div className="p-4 sm:p-6 border-b flex flex-col sm:flex-row gap-3 sm:gap-0 sm:justify-between sm:items-center">
                  <h2 className="text-lg font-medium">福利厚生項目</h2>
                  <Button onClick={() => { resetBenefitForm(); setBenefitDialogOpen(true); }} className="bg-[#7CB342] w-full sm:w-auto">
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
                        <TableHead>頻度制限</TableHead>
                        <TableHead>ステータス</TableHead>
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
                            {benefit.frequency_type === 'unlimited' ? '無制限' :
                             benefit.frequency_type === 'monthly' ? `月${benefit.frequency_limit || 1}回` :
                             benefit.frequency_type === 'yearly' ? `年${benefit.frequency_limit || 1}回` :
                             '1回のみ'}
                          </TableCell>
                          <TableCell>
                            <Badge className={benefit.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                              {benefit.status === 'available' ? '利用可能' : '準備中'}
                            </Badge>
                          </TableCell>
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

              <Card className="border-0 shadow-lg">
                <div className="p-4 sm:p-6 border-b">
                  <h2 className="text-lg font-medium">福利厚生申請一覧</h2>
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
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allBenefitApps.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell className="font-medium">{app.user_name}</TableCell>
                          <TableCell>{allBenefits.find(b => b.id === app.benefit_id)?.title || '不明'}</TableCell>
                          <TableCell>{safeFormat(app.request_date, 'yyyy/M/d')}</TableCell>
                          <TableCell>{safeFormat(app.created_date, 'M/d HH:mm')}</TableCell>
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
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEditBenefitApp(app)}>
                                <Edit className="w-4 h-4" />
                              </Button>
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
            </div>
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
            <div>
              <Label>募集状態 *</Label>
              <Select value={shiftForm.status} onValueChange={(v) => setShiftForm({...shiftForm, status: v})}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="状態を選択">
                    {shiftForm.status === 'open' ? '募集中' : shiftForm.status === 'filled' ? '募集終了' : shiftForm.status === 'cancelled' ? '募集停止' : '状態を選択'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">募集中</SelectItem>
                  <SelectItem value="filled">募集終了</SelectItem>
                  <SelectItem value="cancelled">募集停止</SelectItem>
                </SelectContent>
              </Select>
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
            <div>
              <Label>承認ステータス *</Label>
              <Select value={staffForm.approval_status} onValueChange={(v) => setStaffForm({...staffForm, approval_status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">承認待ち</SelectItem>
                  <SelectItem value="approved">承認済み</SelectItem>
                  <SelectItem value="rejected">却下</SelectItem>
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
            <DialogTitle>{editingAnnouncement ? 'お知らせ編集' : '新規お知らせ'}</DialogTitle>
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
            <Button onClick={handleSubmitAnnouncement} className="bg-[#2D4A6F]">
              {editingAnnouncement ? '更新' : '投稿'}
            </Button>
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

      {/* Service Dialog */}
      <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingService ? 'サービス編集' : '新規サービス作成'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>サービス名 *</Label>
              <Input value={serviceForm.title} onChange={(e) => setServiceForm({...serviceForm, title: e.target.value})} />
            </div>
            <div>
              <Label>説明 *</Label>
              <Textarea value={serviceForm.description} onChange={(e) => setServiceForm({...serviceForm, description: e.target.value})} className="h-24" />
            </div>
            <div>
              <Label>アイコン名（Lucide React）*</Label>
              <Input value={serviceForm.icon} onChange={(e) => setServiceForm({...serviceForm, icon: e.target.value})} placeholder="Heart, Truck, Flower2など" />
            </div>
            <div>
              <Label>背景カラークラス *</Label>
              <Input value={serviceForm.color} onChange={(e) => setServiceForm({...serviceForm, color: e.target.value})} placeholder="bg-[#2D4A6F]" />
            </div>
            <div>
              <Label>表示順序</Label>
              <Input type="number" value={serviceForm.order} onChange={(e) => setServiceForm({...serviceForm, order: Number(e.target.value)})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setServiceDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleSubmitService} className="bg-[#2D4A6F]">
              {editingService ? '更新' : '作成'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <Button onClick={handleSubmitBenefit} className="bg-[#2D4A6F]">
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
                  <span className="font-medium">{safeFormat(editingBenefitApp.request_date, 'yyyy年M月d日')}</span>
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
            <Button onClick={handleSubmitBenefitApp} className="bg-[#2D4A6F]">
              更新
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dice Prize Dialog */}
      <Dialog open={dicePrizeDialogOpen} onOpenChange={setDicePrizeDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingDicePrize ? '賞品編集' : '新規賞品追加'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>サイコロの出目 *</Label>
              <Select 
                value={String(dicePrizeForm.dice_number)} 
                onValueChange={(v) => setDicePrizeForm({...dicePrizeForm, dice_number: Number(v)})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">⚀ 1</SelectItem>
                  <SelectItem value="2">⚁ 2</SelectItem>
                  <SelectItem value="3">⚂ 3</SelectItem>
                  <SelectItem value="4">⚃ 4</SelectItem>
                  <SelectItem value="5">⚄ 5</SelectItem>
                  <SelectItem value="6">⚅ 6</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>賞品名 *</Label>
              <Input 
                value={dicePrizeForm.prize_name} 
                onChange={(e) => setDicePrizeForm({...dicePrizeForm, prize_name: e.target.value})}
                placeholder="例: ラッキーボーナス"
              />
            </div>
            <div>
              <Label>ポイント *</Label>
              <Input 
                type="number" 
                value={dicePrizeForm.points} 
                onChange={(e) => setDicePrizeForm({...dicePrizeForm, points: e.target.value})}
                placeholder="例: 1000"
              />
            </div>
            <div>
              <Label>絵文字</Label>
              <Input 
                value={dicePrizeForm.emoji} 
                onChange={(e) => setDicePrizeForm({...dicePrizeForm, emoji: e.target.value})}
                placeholder="例: 🎁"
                maxLength={2}
              />
            </div>
            <div>
              <Label>背景カラークラス *</Label>
              <Select 
                value={dicePrizeForm.color.startsWith('bg-gradient') ? 'custom' : dicePrizeForm.color}
                onValueChange={(v) => {
                  if (v !== 'custom') {
                    setDicePrizeForm({...dicePrizeForm, color: v});
                  }
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bg-gradient-to-br from-purple-400 to-pink-400">💜 紫→ピンク</SelectItem>
                  <SelectItem value="bg-gradient-to-br from-blue-400 to-cyan-400">💙 青→水色</SelectItem>
                  <SelectItem value="bg-gradient-to-br from-green-400 to-emerald-400">💚 緑→エメラルド</SelectItem>
                  <SelectItem value="bg-gradient-to-br from-yellow-400 to-orange-400">💛 黄→オレンジ</SelectItem>
                  <SelectItem value="bg-gradient-to-br from-red-400 to-pink-400">❤️ 赤→ピンク</SelectItem>
                  <SelectItem value="bg-gradient-to-br from-indigo-400 to-purple-400">🔮 インディゴ→紫</SelectItem>
                  <SelectItem value="custom">🎨 カスタム</SelectItem>
                </SelectContent>
              </Select>
              {(dicePrizeForm.color.startsWith('bg-gradient') && !['bg-gradient-to-br from-purple-400 to-pink-400', 'bg-gradient-to-br from-blue-400 to-cyan-400', 'bg-gradient-to-br from-green-400 to-emerald-400', 'bg-gradient-to-br from-yellow-400 to-orange-400', 'bg-gradient-to-br from-red-400 to-pink-400', 'bg-gradient-to-br from-indigo-400 to-purple-400'].includes(dicePrizeForm.color)) && (
                <div className="mt-2">
                  <Label className="text-xs text-slate-500">カスタムカラー</Label>
                  <Input 
                    value={dicePrizeForm.color} 
                    onChange={(e) => setDicePrizeForm({...dicePrizeForm, color: e.target.value})}
                    placeholder="bg-gradient-to-br from-purple-400 to-pink-400"
                  />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="checkbox"
                checked={dicePrizeForm.is_active}
                onChange={(e) => setDicePrizeForm({...dicePrizeForm, is_active: e.target.checked})}
                className="w-4 h-4"
              />
              <Label>有効にする</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDicePrizeDialogOpen(false)}>キャンセル</Button>
            <Button 
              onClick={handleSubmitDicePrize} 
              className="bg-purple-600 hover:bg-purple-700"
              disabled={!dicePrizeForm.prize_name || !dicePrizeForm.points}
            >
              {editingDicePrize ? '更新' : '追加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Broadcast Message Dialog */}
      <Dialog open={broadcastDialogOpen} onOpenChange={setBroadcastDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>一斉メッセージ送信</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>送信対象 *</Label>
              <Select value={broadcastForm.target} onValueChange={(v) => setBroadcastForm({...broadcastForm, target: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全スタッフ</SelectItem>
                  <SelectItem value="role">職種指定</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {broadcastForm.target === 'role' && (
              <div>
                <Label>職種選択 *</Label>
                <Select value={broadcastForm.targetRole} onValueChange={(v) => setBroadcastForm({...broadcastForm, targetRole: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全職種</SelectItem>
                    <SelectItem value="admin">管理者</SelectItem>
                    <SelectItem value="full_time">正社員</SelectItem>
                    <SelectItem value="part_time">パート</SelectItem>
                    <SelectItem value="temporary">単発</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div>
              <Label>対象人数</Label>
              <div className="p-3 bg-slate-50 rounded-lg">
                <span className="text-2xl font-bold text-[#2D4A6F]">
                  {broadcastForm.target === 'all' 
                    ? allStaff.length 
                    : broadcastForm.targetRole === 'all'
                      ? allStaff.length
                      : allStaff.filter(s => s.role === broadcastForm.targetRole).length
                  }名
                </span>
              </div>
            </div>
            
            <div>
              <Label>メッセージ内容 *</Label>
              <Textarea
                value={broadcastForm.content}
                onChange={(e) => setBroadcastForm({...broadcastForm, content: e.target.value})}
                placeholder="全スタッフに送信するメッセージを入力してください"
                className="h-32"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBroadcastDialogOpen(false)}>キャンセル</Button>
            <Button 
              onClick={() => broadcastMessageMutation.mutate(broadcastForm)}
              disabled={!broadcastForm.content.trim() || broadcastMessageMutation.isPending}
              className="bg-[#E8A4B8] hover:bg-[#D393A7]"
            >
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
                  <div className="w-12 h-12 rounded-full bg-[#C17A8E] text-white flex items-center justify-center font-bold text-lg">
                    {selectedStaffForTips.full_name[0]}
                  </div>
                  <div>
                    <p className="text-xl">{selectedStaffForTips.full_name}</p>
                    <p className="text-sm font-normal text-slate-500">{selectedStaffForTips.email}</p>
                  </div>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedStaffForTips && (() => {
            const totalEarned = allTips
              .filter(t => t.user_email === selectedStaffForTips.email && !t.is_deleted)
              .reduce((sum, t) => sum + t.amount, 0);
            const totalPaidOut = allPayouts
              .filter(p => p.user_email === selectedStaffForTips.email && !p.is_deleted)
              .reduce((sum, p) => sum + p.amount, 0);
            const balance = totalEarned - totalPaidOut;

            return (
              <div className="py-4">
                {/* サマリー */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100">
                    <p className="text-sm text-purple-700 mb-1">累計獲得</p>
                    <p className="text-3xl font-bold text-purple-900">
                      {totalEarned.toLocaleString()}pt
                    </p>
                    <p className="text-xs text-purple-600 mt-1">ボーナス基準</p>
                  </Card>
                  <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100">
                    <p className="text-sm text-red-700 mb-1">払い出し済み</p>
                    <p className="text-3xl font-bold text-red-900">
                      {totalPaidOut.toLocaleString()}pt
                    </p>
                    <p className="text-xs text-red-600 mt-1">{allPayouts.filter(p => p.user_email === selectedStaffForTips.email && !p.is_deleted).length}回</p>
                  </Card>
                  <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100">
                    <p className="text-sm text-green-700 mb-1">現在の残高</p>
                    <p className="text-3xl font-bold text-green-900">
                      {balance.toLocaleString()}pt
                    </p>
                    <p className="text-xs text-green-600 mt-1">利用可能</p>
                  </Card>
                </div>

                {/* 履歴タブ */}
                <Tabs defaultValue="tips" className="w-full">
                  <TabsList className="w-full mb-4">
                    <TabsTrigger value="tips" className="flex-1">付与履歴</TabsTrigger>
                    <TabsTrigger value="payouts" className="flex-1">払い出し履歴</TabsTrigger>
                    <TabsTrigger value="deleted" className="flex-1">削除済み</TabsTrigger>
                  </TabsList>

                  <TabsContent value="tips" className="space-y-3 max-h-[400px] overflow-y-auto">
                    {allTips
                      .filter(tip => tip.user_email === selectedStaffForTips.email && !tip.is_deleted)
                      .map((tip) => (
                        <Card key={tip.id} className="p-4 hover:shadow-md transition-shadow border-l-4 border-l-green-400">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="bg-green-50 text-green-700">
                                  {tipTypes.find(t => t.value === tip.tip_type)?.label}
                                </Badge>
                                <span className="text-xs text-slate-500">
                                  {safeFormat(tip.date, 'yyyy/M/d')}
                                </span>
                              </div>
                              <p className="text-sm text-slate-600 mb-2">{tip.reason || '-'}</p>
                              <p className="text-xs text-slate-400">付与者: {tip.given_by || '-'}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="text-2xl font-bold text-green-600">+{tip.amount.toLocaleString()}<span className="text-sm">pt</span></p>
                                <p className="text-xs text-slate-500">¥{tip.amount.toLocaleString()}</p>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => deleteTipMutation.mutate(tip.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    {allTips.filter(t => t.user_email === selectedStaffForTips.email && !t.is_deleted).length === 0 && (
                      <div className="text-center py-12 text-slate-400">
                        <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p>まだポイントが付与されていません</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="payouts" className="space-y-3 max-h-[400px] overflow-y-auto">
                    {allPayouts
                      .filter(payout => payout.user_email === selectedStaffForTips.email && !payout.is_deleted)
                      .map((payout) => (
                        <Card key={payout.id} className="p-4 hover:shadow-md transition-shadow border-l-4 border-l-red-400">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="bg-red-50 text-red-700">
                                  {payout.payout_method === 'cash' ? '現金' : 
                                   payout.payout_method === 'bank_transfer' ? '銀行振込' : 'その他'}
                                </Badge>
                                <span className="text-xs text-slate-500">
                                  {safeFormat(payout.date, 'yyyy/M/d')}
                                </span>
                              </div>
                              <p className="text-sm text-slate-600 mb-2">{payout.reason || '-'}</p>
                              <p className="text-xs text-slate-400">処理者: {payout.processed_by || '-'}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="text-2xl font-bold text-red-600">-{payout.amount.toLocaleString()}<span className="text-sm">pt</span></p>
                                <p className="text-xs text-slate-500">¥{payout.amount.toLocaleString()}</p>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => deletePayoutMutation.mutate(payout.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    {allPayouts.filter(p => p.user_email === selectedStaffForTips.email && !p.is_deleted).length === 0 && (
                      <div className="text-center py-12 text-slate-400">
                        <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p>まだ払い出しはありません</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="deleted" className="space-y-3 max-h-[400px] overflow-y-auto">
                    {/* 削除済み付与 */}
                    {allTips
                      .filter(tip => tip.user_email === selectedStaffForTips.email && tip.is_deleted)
                      .map((tip) => (
                        <Card key={tip.id} className="p-4 hover:shadow-md transition-shadow bg-slate-50 border-slate-300 opacity-60">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="bg-slate-100">
                                  付与（削除済）
                                </Badge>
                                <Badge variant="outline" className="bg-green-50 text-green-700">
                                  {tipTypes.find(t => t.value === tip.tip_type)?.label}
                                </Badge>
                                <span className="text-xs text-slate-500">
                                  {safeFormat(tip.date, 'yyyy/M/d')}
                                </span>
                              </div>
                              <p className="text-sm text-slate-600 mb-2">{tip.reason || '-'}</p>
                              <p className="text-xs text-slate-400">付与者: {tip.given_by || '-'}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="text-2xl font-bold text-slate-400">+{tip.amount.toLocaleString()}<span className="text-sm">pt</span></p>
                              </div>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => restoreTipMutation.mutate(tip.id)}
                                className="text-green-600 border-green-200 hover:bg-green-50"
                              >
                                復元
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}

                    {/* 削除済み払い出し */}
                    {allPayouts
                      .filter(payout => payout.user_email === selectedStaffForTips.email && payout.is_deleted)
                      .map((payout) => (
                        <Card key={payout.id} className="p-4 hover:shadow-md transition-shadow bg-slate-50 border-slate-300 opacity-60">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="bg-slate-100">
                                  払い出し（削除済）
                                </Badge>
                                <Badge variant="outline" className="bg-red-50 text-red-700">
                                  {payout.payout_method === 'cash' ? '現金' : 
                                   payout.payout_method === 'bank_transfer' ? '銀行振込' : 'その他'}
                                </Badge>
                                <span className="text-xs text-slate-500">
                                  {safeFormat(payout.date, 'yyyy/M/d')}
                                </span>
                              </div>
                              <p className="text-sm text-slate-600 mb-2">{payout.reason || '-'}</p>
                              <p className="text-xs text-slate-400">処理者: {payout.processed_by || '-'}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="text-2xl font-bold text-slate-400">-{payout.amount.toLocaleString()}<span className="text-sm">pt</span></p>
                              </div>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => restorePayoutMutation.mutate(payout.id)}
                                className="text-green-600 border-green-200 hover:bg-green-50"
                              >
                                復元
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}

                    {[...allTips, ...allPayouts].filter(item => 
                      item.user_email === selectedStaffForTips.email && item.is_deleted
                    ).length === 0 && (
                      <div className="text-center py-12 text-slate-400">
                        <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p>削除された履歴はありません</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            );
          })()}
          
          <DialogFooter>
            <Button 
              onClick={() => {
                resetPayoutForm();
                setPayoutForm({
                  ...payoutForm,
                  user_email: selectedStaffForTips?.email || '',
                });
                setStaffTipHistoryDialogOpen(false);
                setPayoutDialogOpen(true);
              }}
              variant="outline"
              className="mr-auto text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              払い出し
            </Button>
            <Button 
              onClick={() => {
                resetTipForm();
                setTipForm({
                  ...tipForm,
                  user_email: selectedStaffForTips?.email || '',
                });
                setStaffTipHistoryDialogOpen(false);
                setTipDialogOpen(true);
              }}
              className="bg-[#C17A8E] hover:bg-[#B06979]"
            >
              <Plus className="w-4 h-4 mr-2" />
              ポイント付与
            </Button>
            <Button variant="outline" onClick={() => setStaffTipHistoryDialogOpen(false)}>
              閉じる
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payout Dialog */}
      <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>ポイント払い出し</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>スタッフ *</Label>
              <Select value={payoutForm.user_email} onValueChange={(v) => setPayoutForm({...payoutForm, user_email: v})}>
                <SelectTrigger><SelectValue placeholder="スタッフを選択" /></SelectTrigger>
                <SelectContent>
                  {allStaff.map(s => (
                    <SelectItem key={s.email} value={s.email}>{s.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {payoutForm.user_email && (() => {
              const earned = allTips.filter(t => t.user_email === payoutForm.user_email && !t.is_deleted).reduce((sum, t) => sum + t.amount, 0);
              const paidOut = allPayouts.filter(p => p.user_email === payoutForm.user_email && !p.is_deleted).reduce((sum, p) => sum + p.amount, 0);
              const balance = earned - paidOut;
              const inputAmount = Number(payoutForm.amount) || 0;
              const isOverBalance = inputAmount > balance;

              return (
                <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border border-slate-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-slate-600">現在の残高</span>
                    <span className="text-2xl font-bold text-green-600">{balance.toLocaleString()}pt</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    累計獲得: {earned.toLocaleString()}pt | 払い出し済み: {paidOut.toLocaleString()}pt
                  </div>
                </div>
              );
            })()}

            <div>
              <Label>払い出し金額（円）*</Label>
              <Input 
                type="number" 
                value={payoutForm.amount} 
                onChange={(e) => setPayoutForm({...payoutForm, amount: e.target.value})}
                placeholder="5000"
                max={payoutForm.user_email ? (() => {
                  const earned = allTips.filter(t => t.user_email === payoutForm.user_email && !t.is_deleted).reduce((sum, t) => sum + t.amount, 0);
                  const paidOut = allPayouts.filter(p => p.user_email === payoutForm.user_email && !p.is_deleted).reduce((sum, p) => sum + p.amount, 0);
                  return earned - paidOut;
                })() : undefined}
              />
              {payoutForm.user_email && Number(payoutForm.amount) > 0 && (() => {
                const earned = allTips.filter(t => t.user_email === payoutForm.user_email && !t.is_deleted).reduce((sum, t) => sum + t.amount, 0);
                const paidOut = allPayouts.filter(p => p.user_email === payoutForm.user_email && !p.is_deleted).reduce((sum, p) => sum + p.amount, 0);
                const balance = earned - paidOut;
                const inputAmount = Number(payoutForm.amount);
                
                if (inputAmount > balance) {
                  return (
                    <p className="text-xs text-red-600 mt-1 font-medium">
                      ❌ 残高不足です（残高: {balance.toLocaleString()}pt）
                    </p>
                  );
                }
                return (
                  <p className="text-xs text-slate-500 mt-1">※1ポイント = 1円として換算されます</p>
                );
              })()}
              {!payoutForm.user_email && (
                <p className="text-xs text-slate-500 mt-1">※1ポイント = 1円として換算されます</p>
              )}
            </div>
            <div>
              <Label>払い出し方法 *</Label>
              <Select value={payoutForm.payout_method} onValueChange={(v) => setPayoutForm({...payoutForm, payout_method: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">現金</SelectItem>
                  <SelectItem value="bank_transfer">銀行振込</SelectItem>
                  <SelectItem value="other">その他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>理由 *</Label>
              <Textarea 
                value={payoutForm.reason} 
                onChange={(e) => setPayoutForm({...payoutForm, reason: e.target.value})}
                placeholder="例：給与振込、現金交換"
                className="h-24"
              />
            </div>
            <div>
              <Label>払い出し日 *</Label>
              <Input 
                type="date" 
                value={payoutForm.date} 
                onChange={(e) => setPayoutForm({...payoutForm, date: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayoutDialogOpen(false)}>キャンセル</Button>
            <Button 
              onClick={() => createPayoutMutation.mutate({
                ...payoutForm,
                amount: Number(payoutForm.amount),
              })} 
              className="bg-red-600 hover:bg-red-700"
              disabled={
                !payoutForm.user_email || 
                !payoutForm.amount || 
                !payoutForm.reason || 
                createPayoutMutation.isPending ||
                (() => {
                  if (!payoutForm.user_email) return false;
                  const earned = allTips.filter(t => t.user_email === payoutForm.user_email && !t.is_deleted).reduce((sum, t) => sum + t.amount, 0);
                  const paidOut = allPayouts.filter(p => p.user_email === payoutForm.user_email && !p.is_deleted).reduce((sum, p) => sum + p.amount, 0);
                  const balance = earned - paidOut;
                  return Number(payoutForm.amount) > balance;
                })()
              }
            >
              払い出し
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attendance Dialog */}
      <Dialog open={attendanceDialogOpen} onOpenChange={setAttendanceDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAttendance ? '勤怠編集' : '勤怠追加'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>スタッフ *</Label>
              <Select value={attendanceForm.user_email} onValueChange={(v) => {
                const staffMember = allStaff.find(s => s.email === v);
                setAttendanceForm({...attendanceForm, user_email: v, user_name: staffMember?.full_name || ''});
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
            {editingAttendance && (
              <Button 
                variant="outline" 
                className="text-red-600 hover:bg-red-50 mr-auto"
                onClick={() => {
                  if (confirm('この勤怠記録を削除してもよろしいですか？')) {
                    deleteAttendanceMutation.mutate(editingAttendance.id);
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                削除
              </Button>
            )}
            <Button variant="outline" onClick={() => setAttendanceDialogOpen(false)}>キャンセル</Button>
            <Button 
              onClick={handleSubmitAttendance} 
              className="bg-[#2D4A6F]"
              disabled={!attendanceForm.user_email || !attendanceForm.date || (createAttendanceMutation.isPending || updateAttendanceMutation.isPending)}
            >
              {editingAttendance ? '更新' : '追加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}