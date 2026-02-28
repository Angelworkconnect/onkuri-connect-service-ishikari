import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Plus, Edit, Trash2 } from "lucide-react";

export default function BenefitsTabInline({ allBenefits, allBenefitApps, onAddBenefit, onEditBenefit, onDeleteBenefit, onEditApp, onDeleteApp, safeFormat }) {
  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg">
        <div className="p-4 sm:p-6 border-b flex flex-col sm:flex-row gap-3 sm:gap-0 sm:justify-between sm:items-center">
          <h2 className="text-lg font-medium">福利厚生項目</h2>
          <Button onClick={onAddBenefit} className="bg-[#7CB342] w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />新規福利厚生項目
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
                      <Button variant="ghost" size="icon" onClick={() => onEditBenefit(benefit)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => onDeleteBenefit(benefit.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Card className="border-0 shadow-lg">
        <div className="p-4 sm:p-6 border-b"><h2 className="text-lg font-medium">福利厚生申請一覧</h2></div>
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
                      {app.status === 'approved' ? '承認済み' : app.status === 'rejected' ? '却下' : app.status === 'used' ? '利用済み' : '申請中'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => onEditApp(app)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => onDeleteApp(app.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}