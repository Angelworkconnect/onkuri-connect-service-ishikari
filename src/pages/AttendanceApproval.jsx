import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, XCircle, Clock, Pencil, CalendarDays, Calendar, User, AlarmClock } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import AttendanceEditDialog from "@/components/attendance/AttendanceEditDialog";
import OvertimeApprovalTab from "@/components/attendance/OvertimeApprovalTab";

const calculateWorkMinutes = (clockIn, clockOut, breakMinutes = 0) => {
  if (!clockIn || !clockOut) return 0;
  const [inH, inM] = clockIn.split(':').map(Number);
  const [outH, outM] = clockOut.split(':').map(Number);
  return (outH * 60 + outM) - (inH * 60 + inM) - (breakMinutes || 0);
};

const formatMinutes = (mins) => {
  if (!mins || mins <= 0) return '-';
  return `${Math.floor(mins / 60)}時間${mins % 60}分`;
};

const StatusBadge = ({ status }) => {
  if (status === 'approved') return <Badge className="bg-green-100 text-green-700">承認済</Badge>;
  if (status === 'completed') return <Badge className="bg-yellow-100 text-yellow-700">承認待</Badge>;
  return <Badge className="bg-slate-100 text-slate-600">{status}</Badge>;
};

export default function AttendanceApproval() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      const staffList = await base44.entities.Staff.filter({ email: u.email });
      const admin = u.role === 'admin' || (staffList.length > 0 && staffList[0].role === 'admin');
      // isAdmin と user を同時に確定させてから authReady をセット
      setIsAdmin(admin);
      setUser(u);
      // React のバッチ更新後に authReady を立てる
      setTimeout(() => setAuthReady(true), 0);
    }).catch(() => base44.auth.redirectToLogin());
  }, []);

  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ['attendance-approval', user?.email, String(isAdmin)],
    queryFn: async () => {
      if (isAdmin) {
        return base44.entities.Attendance.list('-date');
      } else {
        return base44.entities.Attendance.filter({ user_email: user.email }, '-date');
      }
    },
    enabled: authReady && !!user,
    staleTime: 0,
  });

  const { data: allStaff = [] } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => base44.entities.Staff.list(),
    enabled: !!user,
  });

  const { data: overtimeRequests = [] } = useQuery({
    queryKey: ['overtime-all'],
    queryFn: () => base44.entities.OvertimeRequest.list('-date'),
    enabled: !!user,
  });

  const approveMutation = useMutation({
    mutationFn: (id) => base44.entities.Attendance.update(id, { status: 'approved' }),
    onSuccess: () => queryClient.invalidateQueries(['attendance-approval']),
  });

  const rejectMutation = useMutation({
    mutationFn: (id) => base44.entities.Attendance.update(id, { status: 'completed' }),
    onSuccess: () => queryClient.invalidateQueries(['attendance-approval']),
  });

  const getStaffName = (email) => allStaff.find(s => s.email === email)?.full_name || email;

  const monthRecords = attendanceRecords.filter(r => r.date?.startsWith(selectedMonth));
  const pendingRecords = attendanceRecords.filter(r => r.status === 'completed' && !r.month_closed);
  const overtimePending = overtimeRequests.filter(r => r.status === 'pending');

  const byDay = useMemo(() => {
    const map = {};
    monthRecords.forEach(r => {
      if (!map[r.date]) map[r.date] = [];
      map[r.date].push(r);
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [monthRecords]);

  const byStaff = useMemo(() => {
    const map = {};
    monthRecords.forEach(r => {
      const key = r.user_email;
      if (!map[key]) map[key] = { name: getStaffName(r.user_email), email: r.user_email, records: [] };
      map[key].records.push(r);
    });
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  }, [monthRecords, allStaff]);

  const ActionButtons = ({ record }) => (
    <div className="flex gap-1 flex-wrap">
      {isAdmin && (
        <Button size="sm" variant="outline" className="text-[#2D4A6F] border-[#2D4A6F]/30" onClick={() => setEditRecord({ ...record, user_name: getStaffName(record.user_email) })}>
          <Pencil className="w-3 h-3 mr-1" />編集
        </Button>
      )}
      {isAdmin && record.status === 'completed' && (
        <>
          <Button size="sm" className="bg-[#7CB342] hover:bg-[#6BA232]" onClick={() => approveMutation.mutate(record.id)}>
            <CheckCircle className="w-3 h-3 mr-1" />承認
          </Button>
          <Button size="sm" variant="outline" className="text-red-500 border-red-200" onClick={() => rejectMutation.mutate(record.id)}>
            <XCircle className="w-3 h-3 mr-1" />差戻
          </Button>
        </>
      )}
    </div>
  );

  const RecordRow = ({ record, showName = true }) => (
    <TableRow key={record.id}>
      {showName && <TableCell className="font-medium">{getStaffName(record.user_email)}</TableCell>}
      <TableCell>{format(new Date(record.date), 'M/d(E)', { locale: ja })}</TableCell>
      <TableCell>{record.clock_in || '-'}</TableCell>
      <TableCell>{record.clock_out || '-'}</TableCell>
      <TableCell>{record.break_minutes || 0}分</TableCell>
      <TableCell>{formatMinutes(calculateWorkMinutes(record.clock_in, record.clock_out, record.break_minutes))}</TableCell>
      <TableCell><StatusBadge status={record.status} /></TableCell>
      <TableCell className="max-w-xs truncate text-xs text-slate-500">{record.correction_reason || '-'}</TableCell>
      {isAdmin && <TableCell><ActionButtons record={record} /></TableCell>}
    </TableRow>
  );

  const TableHeaders = ({ showName = true }) => (
    <TableHeader>
      <TableRow>
        {showName && <TableHead>職員名</TableHead>}
        <TableHead>日付</TableHead>
        <TableHead>出勤</TableHead>
        <TableHead>退勤</TableHead>
        <TableHead>休憩</TableHead>
        <TableHead>労働時間</TableHead>
        <TableHead>状態</TableHead>
        <TableHead>修正理由</TableHead>
        {isAdmin && <TableHead>操作</TableHead>}
      </TableRow>
    </TableHeader>
  );

  if (!user) return <div className="min-h-screen flex items-center justify-center"><div className="text-slate-400">読み込み中...</div></div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-20">
      <AttendanceEditDialog
        record={editRecord}
        open={!!editRecord}
        onClose={() => setEditRecord(null)}
        onSaved={() => queryClient.invalidateQueries(['attendance-approval'])}
      />

      <div className="bg-gradient-to-br from-[#2D4A6F] to-[#1E3A5F] text-white">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-light mb-2">勤怠承認</h1>
          <p className="text-white/70">職員の勤怠を確認・承認します</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-6">
        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="bg-white shadow-lg p-1 mb-6 flex-wrap h-auto gap-1">
            {isAdmin && (
              <TabsTrigger value="daily" className="data-[state=active]:bg-[#2D4A6F] data-[state=active]:text-white">
                <CalendarDays className="w-4 h-4 mr-2" />日別
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="monthly" className="data-[state=active]:bg-[#2D4A6F] data-[state=active]:text-white">
                <Calendar className="w-4 h-4 mr-2" />月別
              </TabsTrigger>
            )}
            <TabsTrigger value="bystaff" className="data-[state=active]:bg-[#2D4A6F] data-[state=active]:text-white">
              <User className="w-4 h-4 mr-2" />{isAdmin ? '人別' : '自分の勤怠'}
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="overtime" className="data-[state=active]:bg-[#2D4A6F] data-[state=active]:text-white">
                <AlarmClock className="w-4 h-4 mr-2" />
                残業申請
                {overtimePending.length > 0 && (
                  <span className="ml-1 bg-yellow-400 text-white text-xs rounded-full px-1.5">{overtimePending.length}</span>
                )}
              </TabsTrigger>
            )}
          </TabsList>

          {/* 月選択（勤怠タブ用） */}
          <div className="flex items-center gap-3 mb-4">
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm shadow-sm"
            />
            {isAdmin && pendingRecords.length > 0 && (
              <Badge className="bg-yellow-100 text-yellow-700 text-sm px-3 py-1">
                勤怠承認待ち {pendingRecords.length}件
              </Badge>
            )}
          </div>

          {/* 管理者のみ: 日別タブ */}
          {isAdmin && (
            <TabsContent value="daily">
              {byDay.length === 0 ? (
                <Card className="border-0 shadow-lg p-10 text-center text-slate-400">この月のデータはありません</Card>
              ) : (
                byDay.map(([date, records]) => (
                  <Card key={date} className="border-0 shadow-lg mb-4">
                    <div className="px-6 py-3 border-b bg-slate-50 flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-[#2D4A6F]" />
                      <span className="font-medium">{format(new Date(date), 'M月d日(E)', { locale: ja })}</span>
                      <span className="text-slate-400 text-sm ml-2">{records.length}件</span>
                      {records.some(r => r.status === 'completed') && (
                        <Badge className="bg-yellow-100 text-yellow-700 text-xs ml-auto">承認待ちあり</Badge>
                      )}
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeaders showName={true} />
                        <TableBody>
                          {records.map(r => <RecordRow key={r.id} record={r} showName={true} />)}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>
          )}

          {/* 管理者のみ: 月別タブ */}
          {isAdmin && (
            <TabsContent value="monthly">
              <Card className="border-0 shadow-lg">
                <div className="px-6 py-4 border-b">
                  <h2 className="font-medium">{selectedMonth.replace('-', '年')}月 全勤怠一覧</h2>
                  <p className="text-sm text-slate-500 mt-1">{monthRecords.length}件</p>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeaders showName={true} />
                    <TableBody>
                      {monthRecords.length === 0 ? (
                        <TableRow><TableCell colSpan={9} className="text-center text-slate-400 py-8">この月のデータはありません</TableCell></TableRow>
                      ) : (
                        monthRecords.map(r => <RecordRow key={r.id} record={r} showName={true} />)
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>
          )}

          {/* 管理者: 人別タブ / 一般: 自分のみ */}
          <TabsContent value="bystaff">
            {isAdmin ? (
              byStaff.length === 0 ? (
                <Card className="border-0 shadow-lg p-10 text-center text-slate-400">この月のデータはありません</Card>
              ) : (
                byStaff.map(({ name, email, records }) => {
                  const totalMins = records.reduce((sum, r) => sum + calculateWorkMinutes(r.clock_in, r.clock_out, r.break_minutes), 0);
                  const pendingCount = records.filter(r => r.status === 'completed').length;
                  return (
                    <Card key={email} className="border-0 shadow-lg mb-4">
                      <div className="px-6 py-3 border-b bg-slate-50 flex items-center gap-3">
                        <User className="w-4 h-4 text-[#2D4A6F]" />
                        <span className="font-medium">{name}</span>
                        <span className="text-slate-400 text-sm">{records.length}日</span>
                        <span className="text-slate-600 text-sm">合計: {formatMinutes(totalMins)}</span>
                        {pendingCount > 0 && (
                          <Badge className="bg-yellow-100 text-yellow-700 text-xs ml-auto">承認待ち {pendingCount}件</Badge>
                        )}
                      </div>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeaders showName={false} />
                          <TableBody>
                            {records.map(r => <RecordRow key={r.id} record={r} showName={false} />)}
                          </TableBody>
                        </Table>
                      </div>
                    </Card>
                  );
                })
              )
            ) : (
              /* 一般スタッフ: 自分のデータのみ */
              <Card className="border-0 shadow-lg">
                <div className="px-6 py-4 border-b bg-slate-50 flex items-center gap-3">
                  <User className="w-4 h-4 text-[#2D4A6F]" />
                  <span className="font-medium">{user?.full_name || user?.email}</span>
                  <span className="text-slate-400 text-sm">{monthRecords.length}日</span>
                  <span className="text-slate-600 text-sm">合計: {formatMinutes(monthRecords.reduce((sum, r) => sum + calculateWorkMinutes(r.clock_in, r.clock_out, r.break_minutes), 0))}</span>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeaders showName={false} />
                    <TableBody>
                      {monthRecords.length === 0 ? (
                        <TableRow><TableCell colSpan={8} className="text-center text-slate-400 py-8">この月のデータはありません</TableCell></TableRow>
                      ) : (
                        monthRecords.map(r => <RecordRow key={r.id} record={r} showName={false} />)
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* 残業申請タブ（管理者のみ） */}
          {isAdmin && (
            <TabsContent value="overtime">
              <OvertimeApprovalTab adminEmail={user?.email} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}