/**
 * 日時処理の共通ユーティリティ（スマホ完全対応版）
 * タイムゾーン: Asia/Tokyo (JST) で統一
 * 
 * 【重要】スマホ対策として以下を禁止：
 * - toLocaleString()
 * - Intl.DateTimeFormat()
 * - date-fns-tz
 * - new Date(ISO文字列) での直接変換
 * 
 * 代わりに、UTC+9時間の手動計算とgetUTC系メソッドを使用
 */

const TIMEZONE_OFFSET_MS = 9 * 60 * 60 * 1000; // JST = UTC+9

/**
 * スマホ対応：UTCミリ秒を手動でJST変換してフォーマット
 * @param {number} utcMs - UTCミリ秒
 * @returns {string} - フォーマット済み日時文字列
 */
function formatUtcMsManual(utcMs) {
  if (typeof utcMs !== 'number' || utcMs <= 0 || isNaN(utcMs)) {
    return '—';
  }

  // JSTに変換（手動で+9時間）
  const jstMs = utcMs + TIMEZONE_OFFSET_MS;
  const date = new Date(jstMs);

  // UTC系メソッドで値を取得（スマホ対応）
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();

  // ゼロ埋め
  const MM = String(month).padStart(2, '0');
  const DD = String(day).padStart(2, '0');
  const HH = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');

  // 今日・昨日判定（JST基準）
  const nowJst = Date.now() + TIMEZONE_OFFSET_MS;
  const nowDate = new Date(nowJst);
  const todayStart = Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), nowDate.getUTCDate());
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  const messageStart = Date.UTC(year, month - 1, day);

  if (messageStart === todayStart) {
    return `${HH}:${mm}`;
  } else if (messageStart === yesterdayStart) {
    return `昨日 ${HH}:${mm}`;
  } else {
    return `${year}/${MM}/${DD} ${HH}:${mm}`;
  }
}

/**
 * UTC ミリ秒タイムスタンプから JST 表示用にフォーマット
 * - 今日: HH:mm
 * - 昨日: 昨日 HH:mm
 * - それ以前: YYYY/MM/DD HH:mm
 * 
 * スマホWebView/OSロケール依存を排除するため、完全手動フォーマット
 * 
 * @param {number} timestampMs - UTC基準のUNIXタイムスタンプ（ミリ秒）
 * @returns {string} - フォーマット済み文字列
 */
export function formatMessageTimeFromUtc(timestampMs) {
  return formatUtcMsManual(timestampMs);
}

/**
 * スマホ対応：レコードからUTCミリ秒を取得
 * 後方互換性のため、createdAtUtc → 旧フィールドの順で確認
 * 
 * @param {Object} record - Message/Notification/HelpRequest/HelpResponse等
 * @returns {number} - UTCタイムスタンプ（ミリ秒）、無効なら0
 */
export function getTimestampUtc(record) {
  if (!record) return 0;

  // 新フィールド優先
  if (record.createdAtUtc && typeof record.createdAtUtc === 'number' && record.createdAtUtc > 0) {
    return record.createdAtUtc;
  }

  // 旧データの後方互換（スマホ対応：ISO文字列→number変換）
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
        // 無視して次へ
      }
    }
  }

  return 0;
}

/**
 * メッセージをソートするための比較用タイムスタンプ取得
 * @param {Object} message - メッセージオブジェクト
 * @returns {number} - UNIX タイムスタンプ（ミリ秒）
 */
export function getMessageTimestamp(message) {
  return getTimestampUtc(message);
}

/**
 * 入力値を Date オブジェクトに正規化（後方互換用のみ）
 * @param {string|Date|number|null|undefined} input - 変換する値
 * @returns {Date|null} - 正常な Date または null
 */
export function parseToDate(input) {
  if (!input) return null;
  
  try {
    if (input instanceof Date) {
      return isNaN(input.getTime()) ? null : input;
    }
    
    if (typeof input === 'number') {
      const date = new Date(input);
      return isNaN(date.getTime()) ? null : date;
    }
    
    if (typeof input === 'string') {
      const date = new Date(input);
      return isNaN(date.getTime()) ? null : date;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}