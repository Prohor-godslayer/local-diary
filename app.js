function bootDiary(host) {
  const shell = globalThis.LocalShell;
  const eng = globalThis.LocalDiaryEngine;
  const ui = shell.mount({
    id: 'diary', glyph: '📕', label: 'Локальный дневник', accent: '#8eafc9', bottom: 216, right: 16,
  });
  let book = null;
  let view = 'home';
  let draft = [];

  async function load() {
    book = await host.loadChat('book');
    if (!book || !Array.isArray(book.notes)) book = eng.blankDiary();
    book.inject = Object.assign({ secrets: true, memory: true, flash: false, notes: false, codex: false }, book.inject || {});
    await publish();
  }

  let pubGen = 0;
  async function publish() {
    const gen = ++pubGen;
    const names = await host.names();
    if (gen !== pubGen || !book) return;
    host.setContext(eng.promptBlock(book, names));
  }

  async function save() {
    await host.saveChat('book', book);
    await publish();
  }

  function home() {
    ui.setBack(null);
    ui.setTitle('в файле этого чата', 'Дневник');
    const n = book;
    const card = (act, title, count, hint) =>
      '<button type="button" class="lx-card" data-act="go" data-view="' + act + '" style="text-align:left;width:100%"><strong>' +
      title + '</strong><div class="lx-muted">' + count + ' · ' + hint + '</div></button>';
    ui.body.innerHTML =
      '<div class="lx-list">' +
        card('notes', 'Заметки', n.notes.length, 'своими словами') +
        card('secrets', 'Секреты', n.secrets.length, 'уходят в промпт, если включено') +
        card('flash', 'Флешбеки', n.flashbacks.length, 'кусок прошлого') +
        card('codex', 'Кодекс', n.codex.length, 'люди, места, правила') +
        card('memory', 'Меморибук', n.memory.length, 'собирается моделью клиента') +
        card('gear', 'Что отдавать в промпт', '', 'секреты, память, флешбек, заметки, кодекс') +
      '</div>' +
      '<div class="lx-row"><button type="button" class="lx-btn" data-act="export">Скачать файл</button>' +
      '<label class="lx-btn">Вложить файл<input data-act="import" type="file" accept="application/json" hidden></label></div>';
  }

  function editor(kind) {
    const map = {
      notes: ['Заметка', 'notes', 'title'],
      secrets: ['Секрет', 'secrets', ''],
      flash: ['Флешбек', 'flashbacks', 'title'],
      codex: ['Запись кодекса', 'codex', 'title'],
    };
    const spec = map[kind];
    ui.setBack(() => { view = 'home'; render(); });
    ui.setTitle('только этот чат', spec[0]);
    const list = book[spec[1]];
    const esc = shell.esc;
    ui.body.innerHTML =
      (spec[2] ? '<label class="lx-field">Название<input id="lx-d-title" maxlength="80"></label>' : '') +
      (kind === 'codex' ? '<label class="lx-field">Тип<select id="lx-d-type"><option>человек</option><option>место</option><option>вещь</option><option>правило</option></select></label>' : '') +
      '<label class="lx-field">Текст<textarea id="lx-d-text"></textarea></label>' +
      '<button type="button" class="lx-btn primary" data-act="add" data-kind="' + kind + '">Добавить</button>' +
      '<div class="lx-list">' + list.map((item) =>
        '<div class="lx-card"><div class="lx-row"><strong class="lx-grow">' + esc(item.title || item.type || 'запись') + '</strong>' +
        '<button type="button" class="lx-icon" data-act="del" data-kind="' + kind + '" data-id="' + esc(item.id) + '" aria-label="Удалить">×</button></div>' +
        '<div style="white-space:pre-wrap">' + esc(item.text) + '</div></div>'
      ).join('') + '</div>';
  }

  function memoryView() {
    ui.setBack(() => { view = 'home'; render(); });
    ui.setTitle('руками, не по таймеру', 'Меморибук');
    const esc = shell.esc;
    ui.body.innerHTML =
      '<p class="lx-muted">Сборка читает последние реплики и просит уже подключённую модель выписать факты. Пока она думает, лучше не слать новое сообщение в чат.</p>' +
      '<button type="button" class="lx-btn primary" data-act="build">Собрать из чата</button>' +
      (draft.length ? '<div class="lx-muted">Черновик — отметь, что оставить</div>' + draft.map((t, i) =>
        '<label class="lx-card lx-row"><input type="checkbox" data-draft="' + i + '" checked><span>' + esc(t) + '</span></label>'
      ).join('') + '<button type="button" class="lx-btn primary" data-act="keep">Оставить отмеченное</button>' : '') +
      '<div class="lx-list">' + book.memory.map((item) =>
        '<div class="lx-card"><div class="lx-row"><span class="lx-grow">' + esc(item.text) + '</span>' +
        '<button type="button" class="lx-icon" data-act="del" data-kind="memory" data-id="' + esc(item.id) + '">×</button></div></div>'
      ).join('') + '</div>';
  }

  function gear() {
    ui.setBack(() => { view = 'home'; render(); });
    ui.setTitle('в промпт клиента', 'Инжект');
    const i = book.inject;
    const row = (key, label) => '<label class="lx-row"><input type="checkbox" data-inj="' + key + '"' + (i[key] ? ' checked' : '') + '> ' + label + '</label>';
    ui.body.innerHTML = row('secrets', 'Секреты') + row('memory', 'Меморибук') + row('flash', 'Последний флешбек') + row('notes', 'Заметки') + row('codex', 'Кодекс') +
      '<button type="button" class="lx-btn primary" data-act="save-gear">Сохранить</button>';
  }

  function render() {
    if (!book) { ui.body.innerHTML = '<div class="lx-empty">Открой чат.</div>'; return; }
    if (view === 'notes' || view === 'secrets' || view === 'flash' || view === 'codex') return editor(view);
    if (view === 'memory') return memoryView();
    if (view === 'gear') return gear();
    return home();
  }

  ui.body.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.getAttribute('data-act');
    if (act === 'go') { view = el.getAttribute('data-view'); render(); return; }
    if (act === 'add') {
      const kind = el.getAttribute('data-kind');
      const text = ui.body.querySelector('#lx-d-text').value.trim();
      if (!text) { ui.toast('Нужен текст'); return; }
      const titleEl = ui.body.querySelector('#lx-d-title');
      const typeEl = ui.body.querySelector('#lx-d-type');
      const item = { id: eng.uid(), text, ts: Date.now(), title: titleEl ? titleEl.value.trim() : '', type: typeEl ? typeEl.value : '' };
      const key = { notes: 'notes', secrets: 'secrets', flash: 'flashbacks', codex: 'codex' }[kind];
      book[key].unshift(item);
      await save();
      ui.toast('Записано');
      render();
      return;
    }
    if (act === 'del') {
      const kind = el.getAttribute('data-kind');
      const id = el.getAttribute('data-id');
      const key = { notes: 'notes', secrets: 'secrets', flash: 'flashbacks', codex: 'codex', memory: 'memory' }[kind];
      book[key] = book[key].filter((x) => x.id !== id);
      await save();
      render();
      return;
    }
    if (act === 'build') {
      ui.toast('Собираю память…');
      try {
        const names = await host.names();
        const msgs = await host.messages();
        const raw = await host.generate(eng.memoryPrompt(msgs, names));
        draft = eng.parseFacts(raw);
        ui.toast(draft.length ? 'Проверь черновик' : 'Модель не вернула фактов');
      } catch (err) {
        ui.toast('Сборка не вышла: ' + (err && err.message ? err.message : 'ошибка клиента'));
      }
      render();
      return;
    }
    if (act === 'keep') {
      const boxes = ui.body.querySelectorAll('[data-draft]');
      boxes.forEach((box) => {
        if (!box.checked) return;
        const text = draft[Number(box.getAttribute('data-draft'))];
        if (text) book.memory.unshift({ id: eng.uid(), text, ts: Date.now() });
      });
      draft = [];
      await save();
      ui.toast('Память записана в чат');
      render();
      return;
    }
    if (act === 'save-gear') {
      ui.body.querySelectorAll('[data-inj]').forEach((box) => { book.inject[box.getAttribute('data-inj')] = box.checked; });
      await save();
      ui.toast('Сохранено');
      return;
    }
    if (act === 'export') {
      const blob = new Blob([JSON.stringify(book, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'local-diary.json';
      a.click();
      URL.revokeObjectURL(a.href);
    }
  });

  ui.body.addEventListener('change', async (e) => {
    if (!e.target || e.target.getAttribute('data-act') !== 'import' || !e.target.files[0]) return;
    try {
      const data = JSON.parse(await e.target.files[0].text());
      if (!data || !Array.isArray(data.notes)) throw new Error('пусто');
      book = Object.assign(eng.blankDiary(), data);
      await save();
      view = 'home';
      render();
      ui.toast('Файл принят');
    } catch (err) { ui.toast('Файл не подошёл'); }
  });

  host.on('chat', async () => { draft = []; await load(); render(); });
  const open = async () => { await load(); view = 'home'; ui.open(); render(); };
  host.addMenu('Локальный дневник', open);
  shell.listen(shell.win(), 'open-diary', 'local-diary-open', open);
  load();
  return { open, close: () => ui.close() };
}

const LocalDiaryApp = { boot: bootDiary };
globalThis.LocalDiaryApp = LocalDiaryApp;
export { LocalDiaryApp };
