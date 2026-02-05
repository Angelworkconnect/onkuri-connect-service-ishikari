import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Eye, CheckCircle, XCircle, Send, HandIcon } from 'lucide-react';
import { format } from 'date-fns';

const urgencyConfig = {
  low: { label: '低', color: 'bg-blue-100 text-blue-700' },
  medium: { label: '中', color: 'bg-yellow-100 text-yellow-700' },
  high: { label: '高', color: 'bg-orange-100 text-orange-700' },
  urgent: { label: '緊急', color: 'bg-red-100 text-red-700' },
};

export default function HelpRequestManager({ user, allStaff }) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [viewResponsesDialogOpen, setViewResponsesDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    urgency: 'medium',
    status: 'open',
    admin_notes: '',
  });

  const getDefaultMessage = (status) => {
    if (status === 'approved') {
      return '助け合いの精神に心より感謝申し上げます。ありがとうございます。\n業務終了後、人材穴埋めサンクスポイントを付与させて頂きます。';
    } else if (status === 'rejected') {
      return 'ご協力の姿勢に心より感謝申し上げます。';
    }
    return '';
  };

  const [responseForm, setResponseForm] = useState({
    status: 'pending',
    admin_message: '',
  });

  const { data: helpRequests = [] } = useQuery({
    queryKey: ['admin-help-requests'],
    queryFn: () => base44.entities.HelpRequest.list('-created_date'),
  });

  const { data: helpResponses = [] } = useQuery({
    queryKey: ['admin-help-responses'],
    queryFn: () => base44.entities.HelpResponse.list('-created_date'),
  });

  const updateRequestMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.HelpRequest.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-help-requests'] });
      setEditDialogOpen(false);
      resetForm();
    },
  });

  const deleteRequestMutation = useMutation({
    mutationFn: (id) => base44.entities.HelpRequest.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-help-requests'] }),
  });

  const updateResponseMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await base44.entities.HelpResponse.update(id, data);
      
      // 承認時のメッセージ送信
      if (data.status === 'approved') {
        const response = helpResponses.find(r => r.id === id);
        await base44.entities.Announcement.create({
          title: `ヘルプコール承認通知 - ${response.responder_name}様`,
          content: `${data.admin_message || 'ヘルプコールへの挙手ありがとうございました。承認されました。ご協力をお願いいたします。'}`,
          category: 'general',
        });
      }
      
      // 不承認時のメッセージ送信
      if (data.status === 'rejected') {
        const response = helpResponses.find(r => r.id === id);
        await base44.entities.Announcement.create({
          title: `ヘルプコール - ${response.responder_name}様`,
          content: `お気持ちありがとうございます。${data.admin_message || '今回は他の方に依頼させていただくことになりました。'}`,
          category: 'general',
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-help-responses'] });
      setResponseDialogOpen(false);
      setSelectedResponse(null);
    },
  });

  const deleteResponseMutation = useMutation({
    mutationFn: (id) => base44.entities.HelpResponse.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-help-responses'] }),
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      date: '',
      time: '',
      location: '',
      urgency: 'medium',
      status: 'open',
      admin_notes: '',
    });
    setEditingRequest(null);
  };

  const handleEdit = (request) => {
    setEditingRequest(request);
    setFormData({
      title: request.title,
      description: request.description,
      date: request.date,
      time: request.time || '',
      location: request.location || '',
      urgency: request.urgency,
      status: request.status,
      admin_notes: request.admin_notes || '',
    });
    setEditDialogOpen(true);
  };

  const handleSubmit = () => {
    updateRequestMutation.mutate({ id: editingRequest.id, data: formData });
  };

  const handleViewResponses = (request) => {
    setSelectedRequest(request);
    setViewResponsesDialogOpen(true);
  };

  const handleEditResponse = (response) => {
    setSelectedResponse(response);
    setResponseForm({
      status: response.status,
      admin_message: response.admin_message || getDefaultMessage(response.status),
    });
    setResponseDialogOpen(true);
  };

  const handleSubmitResponse = () => {
    updateResponseMutation.mutate({
      id: selectedResponse.id,
      data: responseForm,
    });
  };

  const getResponsesForRequest = (requestId) => {
    return helpResponses.filter(r => r.help_request_id === requestId);
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg">
        <div className="p-6 border-b">
          <h2 className="text-lg font-medium">ヘルプコール依頼一覧</h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>タイトル</TableHead>
                <TableHead>依頼者</TableHead>
                <TableHead>日時</TableHead>
                <TableHead>緊急度</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>挙手数</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {helpRequests.map((request) => {
                const urgency = urgencyConfig[request.urgency] || urgencyConfig.medium;
                const responsesCount = getResponsesForRequest(request.id).length;
                const approvedCount = getResponsesForRequest(request.id).filter(r => r.status === 'approved').length;

                return (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.title}</TableCell>
                    <TableCell>{request.created_by_name}</TableCell>
                    <TableCell>
                      {request.date} {request.time}
                    </TableCell>
                    <TableCell>
                      <Badge className={urgency.color}>{urgency.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={request.status} 
                        onValueChange={(newStatus) => updateRequestMutation.mutate({ id: request.id, data: { status: newStatus } })}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-green-500"></span>
                              オープン
                            </span>
                          </SelectItem>
                          <SelectItem value="closed">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                              クローズ
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {responsesCount}件 ({approvedCount}承認)
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleViewResponses(request)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(request)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteRequestMutation.mutate(request.id)}>
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

      {/* Edit Request Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ヘルプ依頼編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">タイトル *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">詳細内容 *</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="h-24"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">希望日 *</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">希望時間</label>
                <Input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">場所</label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">緊急度</label>
              <Select value={formData.urgency} onValueChange={(v) => setFormData({ ...formData, urgency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">低</SelectItem>
                  <SelectItem value="medium">中</SelectItem>
                  <SelectItem value="high">高</SelectItem>
                  <SelectItem value="urgent">緊急</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">ステータス</label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">オープン</SelectItem>
                  <SelectItem value="closed">クローズ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">管理者メモ</label>
              <Textarea
                value={formData.admin_notes}
                onChange={(e) => setFormData({ ...formData, admin_notes: e.target.value })}
                className="h-20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSubmit} className="bg-red-500 hover:bg-red-600">
              更新
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Responses Dialog */}
      <Dialog open={viewResponsesDialogOpen} onOpenChange={setViewResponsesDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>挙手した人一覧</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <h3 className="font-bold text-lg mb-2">{selectedRequest.title}</h3>
                <p className="text-sm text-slate-600">{selectedRequest.description}</p>
              </div>

              <div className="space-y-3">
                {getResponsesForRequest(selectedRequest.id).length > 0 ? (
                  getResponsesForRequest(selectedRequest.id).map((response) => (
                    <Card key={response.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <HandIcon className="w-5 h-5 text-orange-500" />
                            <span className="font-bold">{response.responder_name}</span>
                            <Badge className={
                              response.status === 'approved' ? 'bg-green-100 text-green-700' :
                              response.status === 'rejected' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            }>
                              {response.status === 'approved' ? '承認済み' :
                               response.status === 'rejected' ? '不承認' :
                               '承認待ち'}
                            </Badge>
                          </div>
                          {response.message && (
                            <p className="text-sm text-slate-600 mb-2">{response.message}</p>
                          )}
                          {response.admin_message && (
                            <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                              <span className="font-medium">管理者メッセージ:</span> {response.admin_message}
                            </div>
                          )}
                          <p className="text-xs text-slate-400 mt-2">
                            {format(new Date(response.created_date), 'yyyy/MM/dd HH:mm')}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditResponse(response)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    まだ挙手した人がいません
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Response Dialog */}
      <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>挙手者の承認/不承認</DialogTitle>
          </DialogHeader>
          {selectedResponse && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="font-bold">{selectedResponse.responder_name}</p>
                {selectedResponse.message && (
                  <p className="text-sm text-slate-600 mt-1">{selectedResponse.message}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">ステータス *</label>
                <Select 
                  value={responseForm.status} 
                  onValueChange={(v) => setResponseForm({ 
                    ...responseForm, 
                    status: v,
                    admin_message: getDefaultMessage(v)
                  })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        審査中
                      </span>
                    </SelectItem>
                    <SelectItem value="approved">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        承認
                      </span>
                    </SelectItem>
                    <SelectItem value="rejected">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        不承認
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">
                  {responseForm.status === 'approved' ? '承認メッセージ（編集可）' : 
                   responseForm.status === 'rejected' ? '不承認メッセージ（編集可）' : 
                   '管理者メッセージ'}
                </label>
                <Textarea
                  value={responseForm.admin_message}
                  onChange={(e) => setResponseForm({ ...responseForm, admin_message: e.target.value })}
                  placeholder="メッセージを入力してください"
                  className="h-36"
                />
                {responseForm.status === 'approved' && (
                  <p className="text-xs text-slate-500 mt-1 bg-green-50 p-2 rounded border border-green-200">
                    💡 デフォルトメッセージ: 助け合いの精神に心より感謝申し上げます。ありがとうございます。業務終了後、人材穴埋めサンクスポイントを付与させて頂きます。
                  </p>
                )}
                {responseForm.status === 'rejected' && (
                  <p className="text-xs text-slate-500 mt-1 bg-red-50 p-2 rounded border border-red-200">
                    💡 デフォルトメッセージ: ご協力の姿勢に心より感謝申し上げます。
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setResponseDialogOpen(false)}>
              キャンセル
            </Button>
            <Button
              onClick={handleSubmitResponse}
              className={
                responseForm.status === 'approved' ? 'bg-green-600 hover:bg-green-700' :
                responseForm.status === 'rejected' ? 'bg-red-600 hover:bg-red-700' :
                'bg-[#2D4A6F]'
              }
            >
              <Send className="w-4 h-4 mr-2" />
              {responseForm.status === 'approved' ? '承認して通知' :
               responseForm.status === 'rejected' ? '不承認として通知' :
               '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}