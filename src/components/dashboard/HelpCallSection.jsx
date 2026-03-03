import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Clock, MapPin, HandIcon, Sparkles, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { generateDisplayTimeText, getDisplayTimeText } from '@/components/utils/datetime';

const urgencyConfig = {
  low: { label: '低', color: 'bg-blue-100 text-blue-700' },
  medium: { label: '中', color: 'bg-yellow-100 text-yellow-700' },
  high: { label: '高', color: 'bg-orange-100 text-orange-700' },
  urgent: { label: '緊急', color: 'bg-red-100 text-red-700' },
};

export default function HelpCallSection({ user }) {
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [expandedRequests, setExpandedRequests] = useState({});
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    urgency: 'medium',
  });

  const [responseMessage, setResponseMessage] = useState('');
  const [myResponsesDialogOpen, setMyResponsesDialogOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const { data: helpRequests = [] } = useQuery({
    queryKey: ['help-requests'],
    queryFn: () => base44.entities.HelpRequest.filter({ status: 'open' }, '-created_date'),
    refetchInterval: 5000,
    staleTime: 0,
  });

  const { data: myResponses = [] } = useQuery({
    queryKey: ['my-help-responses', user?.email],
    queryFn: () => user ? base44.entities.HelpResponse.filter({ responder_email: user.email }, '-created_date') : [],
    enabled: !!user,
  });

  const { data: allApprovedResponses = [] } = useQuery({
    queryKey: ['all-approved-responses'],
    queryFn: () => base44.entities.HelpResponse.filter({ status: 'approved' }, '-created_date'),
    refetchInterval: 5000,
    staleTime: 0,
  });

  const getMyResponseForRequest = (requestId) => {
    return myResponses.find(r => r.help_request_id === requestId);
  };

  const createRequestMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.HelpRequest.create({
        ...data,
        created_by_email: user.email,
        created_by_name: user.full_name || user.email,
        status: 'open',
        createdAtUtc: Date.now(),
        displayTimeText: generateDisplayTimeText()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['help-requests'] });
      setRequestDialogOpen(false);
      setFormData({
        title: '',
        description: '',
        date: '',
        time: '',
        location: '',
        urgency: 'medium',
      });
    },
  });

  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return base44.entities.HelpRequest.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['help-requests'] });
      setEditDialogOpen(false);
      setEditingRequest(null);
    },
  });

  const deleteRequestMutation = useMutation({
    mutationFn: async (id) => {
      return base44.entities.HelpRequest.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['help-requests'] });
    },
  });

  const handleEditRequest = (e, request) => {
    e.stopPropagation();
    setEditingRequest({ ...request });
    setEditDialogOpen(true);
  };

  const handleDeleteRequest = (e, request) => {
    e.stopPropagation();
    if (window.confirm(`「${request.title}」を削除しますか？`)) {
      deleteRequestMutation.mutate(request.id);
    }
  };

  const handleUpdateRequest = () => {
    if (!editingRequest) return;
    const { id, title, description, date, time, location, urgency } = editingRequest;
    updateRequestMutation.mutate({ id, data: { title, description, date, time, location, urgency } });
  };

  const respondMutation = useMutation({
    mutationFn: async ({ requestId, message }) => {
      const response = await base44.entities.HelpResponse.create({
        help_request_id: requestId,
        responder_email: user.email,
        responder_name: user.full_name || user.email,
        message: message || '',
        status: 'pending',
        points_awarded: true,
        createdAtUtc: Date.now(),
        displayTimeText: generateDisplayTimeText()
      });

      await base44.entities.TipRecord.create({
        user_email: user.email,
        user_name: user.full_name || user.email,
        tip_type: 'special_thanks',
        amount: 10,
        reason: 'ヘルプコール挙手ボーナス',
        given_by: 'システム自動付与',
        date: format(new Date(), 'yyyy-MM-dd'),
      });

      return response;
    },
    onSuccess: () => {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
      queryClient.invalidateQueries({ queryKey: ['help-requests'] });
      queryClient.invalidateQueries({ queryKey: ['my-help-responses'] });
      queryClient.invalidateQueries({ queryKey: ['tips'] });
      setResponseDialogOpen(false);
      setResponseMessage('');
      setSelectedRequest(null);
    },
  });

  const handleSubmitRequest = () => {
    createRequestMutation.mutate(formData);
  };

  const handleRespond = (request) => {
    setSelectedRequest(request);
    setResponseDialogOpen(true);
  };

  const handleSubmitResponse = () => {
    if (!selectedRequest) return;
    respondMutation.mutate({
      requestId: selectedRequest.id,
      message: responseMessage,
    });
  };

  const hasResponded = (requestId) => {
    return myResponses.some(r => r.help_request_id === requestId);
  };

  const toggleExpand = (requestId) => {
    setExpandedRequests(prev => ({
      ...prev,
      [requestId]: !prev[requestId]
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center shadow-lg flex-shrink-0">
                <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-800">🆘 人財穴埋め ヘルプコール</h3>
                <p className="text-xs sm:text-sm text-slate-600">急なお願いにみんなで助け合い</p>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                onClick={() => setMyResponsesDialogOpen(true)}
                variant="outline"
                size="sm"
                className="border-orange-300 text-orange-600 hover:bg-orange-50 flex-1 sm:flex-none"
              >
                <HandIcon className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">私の挙手</span>
              </Button>
              <Button
                onClick={() => setRequestDialogOpen(true)}
                size="sm"
                className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-lg flex-1 sm:flex-none text-xs sm:text-sm"
              >
                ヘルプ依頼を作成
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Help Requests List */}
      {helpRequests.length > 0 ? (
        <div className="space-y-4">
          <AnimatePresence>
            {helpRequests.map((request) => {
               const urgency = urgencyConfig[request.urgency] || urgencyConfig.medium;
               const isExpanded = expandedRequests[request.id];
               const responded = hasResponded(request.id);
               const myResponse = getMyResponseForRequest(request.id);
               const isApproved = myResponse?.status === 'approved';
               // 承認済み助っ人が複数いる場合は全員表示
               const approvedResponders = allApprovedResponses.filter(r => r.help_request_id === request.id);
               const isAchieved = approvedResponders.length > 0;

              return (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Card className={`border-0 shadow-md hover:shadow-lg transition-shadow ${isAchieved ? 'ring-2 ring-green-400' : ''}`}>
                    {isAchieved && (
                      <div className="bg-gradient-to-r from-green-400 via-emerald-400 to-teal-500 px-4 py-4 rounded-t-xl">
                        <div className="flex items-center justify-center gap-2 mb-2 flex-wrap">
                          {approvedResponders.map((_, idx) => (
                            <span key={idx} className="text-3xl animate-bounce" style={{ animationDelay: `${idx * 0.1}s` }}>
                              {idx % 3 === 0 ? '🎉' : idx % 3 === 1 ? '⭐' : '✨'}
                            </span>
                          ))}
                        </div>
                        <p className="text-white font-bold text-center text-base sm:text-lg mb-3">
                          ✨ 助っ人さん現れる！✨
                        </p>
                        <div className="bg-white/20 rounded-lg p-3 mb-2">
                          <div className="flex flex-wrap gap-2 justify-center items-center">
                            {approvedResponders.map((responder, idx) => (
                              <div key={responder.id} className="text-center">
                                <p className="text-white font-bold text-lg">
                                  {responder.responder_name} さん
                                </p>
                                {idx < approvedResponders.length - 1 && <span className="text-white mx-2">×</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                        <p className="text-white text-center text-sm sm:text-base opacity-95 font-medium">
                          助け合いの精神をありがとうございます！
                        </p>
                      </div>
                    )}
                    <div className="p-4 sm:p-5">
                      <div className="mb-3">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge className={`${urgency.color} font-medium text-xs`}>
                            {urgency.label}
                          </Badge>
                          {myResponse && (
                            <Badge className={
                              myResponse.status === 'approved' 
                                ? 'bg-green-100 text-green-700 border-green-200' 
                                : myResponse.status === 'rejected' 
                                ? 'bg-red-100 text-red-700 border-red-200' 
                                : 'bg-amber-100 text-amber-700 border-amber-200'
                            } variant="outline">
                              {myResponse.status === 'approved' ? '✅ 承認済' : 
                               myResponse.status === 'rejected' ? '❌ 不承認' : 
                               '⏳ 審査中'}
                            </Badge>
                          )}
                          <span className="text-xs text-slate-500">
                            {getDisplayTimeText(request)}
                          </span>
                        </div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-base sm:text-lg font-bold text-slate-800 mb-2 break-words flex-1">{request.title}</h4>
                          {request.created_by_email === user?.email && (
                            <div className="flex gap-1 flex-shrink-0">
                              <button
                                onClick={(e) => handleEditRequest(e, request)}
                                className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                                title="編集"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => handleDeleteRequest(e, request)}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                title="削除"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mb-1">依頼者：{request.created_by_name || request.created_by_email}</p>
                        <div className="space-y-1 text-sm text-slate-600">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-orange-500 flex-shrink-0" />
                            <span className="break-words">{request.date} {request.time}</span>
                          </div>
                          {request.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0" />
                              <span className="break-words">{request.location}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Description Toggle */}
                      <button
                        onClick={() => toggleExpand(request.id)}
                        className="w-full text-left text-sm text-slate-600 mb-3 hover:text-slate-800 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">詳細内容</span>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="p-4 bg-slate-50 rounded-lg mb-4">
                              <p className="text-sm text-slate-700 whitespace-pre-wrap">{request.description}</p>
                            </div>
                            
                            {myResponse && myResponse.status === 'approved' && (
                              <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                                <p className="text-sm text-green-800 font-medium whitespace-pre-wrap">
                                  {myResponse.admin_message || '助け合いの精神に心より感謝申し上げます。ありがとうございます。\n業務終了後、人材穴埋めサンクスポイントを付与させて頂きます。'}
                                </p>
                              </div>
                            )}
                            
                            {myResponse && myResponse.status === 'rejected' && (
                              <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
                                <p className="text-sm text-red-800 font-medium whitespace-pre-wrap">
                                  {myResponse.admin_message || 'ご協力の姿勢に心より感謝申し上げます。'}
                                </p>
                              </div>
                            )}
                            
                            {myResponse && myResponse.status === 'pending' && (
                              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                                <p className="text-sm text-amber-800">
                                  管理者による審査をお待ちください...
                                </p>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Action Button */}
                      <div className="mt-4">
                        {responded ? (
                          <div className="flex items-center justify-center gap-2 py-2 px-3 sm:px-4 bg-green-50 text-green-700 rounded-lg">
                            <Sparkles className="w-4 h-4 flex-shrink-0" />
                            <span className="font-medium text-sm sm:text-base">挙手済み (+10pt獲得)</span>
                          </div>
                        ) : !isAchieved ? (
                          <Button
                            onClick={() => handleRespond(request)}
                            className="w-full bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 hover:from-yellow-500 hover:via-orange-500 hover:to-red-500 text-white font-bold text-base sm:text-lg py-4 sm:py-6 shadow-xl hover:scale-105 transition-all duration-200"
                          >
                            <motion.div
                              animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                              className="mr-2 sm:mr-3"
                            >
                              <HandIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                            </motion.div>
                            <span>✋ 挙手する！（+10pt）</span>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <Card className="border-0 shadow-sm">
          <div className="p-8 text-center text-slate-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>現在、ヘルプコールはありません</p>
          </div>
        </Card>
      )}

      {/* Create Request Dialog */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>ヘルプ依頼を作成</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">タイトル*</label>
              <Input
                placeholder="例：急遽スタッフが必要です"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">詳細内容*</label>
              <Textarea
                placeholder="詳しい状況をご記入ください"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="h-24"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">希望日*</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">希望時間</label>
                <Input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">場所</label>
              <Input
                placeholder="例：デイサービス"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">緊急度</label>
              <Select value={formData.urgency} onValueChange={(v) => setFormData({ ...formData, urgency: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">低</SelectItem>
                  <SelectItem value="medium">中</SelectItem>
                  <SelectItem value="high">高</SelectItem>
                  <SelectItem value="urgent">緊急</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestDialogOpen(false)}>
              キャンセル
            </Button>
            <Button
              onClick={handleSubmitRequest}
              disabled={!formData.title || !formData.description || !formData.date || createRequestMutation.isPending}
              className="bg-red-500 hover:bg-red-600"
            >
              依頼を作成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* My Responses Dialog */}
      <Dialog open={myResponsesDialogOpen} onOpenChange={setMyResponsesDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>私の挙手一覧</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {myResponses.length > 0 ? (
              myResponses.map((response) => {
                const request = helpRequests.find(r => r.id === response.help_request_id) || 
                  { title: '削除された依頼', description: '', date: '', time: '' };
                
                return (
                  <Card key={response.id} className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-bold text-lg mb-1">{request.title}</h4>
                        <p className="text-sm text-slate-600 mb-2">
                          {request.date} {request.time}
                        </p>
                      </div>
                      <Badge className={
                        response.status === 'approved' 
                          ? 'bg-green-100 text-green-700 border-green-200' 
                          : response.status === 'rejected' 
                          ? 'bg-red-100 text-red-700 border-red-200' 
                          : 'bg-amber-100 text-amber-700 border-amber-200'
                      } variant="outline">
                        {response.status === 'approved' ? '✅ 承認' : 
                         response.status === 'rejected' ? '❌ 不承認' : 
                         '⏳ 審査中'}
                      </Badge>
                    </div>
                    
                    {response.status === 'approved' && (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-3">
                        <p className="text-sm text-green-800 font-medium whitespace-pre-wrap">
                          {response.admin_message || '助け合いの精神に心より感謝申し上げます。ありがとうございます。\n業務終了後、人材穴埋めサンクスポイントを付与させて頂きます。'}
                        </p>
                      </div>
                    )}
                    
                    {response.status === 'rejected' && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-3">
                        <p className="text-sm text-red-800 font-medium whitespace-pre-wrap">
                          {response.admin_message || 'ご協力の姿勢に心より感謝申し上げます。'}
                        </p>
                      </div>
                    )}
                    
                    {response.status === 'pending' && (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-3">
                        <p className="text-sm text-amber-800">
                          管理者による審査をお待ちください...
                        </p>
                      </div>
                    )}
                    
                    {response.message && (
                      <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded">
                        <span className="font-medium">あなたのメッセージ:</span> {response.message}
                      </div>
                    )}
                    
                    <p className="text-xs text-slate-400 mt-3">
                      挙手日時: {getDisplayTimeText(response)}
                    </p>
                  </Card>
                );
              })
            ) : (
              <div className="text-center py-12 text-slate-400">
                <HandIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>まだ挙手していません</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Request Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>ヘルプ依頼を編集</DialogTitle>
          </DialogHeader>
          {editingRequest && (
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">タイトル*</label>
                <Input
                  value={editingRequest.title}
                  onChange={(e) => setEditingRequest({ ...editingRequest, title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">詳細内容*</label>
                <Textarea
                  value={editingRequest.description}
                  onChange={(e) => setEditingRequest({ ...editingRequest, description: e.target.value })}
                  className="h-24"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">希望日*</label>
                  <Input
                    type="date"
                    value={editingRequest.date}
                    onChange={(e) => setEditingRequest({ ...editingRequest, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">希望時間</label>
                  <Input
                    type="time"
                    value={editingRequest.time || ''}
                    onChange={(e) => setEditingRequest({ ...editingRequest, time: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">場所</label>
                <Input
                  value={editingRequest.location || ''}
                  onChange={(e) => setEditingRequest({ ...editingRequest, location: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">緊急度</label>
                <Select value={editingRequest.urgency} onValueChange={(v) => setEditingRequest({ ...editingRequest, urgency: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">低</SelectItem>
                    <SelectItem value="medium">中</SelectItem>
                    <SelectItem value="high">高</SelectItem>
                    <SelectItem value="urgent">緊急</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (window.confirm(`「${editingRequest?.title}」を削除しますか？`)) {
                  deleteRequestMutation.mutate(editingRequest.id);
                  setEditDialogOpen(false);
                  setEditingRequest(null);
                }
              }}
              className="border-red-300 text-red-600 hover:bg-red-50 sm:mr-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              削除する
            </Button>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              キャンセル
            </Button>
            <Button
              onClick={handleUpdateRequest}
              disabled={!editingRequest?.title || !editingRequest?.description || !editingRequest?.date || updateRequestMutation.isPending}
              className="bg-blue-500 hover:bg-blue-600"
            >
              更新する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Response Dialog */}
      <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>挙手する</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {selectedRequest && (
              <div className="p-4 bg-slate-50 rounded-lg mb-4">
                <p className="font-medium text-slate-800 mb-1">{selectedRequest.title}</p>
                <p className="text-sm text-slate-600">
                  {selectedRequest.date} {selectedRequest.time}
                </p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                メッセージ（任意）
              </label>
              <Textarea
                placeholder="一言メッセージがあればご記入ください"
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                className="h-20"
              />
            </div>
            <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-700 font-medium text-center">
                ✨ 挙手で10ptゲット！
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResponseDialogOpen(false)}>
              キャンセル
            </Button>
            <Button
              onClick={handleSubmitResponse}
              disabled={respondMutation.isPending}
              className="bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-white"
            >
              <HandIcon className="w-4 h-4 mr-2" />
              挙手する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}