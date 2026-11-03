(() => {
  const root = $('knowledge-results'), subject = $('knowledge-subject');
  const kind = $('knowledge-kind'), query = $('knowledge-query');
  const sourceMap = new Map(studyLibraryData.sources.map(s => [s.source_id, s]));
  const lists = {cards: studyLibraryData.cards, sources: studyLibraryData.sources,
    exercises: studyLibraryData.exercises, chapters: studyLibraryData.chapters};
  const searchFields = {
    cards: ['subject', 'topic', 'title', 'core_concept', 'common_mistake', 'formula_or_rule', 'exam_year_context'],
    sources: ['subject', 'source_id', 'title', 'type', 'notes'],
    exercises: ['subject', 'topic', 'question', 'options', 'explanation'],
    chapters: ['subject', 'text'],
  };
  const normalize = text => String(text).normalize('NFKC').toLocaleLowerCase();
  const searchText = new Map(Object.entries(lists).map(([key, rows]) => [key,
    new Map(rows.map(row => [row, normalize(searchFields[key].map(field => row[field] || '').join(' '))]))]));
  const openCards = new Set(), exerciseAnswers = new Map();
  let page = 0, view = 'browse', searchTimer;
  for (const s of subjects) subject.add(new Option(s, s));

  function matches() {
    const terms = normalize(query.value.trim()).split(/\s+/).filter(Boolean);
    return lists[kind.value].filter(row =>
      (!subject.value || row.subject === subject.value || row.subject === '全部') &&
      terms.every(term => searchText.get(kind.value).get(row).includes(term)));
  }
  function addSource(parent, id) {
    const source = sourceMap.get(id);
    if (source) parent.append(safeLink(source.source_id + ' · ' + source.title, source.url, 'source-link'));
  }
  function concept(row) {
    const body = element('div', '', 'knowledge-concept');
    body.append(element('p', row.core_concept), element('p', '常見誤解：' + row.common_mistake, 'knowledge-mistake'));
    if (row.formula_or_rule) body.append(element('p', '公式／規則：' + row.formula_or_rule));
    body.append(element('p', row.exam_year_context, 'muted'));
    const sources = element('details', '', 'knowledge-card-sources');
    sources.append(element('summary', '參考來源（待核對）'));
    for (const id of row.source_ids) addSource(sources, id);
    body.append(sources);
    return body;
  }
  function exercise(card, row) {
    card.append(element('h3', row.question), element('p', '附件自編練習，草稿答案未覆核；不計入考古題或原創40題統計。', 'muted'));
    const options = element('div', '', 'knowledge-options');
    const answer = element('div', '', 'knowledge-answer');
    answer.setAttribute('role', 'status');
    const retry = element('button', '重做此題', 'knowledge-retry');
    retry.type = 'button';
    function update() {
      const selected = exerciseAnswers.get(row.id), answered = selected !== undefined;
      options.querySelectorAll('button').forEach((button, index) => {
        button.disabled = answered;
        button.classList.toggle('knowledge-choice-selected', selected === index);
        button.setAttribute('aria-pressed', String(selected === index));
      });
      answer.hidden = !answered;
      retry.hidden = !answered;
      answer.replaceChildren();
      if (answered) answer.append(
        element('strong', `你的選擇：${String.fromCharCode(65 + selected)} · 草稿參考答案：${String.fromCharCode(65 + row.answer)}`),
        element('p', row.explanation));
    }
    row.options.forEach((text, index) => {
      const button = element('button', `${String.fromCharCode(65 + index)}. ${text}`);
      button.type = 'button';
      button.onclick = () => {exerciseAnswers.set(row.id, index); update(); retry.focus({preventScroll: true});};
      options.append(button);
    });
    retry.onclick = () => {exerciseAnswers.delete(row.id); update(); options.querySelector('button').focus({preventScroll: true});};
    card.append(options, answer, retry);
    update();
  }
  function render() {
    const recall = kind.value === 'cards' && view === 'recall', size = recall ? 1 : 12;
    const rows = matches(), pages = Math.max(1, Math.ceil(rows.length / size));
    page = Math.max(0, Math.min(page, pages - 1));
    root.replaceChildren();
    $('knowledge-view').hidden = kind.value !== 'cards';
    $('knowledge-status').textContent = recall
      ? `找到 ${rows.length} 張觀念卡。先用自己的話回想，再揭開重點；自測不記錄成績。`
      : `找到 ${rows.length} 筆 · 第 ${page + 1} / ${pages} 頁 · 每頁最多 ${size} 筆`;
    $('knowledge-position').textContent = !rows.length ? '0 筆' : recall
      ? `${page + 1} / ${rows.length} 張` : `${page + 1} / ${pages} 頁`;
    for (const row of rows.slice(page * size, (page + 1) * size)) {
      const card = element('article', '', 'knowledge-card');
      card.append(element('p', (row.subject || '全部') + ' · 附件整理／待核對', 'eyebrow'));
      if (kind.value === 'cards') {
        card.append(element('h3', row.title), element('p', row.topic, 'knowledge-topic'));
        if (recall) {
          card.classList.add('knowledge-flashcard');
          card.append(element('p', '你能說出這個觀念的重點與常見誤解嗎？', 'knowledge-recall-hint'));
          const body = concept(row), reveal = element('button', '想好了，揭開重點', 'primary knowledge-reveal');
          body.id = 'knowledge-recall-answer';
          body.hidden = true;
          reveal.type = 'button';
          reveal.setAttribute('aria-controls', body.id);
          reveal.setAttribute('aria-expanded', 'false');
          reveal.onclick = () => {
            body.hidden = !body.hidden;
            reveal.setAttribute('aria-expanded', String(!body.hidden));
            reveal.textContent = body.hidden ? '想好了，揭開重點' : '收起重點，再想一次';
          };
          card.append(reveal, body);
        } else {
          const details = element('details', '', 'knowledge-card-details');
          details.open = openCards.has(row.id);
          details.append(element('summary', '展開觀念、常見誤解與來源'), concept(row));
          details.addEventListener('toggle', () => {if (details.open) openCards.add(row.id); else openCards.delete(row.id);});
          card.append(details);
        }
      } else if (kind.value === 'sources') {
        card.append(element('h3', row.title), element('p', row.notes),
          element('p', `${row.source_id} · ${row.type} · ${row.stored_fulltext ? '附件聲稱有全文，仍需核對' : '僅來源索引，未收錄全文'}`, 'muted'),
          safeLink('前往來源入口（未由本站核驗）', row.url, 'source-link'));
      } else if (kind.value === 'chapters') {
        card.append(element('h3', row.subject + '章節地圖'), element('pre', row.text, 'knowledge-markdown'));
      } else exercise(card, row);
      root.append(card);
    }
    if (!rows.length) {
      const empty = element('div', '', 'knowledge-empty');
      const clear = element('button', '清除篩選，查看全部資料');
      clear.type = 'button'; clear.onclick = () => $('knowledge-clear').click();
      empty.append(element('p', '沒有相符資料，請改用較短關鍵字或選擇全部科目。'), clear);
      root.append(empty);
    }
    for (const suffix of ['', '-top']) {
      const prev = $('knowledge-prev' + suffix), next = $('knowledge-next' + suffix);
      prev.disabled = page === 0; next.disabled = page >= pages - 1;
      prev.textContent = recall ? '← 上一張' : '← 上一頁';
      next.textContent = recall ? '下一張 →' : '下一頁 →';
      prev.setAttribute('aria-label', recall ? '上一張觀念卡' : '上一頁');
      next.setAttribute('aria-label', recall ? '下一張觀念卡' : '下一頁');
    }
  }
  function search() {clearTimeout(searchTimer); page = 0; render();}
  $('knowledge-form').onsubmit = event => {event.preventDefault(); search();};
  query.oninput = () => {clearTimeout(searchTimer); searchTimer = setTimeout(search, 200);};
  subject.onchange = kind.onchange = search;
  $('knowledge-view').onchange = event => {
    clearTimeout(searchTimer);
    const wasRecall = view === 'recall';
    view = event.target.value;
    page = view === 'recall' ? page * 12 : wasRecall ? Math.floor(page / 12) : page;
    render();
  };
  for (const suffix of ['', '-top']) for (const direction of ['prev', 'next']) {
    $('knowledge-' + direction + suffix).onclick = () => {
      page += direction === 'prev' ? -1 : 1;
      render();
      $('knowledge-results').scrollIntoView({block: 'start', behavior: 'instant'});
    };
  }
  $('knowledge-clear').onclick = () => {query.value = ''; subject.value = ''; search();};
  render();
})();
