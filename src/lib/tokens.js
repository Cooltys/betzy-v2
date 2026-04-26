// Betzy V2 — design tokens (kept in sync with tailwind.config.js)

export const COLORS = {
  bg: '#0b1120',
  bgDeep: '#060a15',
  card: 'linear-gradient(180deg, #121b2f 0%, #0e1524 100%)',
  text: '#fff',
  text2: '#e2e8f0',
  muted: '#94a3b8',
  muted2: '#64748b',
  amber: '#eab308',
  win: '#22c55e',
  loss: '#ef4444',
  warn: '#f97316',
  purple: '#a855f7',
}

export const AVATAR_PALETTE = ['#eab308', '#f97316', '#ec4899', '#a855f7', '#3b82f6', '#14b8a6', '#84cc16']

export const EMOJI_LIST = ['🎯', '🍺', '🎲', '🐙', '🦊', '🐺', '🐻', '🐸', '🐢', '🦄', '🐱', '👻', '🚀', '⚡', '🔥', '💀', '🎸']

export function colorForName(name) {
  let hash = 0
  for (let i = 0; i < (name || '').length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]
}

export function initialsOf(name) {
  return (name || '?')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/** Error code → Polish user message */
export const ERROR_COPY = {
  auth_required: 'Brak sesji — odśwież stronę',
  room_not_found: 'Nie ma takiego pokoju',
  room_closed: 'Pokój jest zamknięty',
  wrong_password: 'Złe hasło pokoju',
  nick_taken: 'Nick zajęty, wybierz inny',
  question_not_found: 'Pytanie nie istnieje',
  question_not_open: 'To pytanie już nie przyjmuje typów',
  time_expired: 'Czas na typowanie minął',
  invalid_amount: 'Wkład musi być > 0',
  insufficient_balance: 'Za mało punktów',
  invalid_option: 'Nieprawidłowa opcja',
  not_host: 'Tylko host może to zrobić',
  not_member: 'Nie jesteś w tym pokoju',
  already_resolved: 'Pytanie już rozstrzygnięte',
  need_min_2_options: 'Pytanie musi mieć min. 2 opcje',
  player_not_in_room: 'Gracz nie jest w pokoju',
}

export function errorMessage(err) {
  const raw = err?.message || String(err)
  return ERROR_COPY[raw] || raw
}
