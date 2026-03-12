import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Lock, Unlock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

export default function AttendanceClose() {
  const [user, setUser] = useState(null);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [selectedYearMonth, setSelectedYearMonth] = useState(format(new Date(), 'yyyy-MM'));
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
    queryKey: ['attendance-all'],
    queryFn: () => base44.entities.Attendance.list('-date'),
    enabled: !!user,
  });

  const { data: closedMonths = [] } = useQuery({
    queryKey: ['attendance-closed-months'],
    queryFn: () => base44.entities.AttendanceMonthlyClose.list('-year_month'),
    enabled: !!user,
  });

  const closeMonthMutation = useMutation({
    mutationFn: async ({ yearMonth }) => {
      const records = attendanceRecords.filter(r => r.date.startsWith(yearMonth));
      const unapproved = records.filter(r => r.status !== 'approved');
      
      if (unapproved.length > 0) {
        throw new Error(`未承認の勤怠が${unapproved.length}件あります。先に承認してください。`);
      }

      // 勤怠レコードを締める
      await Promise.all(
        records.map(r => base44.entities.Attendance.update(r.id, { 
          month_closed: true,
          closed_year_month: yearMonth 
        }))
      );

      // 締め記録を作成
      return base44.entities.AttendanceMonthlyClose.create({
        year_month: yearMonth,
        closed_by: user.email,
        closed_by_name: user.full_name || user.email,
        total_records: records.length,
        unapproved_count: unapproved.length,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['attendance-all']);
      queryClient.invalidateQueries(['attendance-closed-months']);
      setCloseDialogOpen(false);
      alert('月次締めが完了しました');
    },
    onError: (error) => {
      alert(error.message);
    },
  });

  const reopenMonthMutation = useMutation({
    mutationFn: async (closeRecord) => {
      const records = attendanceRecords.filter(r => r.closed_year_month === closeRecord.year_month);
      
      // 勤怠レコードの締めを解除
      await Promise.all(
        records.map(r => base44.entities.Attendance.update(r.id, { 
          month_closed: false,
          closed_year_month: null
        }))
      );

      // 締め記録を更新
      return base44.entities.AttendanceMonthlyClose.update(closeRecord.id, {
        is_reopened: true,
        reopened_by: user.email,
        reopened_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['attendance-all']);
      queryClient.invalidateQueries(['attendance-closed-months']);
      alert('月次締めを再開しました');
    },
  });

  const handleClose = () => {
    if (!selectedYearMonth) {
      alert('対象年月を選択してください');
      return;
    }
    
    if (!confirm(`${selectedYearMonth}の勤怠を締めますか？\n締め後は編集できなくなります。`)) {
      return;
    }

    closeMonthMutation.mutate({ yearMonth: selectedYearMonth });
  };

  // 月別集計
  const getMonthlyStats = (yearMonth) => {
    const records = attendanceRecords.filter(r => r.date.startsWith(yearMonth));
    const approved = records.filter(r => r.status === 'approved').length;
    const closed = records.filter(r => r.month_closed).length;
    return { total: records.length, approved, closed };
  };

  // 過去6ヶ月分の年月を生成
  const generateRecentMonths = () => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yearMonth = format(date, 'yyyy-MM');
      months.push(yearMonth);
    }
    return months;
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
      <div className="bg-gradient-to-br from-[#2D4A6F] to-[#1E3A5F] text-white">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-light mb-2">勤怠月次締め</h1>
          <p className="text-white/70">月ごとの勤怠を締めてMF給与連携に進みます</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-6 space-y-6">
        {/* 月次締め実行 */}
        <Card className="border-0 shadow-lg p-6">
          <h2 className="text-lg font-medium mb-4">新規月次締め</h2>
          <div className="flex gap-4 items-end">
            <div className="flex-1 max-w-xs">
              <Label>対象年月</Label>
              <Input
                type="month"
                value={selectedYearMonth}
                onChange={(e) => setSelectedYearMonth(e.target.value)}
              />
            </div>
            <Button
              onClick={() => setCloseDialogOpen(true)}
              className="bg-[#2D4A6F]"
              disabled={!selectedYearMonth}
            >
              <Lock className="w-4 h-4 mr-2" />
              月次締めを実行
            </Button>
          </div>
        </Card>

        {/* 月別状況 */}
        <Card className="border-0 shadow-lg">
          <div className="p-6 border-b">
            <h2 className="text-lg font-medium">月別勤怠状況</h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>年月</TableHead>
                  <TableHead>勤怠件数</TableHead>
                  <TableHead>承認済み</TableHead>
                  <TableHead>締め済み</TableHead>
                  <TableHead>状態</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generateRecentMonths().map((yearMonth) => {
                  const stats = getMonthlyStats(yearMonth);
                  const closeRecord = closedMonths.find(c => c.year_month === yearMonth && !c.is_reopened);
                  const isClosed = stats.closed === stats.total && stats.total > 0;

                  return (
                    <TableRow key={yearMonth}>
                      <TableCell className="font-medium">{yearMonth}</TableCell>
                      <TableCell>{stats.total}件</TableCell>
                      <TableCell>{stats.approved}件</TableCell>
                      <TableCell>{stats.closed}件</TableCell>
                      <TableCell>
                        {isClosed ? (
                          <Badge className="bg-slate-100 text-slate-600">
                            <Lock className="w-3 h-3 mr-1" />
                            締め済み
                          </Badge>
                        ) : stats.total === 0 ? (
                          <Badge variant="outline" className="text-slate-400">データなし</Badge>
                        ) : stats.approved < stats.total ? (
                          <Badge className="bg-amber-100 text-amber-700">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            未承認あり
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-100 text-blue-600">承認完了・未締め</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isClosed && closeRecord && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (confirm(`${yearMonth}の締めを再開しますか？\n編集可能になります。`)) {
                                reopenMonthMutation.mutate(closeRecord);
                              }
                            }}
                          >
                            <Unlock className="w-4 h-4 mr-1" />
                            再開
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* 締め履歴 */}
        <Card className="border-0 shadow-lg">
          <div className="p-6 border-b">
            <h2 className="text-lg font-medium">締め履歴</h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>年月</TableHead>
                  <TableHead>実行者</TableHead>
                  <TableHead>実行日時</TableHead>
                  <TableHead>件数</TableHead>
                  <TableHead>状態</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {closedMonths.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.year_month}</TableCell>
                    <TableCell>{record.closed_by_name}</TableCell>
                    <TableCell>{format(new Date(record.created_date), 'yyyy/MM/dd HH:mm')}</TableCell>
                    <TableCell>{record.total_records}件</TableCell>
                    <TableCell>
                      {record.is_reopened ? (
                        <Badge variant="outline" className="text-amber-600">再開済み</Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-600">締め済み</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* 締め確認ダイアログ */}
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>月次締め確認</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-700">
              {selectedYearMonth}の勤怠を締めます。
            </p>
            <p className="text-sm text-slate-500 mt-2">
              ※承認済みの勤怠のみ締められます<br />
              ※締め後は編集できなくなります
            </p>
            {selectedYearMonth && (
              <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-600">対象勤怠数:</span>
                    <span className="font-medium">{getMonthlyStats(selectedYearMonth).total}件</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">承認済み:</span>
                    <span className="font-medium">{getMonthlyStats(selectedYearMonth).approved}件</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialogOpen(false)}>
              キャンセル
            </Button>
            <Button
              onClick={handleClose}
              className="bg-[#2D4A6F]"
              disabled={closeMonthMutation.isPending}
            >
              {closeMonthMutation.isPending ? '実行中...' : '締めを実行'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}