import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2 } from "lucide-react";

export default function AnnouncementsTab({ announcements, categoryTypes, onAdd, onEdit, onDelete, safeFormat }) {
  return (
    <Card className="border-0 shadow-lg">
      <div className="p-4 sm:p-6 border-b flex flex-col sm:flex-row gap-3 sm:gap-0 sm:justify-between sm:items-center">
        <h2 className="text-lg font-medium">お知らせ一覧</h2>
        <Button onClick={onAdd} className="bg-[#2D4A6F] w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />新規お知らせ
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
                    <Button variant="ghost" size="icon" onClick={() => onEdit(announcement)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(announcement.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
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