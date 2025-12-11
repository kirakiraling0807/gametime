export interface User {
  name: string;
  emoji: string;
  color: string;
}

export interface TimeRange {
  start: number; // 0 to 24 (e.g., 14.5 for 14:30)
  end: number;
}

export interface DaySchedule {
  date: string; // ISO format YYYY-MM-DD
  ranges: TimeRange[];
}

export interface UserSchedule {
  userName: string;
  schedules: DaySchedule[];
}

export type Page = 'LOGIN' | 'SCHEDULE' | 'STATS' | 'SETTINGS';

// Pastel & Cute Colors
export const COLORS = [
  '#f87171', // Red
  '#fb923c', // Orange
  '#fbbf24', // Amber
  '#a3e635', // Lime
  '#34d399', // Emerald
  '#22d3ee', // Cyan
  '#60a5fa', // Blue
  '#818cf8', // Indigo
  '#c084fc', // Violet
  '#f472b6', // Pink
  '#fb7185', // Rose
  '#fda4af', // Light Pink
  '#94a3b8', // Slate
  '#d6d3d1', // Stone
  '#ffedd5', // Light Orange
  '#dbeafe', // Light Blue
  '#fae8ff', // Light Purple
  '#ffe4e6', // Light Pink
];

export const EMOJIS = [
  // Hearts (Lots of colors!)
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💖', '💗', '💓', '💞', '💕', '💘', '💝', '❣️', '💌',
  // Cute Animals
  '🐱', '🐶', '🐰', '🐻', '🧸', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐙', '🦄', '🐣', '🐤', '🦋', '🐝', '🐞', '🐌', '🐳', '🐬', '🦔', '🐿️',
  // Food & Sweets
  '🍓', '🍒', '🍑', '🍎', '🍊', '🍋', '🍪', '🍩', '🍰', '🧁', '🍦', '🍨', '🍭', '🍬', '🍫', '🍯', '🍼', '🍕', '🍔', '🍟', '🍱', '🍙',
  // Nature & Weather
  '🌸', '💐', '🌹', '🌷', '🌻', '🌼', '🍀', '🌿', '🌱', '🌵', '🌴', '🍁', '🍂', '🍄', '⭐', '🌟', '✨', '🌙', '☀️', '☁️', '🌈',
  // Objects & Activities
  '🎮', '🎲', '🧩', '🎨', '🧶', '🎈', '🎁', '🎀', '👑', '💎', '🔔', '🎵', '🎶', '📷', '💡', '📚', '✏️'
];