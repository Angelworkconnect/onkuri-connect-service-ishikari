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
  Plus, Calendar, Users, FileText, Megaphone,
  CheckCircle, XCircle, Trash2, Edit, Clock
} from "lucide-react";
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

  useEffect(() => {
    base44.auth.me().then(u => {
      if (u.role !== 'admin') {
        window.location.href = '/';
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

  if (!user || user.role !== 'admin') {
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

      <div className="max-w-6xl mx-auto px-6 -mt-6">
        <Tabs defaultValue="shifts">
          <TabsList className="bg-white shadow-lg p-1 mb-6">
            <TabsTrigger value="shifts" className="data-[state=active]:bg-[#2D4A6F] data-[state=active]:text-white">
              <Calendar className="w-4 h-4 mr-2" />
              シフト管理
            </TabsTrigger>
            <TabsTrigger value="applications" className="data-[state=active]:bg-[#2D4A6F] data-[state=active]:text-white">
              <FileText className="w-4 h-4 mr-2" />
              応募管理
            </TabsTrigger>
            <TabsTrigger value="attendance" className="data-[state=active]:bg-[#2D4A6F] data-[state=active]:text-white">
              <Clock className="w-4 h-4 mr-2" />
              勤怠管理
            </TabsTrigger>
            <TabsTrigger value="announcements" className="data-[state=active]:bg-[#2D4A6F] data-[state=active]:text-white">
              <Megaphone className="w-4 h-4 mr-2" />
              お知らせ
            </TabsTrigger>
          </TabsList>

          {/* Shifts Tab */}
          <TabsContent value="shifts">
            <Card className="border-0 shadow-lg">
              <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-lg font-medium">シフト一覧</h2>
                <Button onClick={() => { resetShiftForm(); setShiftDialogOpen(true); }} className="bg-[#2D4A6F]">
                  <Plus className="w-4 h-4 mr-2" />
                  新規シフト
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>タイトル</TableHead>
                    <TableHead>日時</TableHead>
                    <TableHead>場所</TableHead>
                    <TableHead>種別</TableHead>
                    <TableHead>状態</TableHead>
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
            </Card>
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications">
            <Card className="border-0 shadow-lg">
              <div className="p-6 border-b">
                <h2 className="text-lg font-medium">応募一覧</h2>
              </div>
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
            </Card>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance">
            <Card className="border-0 shadow-lg">
              <div className="p-6 border-b">
                <h2 className="text-lg font-medium">勤怠一覧</h2>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>スタッフ</TableHead>
                    <TableHead>日付</TableHead>
                    <TableHead>出勤</TableHead>
                    <TableHead>退勤</TableHead>
                    <TableHead>状態</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceRecords.slice(0, 50).map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.user_name || record.user_email}</TableCell>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Announcements Tab */}
          <TabsContent value="announcements">
            <Card className="border-0 shadow-lg">
              <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-lg font-medium">お知らせ一覧</h2>
                <Button onClick={() => { resetAnnouncementForm(); setAnnouncementDialogOpen(true); }} className="bg-[#2D4A6F]">
                  <Plus className="w-4 h-4 mr-2" />
                  新規お知らせ
                </Button>
              </div>
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
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Shift Dialog */}
      <Dialog open={shiftDialogOpen} onOpenChange={setShiftDialogOpen}>
        <DialogContent className="max-w-lg">
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
    </div>
  );
}