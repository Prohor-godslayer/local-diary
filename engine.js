// Дневник чата: заметки, секреты, флешбеки, кодекс, меморибук.
// Сборка меморибука только просит текст у модели клиента. В сеть сам дневник не ходит.

function blankDiary() {
  return {
    v: 1,
    notes: [],
    secrets: [],
    flashbacks: [],
    codex: [],
    memory: [],
    inject: { secrets: true, memory: true, flash: false, notes: false, codex: false },
  };
}

function uid(now) {
  return (now || Date.now()).toString(36) + Math.random().toString(36).slice(2, 7);
}

function addItem(list, item) {
  list.unshift(item);
  return item;
}

function memoryPrompt(messages, names) {
  const lines = (messages || []).slice(-40).map((m) => {
    const who = m.role === 'user' ? (names.user || 'Человек') : (m.name || names.char || 'Персонаж');
    return who + ': ' + String(m.text || '').replace(/\s+/g, ' ').slice(0, 420);
  });
  return [
    'Выпиши 4–8 фактов, которые стоит помнить в этой ролевой.',
    'Одна строка — один факт. Без вступления, без нумерации, без слов «промпт» и «модель».',
    'Держись текста. Не выдумывай то, чего в сцене не было.',
    'Фрагмент:',
    lines.join('\n') || '(пусто)',
  ].join('\n');
}

function parseFacts(text) {
  return String(text || '')
    .replace(/<think[\s\S]*?<\/think>/gi, '')
    .split(/\n+/)
    .map((s) => s.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter((s) => s && s.length < 400 && !/(промпт|модель|ассистент)/i.test(s))
    .slice(0, 8);
}

function rows(v) { return Array.isArray(v) ? v : []; }

function promptBlock(diary, names) {
  if (!diary) return '';
  const inj = diary.inject || {};
  const chunks = [];
  const secrets = rows(diary.secrets);
  const memory = rows(diary.memory);
  const flashbacks = rows(diary.flashbacks);
  const notes = rows(diary.notes);
  const codex = rows(diary.codex);
  if (inj.secrets && secrets.length) {
    chunks.push('Секреты, которые персонаж знает, но не обязан проговаривать:\n' + secrets.slice(0, 8).map((s) => '• ' + s.text).join('\n'));
  }
  if (inj.memory && memory.length) {
    chunks.push('Память сцены:\n' + memory.slice(0, 12).map((s) => '• ' + s.text).join('\n'));
  }
  if (inj.flash && flashbacks.length) {
    chunks.push('Флешбек, если уместно:\n' + flashbacks[0].title + ' — ' + flashbacks[0].text);
  }
  if (inj.notes && notes.length) {
    chunks.push('Заметки игрока:\n' + notes.slice(0, 6).map((s) => '• ' + (s.title ? s.title + ': ' : '') + s.text).join('\n'));
  }
  if (inj.codex && codex.length) {
    chunks.push('Кодекс:\n' + codex.slice(0, 8).map((s) => '• ' + (s.title ? s.title + (s.type ? ' (' + s.type + ')' : '') + ': ' : '') + s.text).join('\n'));
  }
  if (!chunks.length) return '';
  return '[Дневник ' + (names.char || 'персонажа') + '. Это память, не реплика.]\n' + chunks.join('\n\n');
}

const LocalDiaryEngine = { blankDiary, uid, addItem, memoryPrompt, parseFacts, promptBlock };
globalThis.LocalDiaryEngine = LocalDiaryEngine;
export { LocalDiaryEngine };
