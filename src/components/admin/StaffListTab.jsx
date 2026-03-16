import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Trash2, Mail, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import StaffTaxBadge from '../shift/StaffTaxBadge';
import { TAX_MODE_LABELS, TAX_MODE_COLORS } from '../shift/taxUtils';

const safeFormat = (dateValue, formatStr) => {
  if (!dateValue) return '-';
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return '-';
  return format(d, formatStr);
};

export default function StaffListTab({ allStaff, onEdit, onDelete, onInvite, onAddNew, invitePending }) {
  return (
    <Card className="border-0 shadow-lg">
      <div className="p-4 sm:p-6 border-b flex flex-col sm:flex-row gap-3 sm:gap-0 sm:justify-between sm:items-center">
        <h2 className="text-lg font-medium">スタッフ一覧</h2>
        <Button onClick={onAddNew} className="bg-[#2D4A6F] w-full sm:w-auto">
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
              <TableHead>税制</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>登録日</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allStaff.map((s) => (
              <TableRow key={s.id} className={
                s.status === 'leave' ? 'bg-yellow-50/60' :
                s.status === 'inactive' ? 'bg-slate-100/60 opacity-60' :
                s.qualifications?.length > 0 && s.qualifications.some(q => q !== '無資格')
                  ? 'bg-gradient-to-r from-purple-50/50 via-pink-50/30 to-sky-50/50'
                  : s.gender === 'male' ? 'bg-sky-50/30' : s.gender === 'female' ? 'bg-pink-50/30' : ''
              }>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className={
                      s.gender === 'male' ? 'text-sky-700' :
                      s.gender === 'female' ? 'text-pink-700' : 'text-slate-700'
                    }>{s.full_name}</span>
                    {s.qualifications?.length > 0 && s.qualifications.some(q => q !== '無資格') && (
                      <span className="text-xs">🌈</span>
                    )}
                  </div>
                  {s.qualifications?.filter(q => q !== '無資格').length > 0 && (
                    <div className="flex flex-wrap gap-0.5 mt-0.5">
                      {s.qualifications.filter(q => q !== '無資格').slice(0,3).map(q => (
                        <span key={q} className="text-[10px] bg-indigo-100 text-indigo-700 px-1 rounded">{q}</span>
                      ))}
                      {s.qualifications.filter(q => q !== '無資格').length > 3 && (
                        <span className="text-[10px] text-slate-400">+{s.qualifications.filter(q => q !== '無資格').length - 3}</span>
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell>{s.email}</TableCell>
                <TableCell>{s.phone || '-'}</TableCell>
                <TableCell>
                  <Badge className={
                    s.role === 'admin' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
                    s.role === 'full_time' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                    s.role === 'part_time' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                    'bg-cyan-100 text-cyan-700 border-cyan-200'
                  } variant="outline">
                    {s.role === 'admin' ? '管理者' : s.role === 'full_time' ? '正社員' : s.role === 'part_time' ? 'パート' : '単発'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {s.tax_mode && s.tax_mode !== 'FULL' ? (
                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${TAX_MODE_COLORS[s.tax_mode]}`}>
                      {TAX_MODE_LABELS[s.tax_mode]}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">無制限</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge className={
                      s.status === 'leave' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                      s.status === 'inactive' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                      'bg-emerald-100 text-emerald-700 border-emerald-200'
                    } variant="outline">
                      {s.status === 'leave' ? '🟡 休職中' : s.status === 'inactive' ? '❌ 退職・停止' : '✅ 在籍中'}
                    </Badge>
                    <Badge className={
                      s.approval_status === 'approved' ? 'bg-green-100 text-green-700' :
                      s.approval_status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }>
                      {s.approval_status === 'approved' ? '承認済み' : s.approval_status === 'rejected' ? '却下' : '承認待ち'}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>{safeFormat(s.created_date, 'yyyy/M/d')}</TableCell>
                <TableCell>
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(s)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onInvite(s.email)}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50" disabled={invitePending}>
                      <Mail className="w-4 h-4 mr-1" />
                      招待
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(s.id)}>
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
  );
}