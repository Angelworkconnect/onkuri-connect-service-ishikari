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
         Eye, EyeOff, Sparkles, Settings, Gift, MessageCircle, Send, Truck, Shield, Brain, Lock, BarChart3, Target
        } from "lucide-react";
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import QRCodeManager from '../components/admin/QRCodeManager';
import SiteSettingsTab from '../components/admin/SiteSettingsTab';
import AttendanceCalendar from '../components/admin/AttendanceCalendar';
import StaffPayrollSummary from '../components/attendance/StaffPayrollSummary';
import HelpRequestManager from '../components/admin/HelpRequestManager';
import StaffListTabComponent from '../components/admin/StaffListTab';
import StaffDialog from '../components/admin/StaffDialog.jsx';
import TipsTab from '../components/admin/TipsTab';
import AdminShiftTabComp from '../components/shift/AdminShiftTab';
import BenefitsTabInline from '../components/admin/BenefitsTabInline';
import MessagesTab from '../components/admin/MessagesTab';
import AnnouncementsTab from '../components/admin/AnnouncementsTab';
import AdminDialogs from '../components/admin/AdminDialogs';
import AnalyticsTab from '../components/analytics/AnalyticsTab';
import ManagementHealthAI from '../components/analytics/ManagementHealthAI';
import TrialToContractAI from '../components/analytics/TrialToContractAI';

