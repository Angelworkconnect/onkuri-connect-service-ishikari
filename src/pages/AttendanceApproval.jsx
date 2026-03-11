import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle, XCircle, Clock, Pencil } from "lucide-react";
import { format } from "date-fns";
import AttendanceEditDialog from "@/components/attendance/AttendanceEditDialog";

export default function AttendanceApproval() {
  const [user, setUser] = useState(null);
  const [editRecord, setEditRecord] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(async (u) => {
      const staffList = await base44.entities.Staff.filter({ email: u.email });
      const isAdmin = u.role === 'admin' || (staffList.length > 0 && staffList[0].role === 'admin');
      
      if (!isAdmin) {
        alert('管理者のみアクセス可能です');
        window.location.href = '/';
        return;
      }
      setUser(u);
    }).catch(() => {
      base44.auth.redirectToLogin();
    });
  }, []);

  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ['attendance-approval'],
    queryFn: () => base44.entities.Attendance.list('-date'),
    enabled: !!user,
  });

  const { data: allStaff = [] } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => base44.entities.Staff.list(),
    enabled: !!user,
  });

  const approveAttendanceMutation = useMutation({
    mutationFn: (id) => base44.entities.Attendance.update(id, { status: 'approved' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['attendance-approval']);
    },
  });

  const rejectAttendanceMutation = useMutation({
    mutationFn: (id) => base44.entities.Attendance.update(id, { status: 'completed' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['attendance-approval']);
    },
  });

  const getStaffName = (email) => {
    const staff = allStaff.find(s => s.email === email);
    return staff?.full_name || email;
  };

  const calculateWorkHours = (clockIn, clockOut, breakMinutes = 0) => {
    if (!clockIn || !clockOut) return '-';
    const [inH, inM] = clockIn.split(':').map(Number);
    const [outH, outM] = clockOut.split(':').map(Number);
    const totalMinutes = (outH * 60 + outM) - (inH * 60 + inM) - breakMinutes;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}時間${minutes}分`;
  };

  const pendingRecords = attendanceRecords.filter(r => r.status === 'completed' && !r.month_closed);
  const approvedRecords = attendanceRecords.filter(r => r.status === 'approved');

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-20">
      <div className="bg-gradient-to-br from-[#2D4A6F] to-[#1E3A5F] text-white">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-light mb-2">勤怠承認</h1>
          <p className="text-white/70">職員の勤怠を確認・承認します</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-6">
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="bg-white shadow-lg p-1 mb-6">
            <TabsTrigger value="pending" className="data-[state=active]:bg-[#2D4A6F] data-[state=active]:text-white">
              <Clock className="w-4 h-4 mr-2" />
              承認待ち ({pendingRecords.length})
            </TabsTrigger>
            <TabsTrigger value="approved" className="data-[state=active]:bg-[#2D4A6F] data-[state=active]:text-white">
              <CheckCircle className="w-4 h-4 mr-2" />
              承認済み
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card className="border-0 shadow-lg">
              <div className="p-6 border-b">
                <h2 className="text-lg font-medium">承認待ち勤怠</h2>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>職員名</TableHead>
                      <TableHead>日付</TableHead>
                      <TableHead>出勤</TableHead>
                      <TableHead>退勤</TableHead>
                      <TableHead>休憩</TableHead>
                      <TableHead>労働時間</TableHead>
                      <TableHead>備考</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-slate-400 py-8">
                          承認待ちの勤怠はありません
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">{getStaffName(record.user_email)}</TableCell>
                          <TableCell>{format(new Date(record.date), 'M/d')}</TableCell>
                          <TableCell>{record.clock_in || '-'}</TableCell>
                          <TableCell>{record.clock_out || '-'}</TableCell>
                          <TableCell>{record.break_minutes || 0}分</TableCell>
                          <TableCell>{calculateWorkHours(record.clock_in, record.clock_out, record.break_minutes)}</TableCell>
                          <TableCell className="max-w-xs truncate">{record.notes || '-'}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="bg-[#7CB342] hover:bg-[#6BA232]"
                                onClick={() => approveAttendanceMutation.mutate(record.id)}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                承認
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-500 border-red-200 hover:bg-red-50"
                                onClick={() => rejectAttendanceMutation.mutate(record.id)}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                差戻
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="approved">
            <Card className="border-0 shadow-lg">
              <div className="p-6 border-b">
                <h2 className="text-lg font-medium">承認済み勤怠</h2>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>職員名</TableHead>
                      <TableHead>日付</TableHead>
                      <TableHead>出勤</TableHead>
                      <TableHead>退勤</TableHead>
                      <TableHead>休憩</TableHead>
                      <TableHead>労働時間</TableHead>
                      <TableHead>月次締め</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedRecords.slice(0, 50).map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{getStaffName(record.user_email)}</TableCell>
                        <TableCell>{format(new Date(record.date), 'M/d')}</TableCell>
                        <TableCell>{record.clock_in || '-'}</TableCell>
                        <TableCell>{record.clock_out || '-'}</TableCell>
                        <TableCell>{record.break_minutes || 0}分</TableCell>
                        <TableCell>{calculateWorkHours(record.clock_in, record.clock_out, record.break_minutes)}</TableCell>
                        <TableCell>
                          {record.month_closed ? (
                            <Badge className="bg-slate-100 text-slate-600">締め済み</Badge>
                          ) : (
                            <Badge className="bg-blue-100 text-blue-600">未締め</Badge>
                          )}
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
    </div>
  );
}