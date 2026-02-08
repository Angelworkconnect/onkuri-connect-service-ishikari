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
    console.error('[formatMessageTime] Invalid date input:', dateInput);
    return '—';
  }
  
  // 現在時刻（JST）取得
  const nowJST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  
  // メッセージ日時（JST）取得
  const msgJST = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  
  // 日付部分のみ比較用（YYYY-MM-DD形式）
  const nowDateStr = `${nowJST.getFullYear()}-${String(nowJST.getMonth() + 1).padStart(2, '0')}-${String(nowJST.getDate()).padStart(2, '0')}`;
  const msgDateStr = `${msgJST.getFullYear()}-${String(msgJST.getMonth() + 1).padStart(2, '0')}-${String(msgJST.getDate()).padStart(2, '0')}`;
  
  // 時刻部分のフォーマット（HH:mm）
  const hours = String(msgJST.getHours()).padStart(2, '0');
  const minutes = String(msgJST.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;
  
  // 今日の場合 → HH:mm
  if (msgDateStr === nowDateStr) {
    return timeStr;
  }
  
  // 昨日の場合 → 昨日 HH:mm
  const yesterday = new Date(nowJST);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  
  if (msgDateStr === yesterdayStr) {
    return `昨日 ${timeStr}`;
  }
  
  // それ以前 → YYYY/MM/DD HH:mm
  const year = msgJST.getFullYear();
  const month = String(msgJST.getMonth() + 1).padStart(2, '0');
  const day = String(msgJST.getDate()).padStart(2, '0');
  
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