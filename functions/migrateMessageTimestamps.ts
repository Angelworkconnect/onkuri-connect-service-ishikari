import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * メッセージと通知の既存データを createdAtUtc に移行する
 * 管理者のみ実行可能
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // 管理者チェック
    if (!user || user.role !== 'admin') {
      return Response.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const results = {
      messagesProcessed: 0,
      messagesUpdated: 0,
      notificationsProcessed: 0,
      notificationsUpdated: 0,
      errors: []
    };

    // メッセージのマイグレーション
    try {
      const messages = await base44.asServiceRole.entities.Message.list();
      results.messagesProcessed = messages.length;

      for (const msg of messages) {
        // 既に createdAtUtc がある場合はスキップ
        if (msg.createdAtUtc && msg.createdAtUtc > 0) {
          continue;
        }

        // created_date から変換
        let timestampUtc = 0;
        if (msg.created_date) {
          try {
            const date = new Date(msg.created_date);
            if (!isNaN(date.getTime())) {
              timestampUtc = date.getTime();
            }
          } catch (e) {
            results.errors.push(`Message ${msg.id}: Invalid created_date`);
          }
        }

        // 更新
        if (timestampUtc > 0) {
          await base44.asServiceRole.entities.Message.update(msg.id, {
            createdAtUtc: timestampUtc
          });
          results.messagesUpdated++;
        }
      }
    } catch (error) {
      results.errors.push(`Messages migration error: ${error.message}`);
    }

    // 通知のマイグレーション
    try {
      const notifications = await base44.asServiceRole.entities.Notification.list();
      results.notificationsProcessed = notifications.length;

      for (const notif of notifications) {
        // 既に createdAtUtc がある場合はスキップ
        if (notif.createdAtUtc && notif.createdAtUtc > 0) {
          continue;
        }

        // created_date から変換
        let timestampUtc = 0;
        if (notif.created_date) {
          try {
            const date = new Date(notif.created_date);
            if (!isNaN(date.getTime())) {
              timestampUtc = date.getTime();
            }
          } catch (e) {
            results.errors.push(`Notification ${notif.id}: Invalid created_date`);
          }
        }

        // 更新
        if (timestampUtc > 0) {
          await base44.asServiceRole.entities.Notification.update(notif.id, {
            createdAtUtc: timestampUtc
          });
          results.notificationsUpdated++;
        }
      }
    } catch (error) {
      results.errors.push(`Notifications migration error: ${error.message}`);
    }

    return Response.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Migration error:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});