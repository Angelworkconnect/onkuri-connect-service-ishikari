/**
 * 日時処理の共通ユーティリティ（スマホ完全対応版）
 * 
 * 【重要】スマホ対策として「表示確定済み文字列」方式を採用：
 * - データ保存時にJST文字列を生成して displayTimeText に保存
 * - 表示時は displayTimeText をそのまま表示（変換処理なし）
 * - Date / UTC / timestamp は並び替え専用
 */

const TIMEZONE_OFFSET_MS = 9 * 60 * 60 * 1000; // JST = UTC+9

/**
 * スマホ対応：現在時刻のJST表示文字列を生成
 * データ保存時に呼び出して displayTimeText に格納する
 * 
 * @returns {string} - YYYY/MM/DD HH:mm 形式のJST文字列
 */
export function generateDisplayTimeText() {
  const nowUtc = Date.now();
  const jstMs = nowUtc + TIMEZONE_OFFSET_MS;
  const date = new Date(jstMs);

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');

  return `${year}/${month}/${day} ${hours}:${minutes}`;
}

/**
 * スマホ対応：レコードから表示用文字列を取得
 * displayTimeText があればそのまま返す（推奨）
 * なければ後方互換として createdAtUtc から生成
 * 
 * @param {Object} record - Message/Notification/HelpRequest/HelpResponse等
 * @returns {string} - 表示用日時文字列
 */
export function getDisplayTimeText(record) {
  if (!record) return '—';

  // 推奨：表示確定済み文字列をそのまま返す
  if (record.displayTimeText) {
    return record.displayTimeText;
  }

  // 後方互換：古いデータの場合は変換
  if (record.createdAtUtc && typeof record.createdAtUtc === 'number' && record.createdAtUtc > 0) {
    const jstMs = record.createdAtUtc + TIMEZONE_OFFSET_MS;
    const date = new Date(jstMs);

    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');

    return `${year}/${month}/${day} ${hours}:${minutes}`;
  }

  return '—';
}

/**
 * 並び替え用：レコードからUTCミリ秒を取得
 * @param {Object} record - レコードオブジェクト
 * @returns {number} - UTCタイムスタンプ（ミリ秒）
 */
export function getTimestampUtc(record) {
  if (!record) return 0;

  if (record.createdAtUtc && typeof record.createdAtUtc === 'number' && record.createdAtUtc > 0) {
    return record.createdAtUtc;
  }

  // 後方互換
  const legacyFields = [record.createdAt, record.sentAt, record.updated_date, record.created_date];
  for (const field of legacyFields) {
    if (!field) continue;
    
    if (typeof field === 'number' && field > 0) {
      return field;
    }
    
    if (typeof field === 'string') {
      try {
        const parsed = new Date(field);
        if (!isNaN(parsed.getTime())) {
          return parsed.getTime();
        }
      } catch (e) {
        // 無視
      }
    }
  }

  return 0;
}

/**
 * 後方互換：古い関数名
 * @deprecated getDisplayTimeText() を使用してください
 */
export function formatMessageTimeFromUtc(timestampMs) {
  return getDisplayTimeText({ createdAtUtc: timestampMs });
}

/**
 * 並び替え用：メッセージのタイムスタンプ取得（後方互換）
 * @deprecated getTimestampUtc() を使用してください
 */
export function getMessageTimestamp(message) {
  return getTimestampUtc(message);
}