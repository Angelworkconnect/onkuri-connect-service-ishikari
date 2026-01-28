import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Clock, User, Mail, Phone, Calendar, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function StaffApproval() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      if (!u) {
        base44.auth.redirectToLogin();
        return;
      }
      if (u.role === 'admin') {
        setIsAdmin(true);
      }
      const staffList = await base44.entities.Staff.filter({ email: u.email });
      if (staffList.length > 0 && staffList[0].role === 'admin') {
        setIsAdmin(true);
      }
      setUser(u);
    });
  }, []);

  const { data: staffList = [], isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.Staff.list('-created_date', 1000),
    enabled: !!user && isAdmin
  });

  const approveMutation = useMutation({
    mutationFn: (id) => base44.entities.Staff.update(id, { approval_status: 'approved' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (id) => base44.entities.Staff.update(id, { approval_status: 'rejected' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    }
  });

  const pendingStaff = staffList.filter(s => s.approval_status === 'pending');
  const approvedStaff = staffList.filter(s => s.approval_status === 'approved');
  const rejectedStaff = staffList.filter(s => s.approval_status === 'rejected');

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              アクセス権限がありません
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600">この機能は管理者のみ利用できます。</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2D4A6F] mx-auto"></div>
          <p className="mt-4 text-slate-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  const StaffCard = ({ staff, showActions = false }) => (
    <Card key={staff.id}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            <div className="w-12 h-12 rounded-full bg-[#E8A4B8]/20 flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-[#C17A8E]" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-medium text-lg">{staff.full_name}</h3>
                {staff.approval_status === 'pending' && (
                  <Badge className="bg-amber-500">承認待ち</Badge>
                )}
                {staff.approval_status === 'approved' && (
                  <Badge className="bg-green-500">承認済み</Badge>
                )}
                {staff.approval_status === 'rejected' && (
                  <Badge className="bg-red-500">却下</Badge>
                )}
              </div>
              <div className="space-y-1 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {staff.email}
                </div>
                {staff.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {staff.phone}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  申請日: {format(new Date(staff.created_date), 'yyyy年MM月dd日')}
                </div>
              </div>
            </div>
          </div>
          {showActions && (
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => approveMutation.mutate(staff.id)}
                disabled={approveMutation.isPending}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                承認
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => {
                  if (confirm(`${staff.full_name}さんの登録を却下しますか？`)) {
                    rejectMutation.mutate(staff.id);
                  }
                }}
                disabled={rejectMutation.isPending}
              >
                <XCircle className="w-4 h-4 mr-1" />
                却下
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-800">スタッフ承認管理</h1>
          <p className="text-slate-600 mt-1">スタッフ登録申請の承認・却下</p>
        </div>

        {pendingStaff.length > 0 && (
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-amber-900">承認待ちの申請があります</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    {pendingStaff.length}件の登録申請が承認待ちです
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">
              承認待ち ({pendingStaff.length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              承認済み ({approvedStaff.length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              却下 ({rejectedStaff.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingStaff.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-slate-500">
                  承認待ちの申請はありません
                </CardContent>
              </Card>
            ) : (
              pendingStaff.map((staff) => (
                <StaffCard key={staff.id} staff={staff} showActions={true} />
              ))
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-4">
            {approvedStaff.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-slate-500">
                  承認済みのスタッフはいません
                </CardContent>
              </Card>
            ) : (
              approvedStaff.map((staff) => (
                <StaffCard key={staff.id} staff={staff} />
              ))
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4">
            {rejectedStaff.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-slate-500">
                  却下されたスタッフはいません
                </CardContent>
              </Card>
            ) : (
              rejectedStaff.map((staff) => (
                <StaffCard key={staff.id} staff={staff} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}