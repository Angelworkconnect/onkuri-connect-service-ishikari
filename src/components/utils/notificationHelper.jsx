/**
 * 通知作成の共通ユーティリティ
 * 確実にアプリ内通知を作成し、ログを記録する
 */

import { base44 } from '@/api/base44Client';
import { generateDisplayTimeText } from './datetime';

/**
 * 通知を作成する共通関数
 * @param {Object} params - 通知パラメータ
 * @returns {Promise<Object>} - 作成された通知
 */
export async function createNotification({
  userEmail,
  type,
  title,
  content,
  relatedId = null,
  linkUrl = null,
  priority = 'medium',
  eventId = null,
}) {
  const nowUtc = Date.now();
  const displayTime = generateDisplayTimeText();

  try {
    // アプリ内通知を作成
    const notification = await base44.entities.Notification.create({
      user_email: userEmail,
      type,
      title,
      content,
      related_id: relatedId,
      link_url: linkUrl,
      priority,
      is_read: false,
      delivered_push: false,
      event_id: eventId || `${type}_${relatedId}_${nowUtc}`,
      createdAtUtc: nowUtc,
      displayTimeText: displayTime,
    });

    // ログを記録
    await base44.entities.NotificationLog.create({
      notification_id: notification.id,
      event_id: eventId || notification.event_id,
      event_type: type,
      target_user_email: userEmail,
      delivery_method: 'in_app',
      status: 'success',
      in_app_success: true,
      push_success: false,
      createdAtUtc: nowUtc,
    });

    return notification;
  } catch (error) {
    console.error('[Notification Error]', error);
    
    // エラーログを記録
    await base44.entities.NotificationLog.create({
      event_id: eventId || `${type}_${relatedId}_${nowUtc}`,
      event_type: type,
      target_user_email: userEmail,
      delivery_method: 'in_app',
      status: 'failed',
      in_app_success: false,
      push_success: false,
      error_message: error.message,
      createdAtUtc: nowUtc,
    });

    throw error;
  }
}

/**
 * 複数ユーザーに一斉通知を送る
 * @param {Array<string>} userEmails - ユーザーメールアドレスのリスト
 * @param {Object} notificationData - 通知データ
 * @returns {Promise<Array>} - 結果の配列
 */
export async function createBulkNotifications(userEmails, notificationData) {
  const results = [];

  for (const email of userEmails) {
    try {
      const notification = await createNotification({
        ...notificationData,
        userEmail: email,
      });
      results.push({ email, success: true, notification });
    } catch (error) {
      results.push({ email, success: false, error: error.message });
    }
  }

  return results;
}

/**
 * シフト関連通知を作成
 */
export async function notifyShiftUpdate({ userEmail, shift, action = 'updated' }) {
  const actionText = {
    created: '新しいシフトが作成されました',
    updated: 'シフトが更新されました',
    deleted: 'シフトがキャンセルされました',
    confirmed: 'シフトが確定しました',
  };

  return createNotification({
    userEmail,
    type: 'shift',
    title: 'シフト更新',
    content: `${shift.title} - ${actionText[action]}`,
    relatedId: shift.id,
    linkUrl: '/Shifts',
    priority: action === 'deleted' ? 'high' : 'medium',
    eventId: `shift_${action}_${shift.id}_${Date.now()}`,
  });
}

/**
 * お知らせ通知を作成（全員向け）
 */
export async function notifyAnnouncement({ announcement, allStaffEmails }) {
  return createBulkNotifications(allStaffEmails, {
    type: 'announcement',
    title: '新しいお知らせ',
    content: announcement.title,
    relatedId: announcement.id,
    linkUrl: '/Dashboard',
    priority: announcement.category === 'urgent' ? 'high' : 'medium',
    eventId: `announcement_${announcement.id}_${Date.now()}`,
  });
}

/**
 * ヘルプコール通知
 */
export async function notifyHelpRequest({ helpRequest, allStaffEmails, action = 'created' }) {
  const actionText = {
    created: 'ヘルプコールが募集開始されました',
    approved: 'ヘルプコールが承認されました',
    closed: 'ヘルプコールが締め切られました',
  };

  return createBulkNotifications(allStaffEmails, {
    type: 'help_request',
    title: 'ヘルプコール',
    content: `${helpRequest.title} - ${actionText[action]}`,
    relatedId: helpRequest.id,
    linkUrl: '/Dashboard',
    priority: helpRequest.urgency === 'urgent' ? 'high' : 'medium',
    eventId: `help_${action}_${helpRequest.id}_${Date.now()}`,
  });
}

/**
 * ヘルプコール応募結果通知
 */
export async function notifyHelpResponse({ responderEmail, helpRequest, status, adminMessage = '' }) {
  const titles = {
    approved: 'ヘルプコール採用',
    rejected: 'ヘルプコール結果',
  };

  const contents = {
    approved: `${helpRequest.title} - ありがとうございます！今回お願いします`,
    rejected: `${helpRequest.title} - 挙手ありがとうございました！今回は見送りです${adminMessage ? `\n${adminMessage}` : ''}`,
  };

  return createNotification({
    userEmail: responderEmail,
    type: 'help_request',
    title: titles[status],
    content: contents[status],
    relatedId: helpRequest.id,
    linkUrl: '/Dashboard',
    priority: 'medium',
    eventId: `help_response_${status}_${helpRequest.id}_${responderEmail}_${Date.now()}`,
  });
}

/**
 * メッセージ通知
 */
export async function notifyMessage({ receiverEmail, senderName, messageContent, messageId }) {
  const preview = messageContent.length > 50 
    ? messageContent.substring(0, 50) + '...' 
    : messageContent;

  return createNotification({
    userEmail: receiverEmail,
    type: 'message',
    title: `${senderName}からメッセージ`,
    content: preview,
    relatedId: messageId,
    linkUrl: '/Messages',
    priority: 'medium',
    eventId: `message_${messageId}_${Date.now()}`,
  });
}

/**
 * サンクスポイント通知
 */
export async function notifyTipAwarded({ userEmail, amount, reason, tipId }) {
  return createNotification({
    userEmail,
    type: 'tip',
    title: 'サンクスポイント',
    content: `+${amount}pt 付与されました${reason ? `\n理由: ${reason}` : ''}`,
    relatedId: tipId,
    linkUrl: '/TipsHistory',
    priority: 'low',
    eventId: `tip_${tipId}_${Date.now()}`,
  });
}