import ClientManagementTab from '../components/admin/ClientManagementTab';
import CareBusinessDashboardEmbed from '../components/admin/CareBusinessDashboardEmbed';
import CareAdditionAICard from '../components/admin/CareAdditionAICard';
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
  { value: 'trial', label: '体験' },
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
    qualifications: [],
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
    office_name: '',
    logo_char: '',
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
    show_all_attendance_calendar: false,
    show_all_shift_calendar: false,
    attendance_close_day: 0,
    cta_sub_text: '',
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
      
      // Staff entity admin or any staff member (allow access if staff record exists)
      if (isStaffAdmin || staff) {
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

  // リアルタイム更新（レート制限を避けるため最小限に絞る）
  useEffect(() => {
    const unsub = base44.entities.Staff.subscribe(() => queryClient.invalidateQueries(['admin-staff']));
    return () => unsub();
  }, [queryClient]);

  const { data: shifts = [] } = useQuery({ queryKey: ['admin-shifts'], queryFn: () => base44.entities.Shift.list('-date') });
  const { data: allShiftEntries = [] } = useQuery({ queryKey: ['admin-shift-entries-global'], queryFn: () => base44.entities.ShiftEntry.list('-date') });
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
        office_name: siteSettings.office_name || '',
        logo_char: siteSettings.logo_char || '',
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
        show_all_attendance_calendar: !!siteSettings.show_all_attendance_calendar,
        show_all_shift_calendar: !!siteSettings.show_all_shift_calendar,
        attendance_close_day: siteSettings.attendance_close_day || 0,
        cta_sub_text: siteSettings.cta_sub_text || '',
      });
    }
  }, [siteSettings?.id]);

  const createStaffMutation = useMutation({
    mutationFn: (data) => base44.entities.Staff.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
    },
  });

  const updateStaffMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Staff.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
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
      queryClient.removeQueries(['site-settings']);
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
      last_name: '',
      first_name: '',
      email: '',
      phone: '',
      address: '',
      date_of_birth: '',
      gender: 'other',
      role: 'temporary',
      status: 'active',
      approval_status: 'pending',
      qualifications: [],
      display_in_shift_calendar: true,
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
    // full_nameをスペースで分割して苗字・名前に設定
    const nameParts = (staff.full_name || '').split(' ');
    const lastName = nameParts[0] || '';
    const firstName = nameParts.slice(1).join(' ') || '';
    setStaffForm({
      full_name: staff.full_name || '',
      last_name: lastName,
      first_name: firstName,
      email: staff.email,
      phone: staff.phone || '',
      address: staff.address || '',
      date_of_birth: staff.date_of_birth || '',
      gender: staff.gender || 'other',
      role: staff.role,
      status: staff.status || 'active',
      approval_status: staff.approval_status || 'pending',
      qualifications: staff.qualifications || [],
      display_in_shift_calendar: staff.display_in_shift_calendar !== false,
    });
    setStaffDialogOpen(true);
  };

  const handleSubmitStaff = async (data) => {
    if (editingStaff) {
      await updateStaffMutation.mutateAsync({ id: editingStaff.id, data });
    } else {
      await createStaffMutation.mutateAsync(data);
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
            <div className="bg-white shadow-lg rounded-xl mb-6 p-3">
              {[
                {
                  group: '⚙️ 設定',
                  items: [
                    { value: 'settings', Icon: Settings, label: 'サイト設定' },
                    { value: 'services', Icon: Gift, label: 'サービス' },
                    { value: 'qrcode', Icon: QrCode, label: 'QRコード' },
                  ],
                },
                {
                  group: '👥 スタッフ・利用者',
                  items: [
                    { value: 'staff',   Icon: Users,     label: 'スタッフ' },
                    { value: 'clients', Icon: Users,     label: 'クライアント' },
                  ],
                },
                {
                  group: '📅 シフト・勤怠',
                  items: [
                    { value: 'shift_ai',      Icon: Calendar, label: 'シフト管理' },
                    { value: 'shifts',        Icon: Calendar, label: '単発管理' },
                    { value: 'applications',  Icon: FileText, label: '応募管理' },
                    { value: 'attendance',    Icon: Clock,    label: '勤怠管理' },
                    { value: 'transport',     Icon: Truck,    label: '送迎管理' },
                  ],
                },
                {
                  group: '💬 コミュニケーション',
                  items: [
                    { value: 'announcements', Icon: Bell,          label: 'お知らせ' },
                    { value: 'messages',      Icon: MessageCircle, label: 'メッセージ' },
                    { value: 'help',          Icon: Bell,          label: 'ヘルプ' },
                  ],
                },
                {
                  group: '🎁 福利厚生・特典',
                  items: [
                    { value: 'tips',     Icon: Sparkles, label: 'サンクス' },
                    { value: 'benefits', Icon: Gift,     label: '福利厚生' },
                  ],
                },
                {
                group: '📊 経営・AI',
                items: [
                  { value: 'care',           Icon: BarChart3, label: '経営ダッシュボード' },
                  { value: 'mgmt_health',    Icon: BarChart3, label: '経営健全度AI' },
                  { value: 'analytics',      Icon: Brain,     label: 'スタッフ分析AI' },
                  { value: 'trial_contract', Icon: Target,    label: '体験→契約AI' },
                  { value: 'addition_ai',    Icon: Brain,     label: '加算診断AI' },
                ],
                },
              ].map(({ group, items }) => (
                <div key={group} className="mb-3 last:mb-0">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 px-1">{group}</p>
                  <div className="flex flex-wrap gap-1">
                    {items.map(({ value, Icon: ItemIcon, label }) => (
                      <TabsList key={value} className="h-auto p-0 bg-transparent">
                        <TabsTrigger
                          value={value}
                          className="data-[state=active]:bg-[#2D4A6F] data-[state=active]:text-white text-slate-600 text-xs flex flex-col items-center gap-1 py-2 px-3 h-auto rounded-lg"
                        >
                          <ItemIcon className="w-4 h-4" />
                          <span>{label}</span>
                        </TabsTrigger>
                      </TabsList>
                    ))}
                  </div>
                </div>
              ))}
            </div>

          {/* Site Settings Tab */}
          <TabsContent value="settings">
            <SiteSettingsTab
              settingsForm={settingsForm}
              setSettingsForm={setSettingsForm}
              onSave={() => updateSettingsMutation.mutate(settingsForm)}
              isSaving={updateSettingsMutation.isPending}
            />
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
                            <Link to={createPageUrl('AttendanceApproval')}>
                              <Button className="bg-amber-600 hover:bg-amber-700">
                                <CheckCircle className="w-4 h-4 mr-2" />
                                勤怠承認
                              </Button>
                            </Link>
                            <Link to={createPageUrl('AttendanceClose')}>
                              <Button className="bg-slate-700 hover:bg-slate-800">
                                <Lock className="w-4 h-4 mr-2" />
                                月次締め
                              </Button>
                            </Link>
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
                        <Tabs defaultValue="att-calendar" className="w-full">
                          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-white flex-wrap">
                            <TabsTrigger value="att-calendar" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#2D4A6F] data-[state=active]:bg-transparent px-6 py-3">
                              カレンダー
                            </TabsTrigger>
                            <TabsTrigger value="att-by-date" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#2D4A6F] data-[state=active]:bg-transparent px-6 py-3">
                              日別
                            </TabsTrigger>
                            <TabsTrigger value="att-by-staff" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#2D4A6F] data-[state=active]:bg-transparent px-6 py-3">
                              人別
                            </TabsTrigger>
                            <TabsTrigger value="att-by-month" className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#2D4A6F] data-[state=active]:bg-transparent px-6 py-3">
                              月別統計
                            </TabsTrigger>
                          </TabsList>

                          <TabsContent value="att-calendar" className="p-6">
                            <AttendanceCalendar 
                              attendanceRecords={attendanceRecords} 
                              staff={allStaff}
                              shiftEntries={allShiftEntries}
                            />
                          </TabsContent>

                          <TabsContent value="att-by-date" className="p-6">
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

                          <TabsContent value="att-by-staff" className="p-6">
                            <div className="space-y-6">
                              {getUniqueStaffEmails().map(email => {
                                const staffRecords = attendanceRecords.filter(r => r.user_email === email);
                                const staffInfo = allStaff.find(s => s.email === email);
                                return (
                                  <Card key={email} className="border border-slate-200 overflow-hidden">
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
                                        <div className="flex gap-4 text-sm flex-wrap">
                                          <div className="text-center">
                                            <p className="text-slate-600">出勤日数</p>
                                            <p className="text-xl font-bold text-slate-900">{staffRecords.length}</p>
                                          </div>
                                          <div className="text-center">
                                            <p className="text-slate-600">合計時間</p>
                                            <p className="text-xl font-bold text-[#2D4A6F]">{calculateTotalHours(email)}</p>
                                          </div>
                                          {staffInfo?.monthly_salary > 0 && (
                                            <div className="text-center">
                                              <p className="text-slate-600 text-xs">月給</p>
                                              <p className="text-sm font-bold text-emerald-700">¥{staffInfo.monthly_salary.toLocaleString()}</p>
                                            </div>
                                          )}
                                          {staffInfo?.hourly_wage > 0 && (
                                            <div className="text-center">
                                              <p className="text-slate-600 text-xs">時給</p>
                                              <p className="text-sm font-bold text-emerald-700">¥{staffInfo.hourly_wage.toLocaleString()}</p>
                                            </div>
                                          )}
                                          {staffInfo?.daily_wage > 0 && (
                                            <div className="text-center">
                                              <p className="text-slate-600 text-xs">日給</p>
                                              <p className="text-sm font-bold text-emerald-700">¥{staffInfo.daily_wage.toLocaleString()}</p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <StaffPayrollSummary records={staffRecords} staff={staffInfo} />
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

                          <TabsContent value="att-by-month" className="p-6">
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
                    <AnnouncementsTab announcements={announcements} categoryTypes={categoryTypes}
                      onAdd={() => { resetAnnouncementForm(); setAnnouncementDialogOpen(true); }}
                      onEdit={handleEditAnnouncement}
                      onDelete={(id) => deleteAnnouncementMutation.mutate(id)}
                      safeFormat={safeFormat}
                    />
                  </TabsContent>

                  {/* Tips Tab */}
                  <TabsContent value="tips">
                    <TipsTab
                      allTips={allTips} allStaff={allStaff} dicePrizes={dicePrizes}
                      tipFilterStaff={tipFilterStaff} setTipFilterStaff={setTipFilterStaff}
                      tipFilterType={tipFilterType} setTipFilterType={setTipFilterType}
                      tipFilterMonth={tipFilterMonth} setTipFilterMonth={setTipFilterMonth}
                      onOpenTipDialog={() => { resetTipForm(); setTipDialogOpen(true); }}
                      onOpenDicePrizeDialog={() => { resetDicePrizeForm(); setDicePrizeDialogOpen(true); }}
                      onDeleteTip={(id) => deleteTipMutation.mutate(id)}
                      onEditDicePrize={handleEditDicePrize}
                      onDeleteDicePrize={(id) => deleteDicePrizeMutation.mutate(id)}
                      onOpenStaffHistory={(staff) => { setSelectedStaffForTips(staff); setStaffTipHistoryDialogOpen(true); }}
                    />
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
            <MessagesTab
              user={user} allStaff={allStaff} allMessages={allMessages}
              selectedStaffForMessage={selectedStaffForMessage}
              setSelectedStaffForMessage={setSelectedStaffForMessage}
              messageContent={messageContent} setMessageContent={setMessageContent}
              onSendMessage={handleSendMessage}
              sendPending={sendMessageMutation.isPending}
              onOpenBroadcast={() => setBroadcastDialogOpen(true)}
            />
          </TabsContent>

          {/* Benefits Tab */}
          <TabsContent value="benefits">
            <BenefitsTabInline
              allBenefits={allBenefits} allBenefitApps={allBenefitApps}
              onAddBenefit={() => { resetBenefitForm(); setBenefitDialogOpen(true); }}
              onEditBenefit={handleEditBenefit}
              onDeleteBenefit={(id) => deleteBenefitMutation.mutate(id)}
              onEditApp={handleEditBenefitApp}
              onDeleteApp={(id) => deleteBenefitAppMutation.mutate(id)}
              safeFormat={safeFormat}
            />
          </TabsContent>

          {/* Shift AI Tab */}
          <TabsContent value="shift_ai">
            <AdminShiftTabComp user={user} />
          </TabsContent>

          {/* Clients Tab */}
          <TabsContent value="clients">
            <ClientManagementTab />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <AnalyticsTab />
          </TabsContent>

          {/* Trial Contract AI Tab */}
          <TabsContent value="trial_contract">
            <TrialToContractAI />
          </TabsContent>

          {/* Management Health AI Tab */}
          <TabsContent value="mgmt_health">
            <ManagementHealthAI />
          </TabsContent>

          {/* Care Business Dashboard Tab */}
          <TabsContent value="care">
            <CareBusinessDashboardEmbed />
          </TabsContent>

          {/* Addition AI Tab */}
          <TabsContent value="addition_ai">
            <div className="bg-white rounded-xl shadow p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-[#2D4A6F] flex items-center justify-center mx-auto mb-4">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">加算診断AI</h2>
              <p className="text-slate-500 mb-6">取得可能な介護加算を診断し、収益改善の可能性を可視化します。</p>
              <CareAdditionAICard />
              <a href="/CareAdditionAI" className="block mt-4">
                <Button className="bg-[#2D4A6F] hover:bg-[#1E3A5F] text-white text-lg px-8 py-4 h-auto w-full">
                  加算診断AIを開く →
                </Button>
              </a>
            </div>
          </TabsContent>

                   </Tabs>
                  </div>

      <StaffDialog
        open={staffDialogOpen}
        onOpenChange={setStaffDialogOpen}
        editingStaff={editingStaff}
        onSubmit={handleSubmitStaff}
        onInvite={(email) => inviteStaffMutation.mutate({ email })}
        invitePending={inviteStaffMutation.isPending}
      />

      <AdminDialogs
        shiftDialogOpen={shiftDialogOpen} setShiftDialogOpen={setShiftDialogOpen} editingShift={editingShift} shiftForm={shiftForm} setShiftForm={setShiftForm} handleSubmitShift={handleSubmitShift} serviceTypes={serviceTypes}
        staffDialogOpen={false} setStaffDialogOpen={setStaffDialogOpen} editingStaff={editingStaff} staffForm={staffForm} setStaffForm={setStaffForm} handleSubmitStaff={handleSubmitStaff} inviteStaffMutation={inviteStaffMutation}
        announcementDialogOpen={announcementDialogOpen} setAnnouncementDialogOpen={setAnnouncementDialogOpen} editingAnnouncement={editingAnnouncement} announcementForm={announcementForm} setAnnouncementForm={setAnnouncementForm} handleSubmitAnnouncement={handleSubmitAnnouncement}
        reportDialogOpen={reportDialogOpen} setReportDialogOpen={setReportDialogOpen} reportForm={reportForm} setReportForm={setReportForm} handleGenerateReport={handleGenerateReport} isGeneratingReport={isGeneratingReport}
        tipDialogOpen={tipDialogOpen} setTipDialogOpen={setTipDialogOpen} tipForm={tipForm} setTipForm={setTipForm} allStaff={allStaff} createTipMutation={createTipMutation} resetTipForm={resetTipForm}
        serviceDialogOpen={serviceDialogOpen} setServiceDialogOpen={setServiceDialogOpen} editingService={editingService} serviceForm={serviceForm} setServiceForm={setServiceForm} handleSubmitService={handleSubmitService}
        benefitDialogOpen={benefitDialogOpen} setBenefitDialogOpen={setBenefitDialogOpen} editingBenefit={editingBenefit} benefitForm={benefitForm} setBenefitForm={setBenefitForm} handleSubmitBenefit={handleSubmitBenefit}
        benefitAppDialogOpen={benefitAppDialogOpen} setBenefitAppDialogOpen={setBenefitAppDialogOpen} editingBenefitApp={editingBenefitApp} benefitAppForm={benefitAppForm} setBenefitAppForm={setBenefitAppForm} handleSubmitBenefitApp={handleSubmitBenefitApp} allBenefits={allBenefits} safeFormat={safeFormat}
        dicePrizeDialogOpen={dicePrizeDialogOpen} setDicePrizeDialogOpen={setDicePrizeDialogOpen} editingDicePrize={editingDicePrize} dicePrizeForm={dicePrizeForm} setDicePrizeForm={setDicePrizeForm} handleSubmitDicePrize={handleSubmitDicePrize}
        broadcastDialogOpen={broadcastDialogOpen} setBroadcastDialogOpen={setBroadcastDialogOpen} broadcastForm={broadcastForm} setBroadcastForm={setBroadcastForm} broadcastMessageMutation={broadcastMessageMutation}
        staffTipHistoryDialogOpen={staffTipHistoryDialogOpen} setStaffTipHistoryDialogOpen={setStaffTipHistoryDialogOpen} selectedStaffForTips={selectedStaffForTips} allTips={allTips} allPayouts={allPayouts}
        deleteTipMutation={deleteTipMutation} restoreTipMutation={restoreTipMutation} deletePayoutMutation={deletePayoutMutation} restorePayoutMutation={restorePayoutMutation}
        resetPayoutForm={resetPayoutForm} payoutForm={payoutForm} setPayoutForm={setPayoutForm} setPayoutDialogOpen={setPayoutDialogOpen} setTipDialogOpen={setTipDialogOpen}
        payoutDialogOpen={payoutDialogOpen} createPayoutMutation={createPayoutMutation}
        attendanceDialogOpen={attendanceDialogOpen} setAttendanceDialogOpen={setAttendanceDialogOpen} editingAttendance={editingAttendance} attendanceForm={attendanceForm} setAttendanceForm={setAttendanceForm}
        handleSubmitAttendance={handleSubmitAttendance} createAttendanceMutation={createAttendanceMutation} updateAttendanceMutation={updateAttendanceMutation} deleteAttendanceMutation={deleteAttendanceMutation}
      />
    </div>
  );
}