// ============================================
// Utility — Date helpers
// ============================================

export function formatDuration(seconds) {
  if (seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}時間${m.toString().padStart(2, '0')}分`;
  }
  if (m > 0) {
    return `${m}分${s.toString().padStart(2, '0')}秒`;
  }
  return `${s}秒`;
}

export function formatDurationShort(seconds) {
  if (seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? m + 'm' : ''}`;
  return `${m}m`;
}

export function formatTimer(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function formatDate(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  });
}

export function formatDateTime(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleString('ja-JP', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getDateStr(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function isToday(dateStr) {
  return dateStr === getDateStr();
}

export function getProgressPercent(current, total) {
  if (!total || total === 0) return 0;
  return Math.min(100, Math.round((current / total) * 100));
}

export function getTypeIcon(type) {
  const icons = {
    book: '📖',
    video: '🎬',
    print: '📄',
    other: '📝',
  };
  return icons[type] || '📝';
}

export function getTypeLabel(type) {
  const labels = {
    book: '書籍',
    video: '動画',
    print: 'プリント',
    other: 'その他',
  };
  return labels[type] || 'その他';
}

export function getModeIcon(mode) {
  const icons = {
    pomodoro: '🍅',
    timer: '⏱️',
    manual: '✏️',
  };
  return icons[mode] || '⏱️';
}

export function getModeLabel(mode) {
  const labels = {
    pomodoro: 'ポモドーロ',
    timer: 'タイマー',
    manual: '手動入力',
  };
  return labels[mode] || 'タイマー';
}

export function estimateCompletionDate(material) {
  if (!material.totalPages || material.totalPages === 0) return null;
  if (material.currentPage >= material.totalPages) return '完了済み';

  // Calculate average pages per day from logs
  const now = new Date();
  const created = new Date(material.createdAt);
  const daysSinceCreation = Math.max(1, Math.ceil((now - created) / 86400000));
  const pagesPerDay = material.currentPage / daysSinceCreation;

  if (pagesPerDay <= 0) return '未定';

  const remainingPages = material.totalPages - material.currentPage;
  const remainingDays = Math.ceil(remainingPages / pagesPerDay);

  const completionDate = new Date(now);
  completionDate.setDate(completionDate.getDate() + remainingDays);

  return completionDate.toLocaleDateString('ja-JP', {
    month: 'long',
    day: 'numeric',
  }) + '頃';
}
