/**
 * 日時処理の共通ユーティリティ
 * タイムゾーン: Asia/Tokyo (JST) で統一
 */

/**
 * 入力値を Date オブジェクトに正規化
 * @param {string|Date|number|null|undefined} input - 変換する値
 * @returns {Date|null} - 正常な Date または null
 */
export function parseToDate(input) {
  if (!input) return null;
  
  try {
    // すでに Date オブジェクトの場合
    if (input instanceof Date) {
      return isNaN(input.getTime()) ? null : input;
    }
    
    // 数値（UNIX タイムスタンプ）の場合
    if (typeof input === 'number') {
      const date = new Date(input);
      return isNaN(date.getTime()) ? null : date;
    }
    
    // 文字列の場合
    if (typeof input === 'string') {
      const date = new Date(input);
      return isNaN(date.getTime()) ? null : date;
    }
    
    return null;
  } catch (error) {
    console.error('parseToDate error:', error, input);
    return null;
  }
}

/**
 * メッセージの日時を JST で表示用にフォーマット
 * - 今日: HH:mm
 * - 昨日: 昨日 HH:mm
 * - それ以前: YYYY/MM/DD HH:mm
 * 
 * @param {string|Date|number} dateInput - メッセージの日時
 * @returns {string} - フォーマット済み文字列
 */
export function formatMessageTime(dateInput) {
  const date = parseToDate(dateInput);
  
  if (!date) {
    return '—';
  }
  
  const formatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  // 現在時刻（JST）
  const now = new Date();
  const jstNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  
  // メッセージ日時（JST）
  const jstDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  
  // 日付部分のみ比較用
  const nowDateStr = `${jstNow.getFullYear()}-${String(jstNow.getMonth() + 1).padStart(2, '0')}-${String(jstNow.getDate()).padStart(2, '0')}`;
  const msgDateStr = `${jstDate.getFullYear()}-${String(jstDate.getMonth() + 1).padStart(2, '0')}-${String(jstDate.getDate()).padStart(2, '0')}`;
  
  // 昨日の日付
  const yesterday = new Date(jstNow);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  
  // 時刻部分のフォーマット
  const timeFormatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const timeStr = timeFormatter.format(date);
  
  // 今日
  if (msgDateStr === nowDateStr) {
    return timeStr;
  }
  
  // 昨日
  if (msgDateStr === yesterdayStr) {
    return `昨日 ${timeStr}`;
  }
  
  // それ以前
  const parts = formatter.formatToParts(date);
  const year = parts.find(p => p.type === 'year')?.value || '';
  const month = parts.find(p => p.type === 'month')?.value || '';
  const day = parts.find(p => p.type === 'day')?.value || '';
  
  return `${year}/${month}/${day} ${timeStr}`;
}

/**
 * メッセージをソートするための比較用タイムスタンプ取得
 * @param {Object} message - メッセージオブジェクト
 * @returns {number} - UNIX タイムスタンプ（ミリ秒）
 */
export function getMessageTimestamp(message) {
  const date = parseToDate(message.created_date || message.updated_date);
  return date ? date.getTime() : 0;
}