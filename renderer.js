(function () {
  const menuListEl = document.getElementById('menuList');
  const breadcrumbEl = document.getElementById('breadcrumb');
  const appTitleEl = document.getElementById('appTitle');
  const btnSettings = document.getElementById('btnSettings');
  const searchInputEl = document.getElementById('searchInput');
  const gameStatusEl = document.getElementById('gameStatus');
  const currentUnitEl = document.getElementById('currentUnit');
  const quickBarEl = document.getElementById('quickBar');
  const toastContainerEl = document.getElementById('toastContainer');
  const actionLogWrapEl = document.getElementById('actionLogWrap');
  const actionLogToggleEl = document.getElementById('actionLogToggle');
  const actionLogListEl = document.getElementById('actionLogList');
  const modalOverlay = document.getElementById('modalOverlay');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  const modalClose = document.getElementById('modalClose');
  const btnBack = document.getElementById('btnBack');
  const mechanicRpDelayWrap = document.getElementById('mechanicRpDelayWrap');
  const mechanicDelaySlider = document.getElementById('mechanicDelaySlider');
  const mechanicDelayValue = document.getElementById('mechanicDelayValue');
  const uniformFlWarningEl = document.getElementById('uniformFlWarning');

  let settings = {};
  let stack = [];
  let currentParentId = null;
  let currentItems = [];
  let selectedIndex = 0;
  let pendingAction = null;
  let searchQuery = '';
  let actionLog = []; // { time, label, actionId }[]
  const durationCache = new Map();
  const durationFetchInFlight = new Set();

  function updateCurrentUnit() {
    const unitSwitcher = document.getElementById('unitSwitcher');
    if (!currentUnitEl || !unitSwitcher) return;
    const dept = settings.department || 'PD';
    if (dept === 'Mechanic' || dept === 'Admin') {
      unitSwitcher.style.display = 'none';
      currentUnitEl.textContent = '';
      return;
    }
    unitSwitcher.style.display = '';
    const override = (settings.displayUnit || '').trim();
    const calls = window.getCallsigns ? window.getCallsigns(settings) : null;
    currentUnitEl.textContent = override || (calls ? calls.LincolnCallsign : '');
  }

  function updateUiScale() {
    const w = window.innerWidth || 400;
    const scale = Math.min(1.9, Math.max(0.85, w / 380));
    document.documentElement.style.setProperty('--ui-scale', String(scale));
  }
  updateUiScale();
  window.addEventListener('resize', updateUiScale);

  function applyTheme(s) {
    const theme = s.theme || 'dark';
    document.body.className = 'theme-' + theme;
    const accent = s.accentColor || '#5b7cfa';
    document.documentElement.style.setProperty('--accent', accent);
    const hover = accent.replace(
      /#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i,
      (_, r, g, b) => {
        const n = (v) => Math.min(255, Math.round(parseInt(v, 16) * 1.15));
        return (
          '#' +
          [n(r), n(g), n(b)]
            .map((x) => x.toString(16).padStart(2, '0'))
            .join('')
        );
      },
    );
    document.documentElement.style.setProperty('--accent-hover', hover);
  }

  function applyCompactList() {
    const appEl = document.querySelector('.app');
    if (appEl) appEl.classList.toggle('compact-list', !!settings.compactList);
  }

  function playActionSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.06);
    } catch (_) {}
  }

  const ACTION_TOOLTIPS = {
    StartWatch: 'Start watch and create unit',
    EndWatch: 'End watch and disband unit',
    JoinUnit: 'Join a unit (custom input)',
    RenameUnit: 'Rename current unit (custom input)',
    Uniform: 'Uniform key macro (editable in Settings → RP)',
    Weapons: 'Weapons key macro (editable in Settings → RP)',
    UniformAndWeapons:
      'Uniform (/fl), Backspace×2, then Weapons keys only (no second /fl)',
    UniformWeaponsStartWatch:
      'Uniform + Weapons, Backspace×2 to exit /fl, then Start Watch RP',
    ViewLicense: 'View license',
    IssueCitation: 'Issue citation (opens form)',
    HandCitation: 'Hand citation',
    Cuff: 'Cuff suspect',
    Uncuff: 'Uncuff',
    Frisk: 'Frisk',
    FriskLicense: 'Frisk for license',
    FriskKeys: 'Frisk for keys',
    LethalPursuit: 'Activates pursuit force',
    DepCallingToPD: 'Sends department message: calling JTAC to PD/SD',
    PayToll: 'Sends /paytoll to open toll quickly',
    VOIPReset: 'Sends /vr 1 to reset voice',
    ClearGPS: 'Sends /setcall -1 to clear GPS',
    Resync: 'Sends /resync to game chat',
    OpenManageRp: 'Manage custom /me and /do phrases',
    CustomRP: 'Sends custom /me or /do phrase',
    OpenManageBBCODE: 'Add or edit BBCODE templates for reports/emails',
    CopyBBCODE: 'Copy template to clipboard (paste on website manually)',
    OpenManageLinks: 'Add or manage useful links',
    Link: 'Copy or open this link',
    OpenPenalCode: 'View San Andreas Penal Code',
    MechOffer: 'Send /mechoffer command then RP typing and sending invoice',
    RadioPDtoDOC: 'Department radio: to DOC',
    RadioPDtoMD: 'Department radio: to MD',
    Radio1015: '10-15 to DOC (opens form)',
    Radio1015HVT: '10-15 HVT to DOC (opens form)',
    RadioInjured1015: 'Injured 10-15 (opens form)',
    DetectiveFingerprints: 'Dust, lift, and scan fingerprints on the MDC',
    DetectivePortablePrints:
      'Scan prints with portable scanner, upload to MDC, and search for a match',
    DetectiveGsrHands: 'GSR kit test on hands (.50) — asks if positive',
    DetectiveGsrHeavy:
      'GSR kit test on shoulders/fingers (heavy weapons) — asks if positive',
    DetectiveFieldTest: 'Swab to collect liquid/fluid, seal and label as evidence',
    DetectiveTrace: 'Open MDC tracing software and check for an active trace',
    DetectiveBallistics:
      'Detailed ballistic comparison under microscope (lands, grooves, striations)',
  };

  function getTooltip(item) {
    if (item.children && item.children.length) return 'Open submenu';
    if (item.actionId && ACTION_TOOLTIPS[item.actionId])
      return ACTION_TOOLTIPS[item.actionId];
    if (item.rpText)
      return item.rpText.slice(0, 80) + (item.rpText.length > 80 ? '…' : '');
    if (item.bbcodeContent)
      return (
        'Copy to clipboard: ' +
        (item.bbcodeContent.slice(0, 60) +
          (item.bbcodeContent.length > 60 ? '…' : ''))
      );
    return item.label || '';
  }

  function dispatchAction(item) {
    if (item.actionId === 'OpenManageRp') openManageRpModal();
    else if (item.actionId === 'OpenManageBBCODE') openManageBBCODEModal();
    else if (item.actionId === 'OpenManageLinks') openManageLinksModal();
    else if (item.actionId === 'OpenPenalCode') openPenalCodeModal();
    else if (item.actionId === 'CopyBBCODE') copyBBCODEToClipboard(item);
    else if (item.actionId === 'Link') copyLinkToClipboard(item);
    else if (item.needsInput) openInputModal(item);
    else {
      const params = item.rpText != null ? { text: item.rpText } : {};
      runAction(item.actionId, params, item.label);
    }
  }

  function getFlattenedItems() {
    const menu = window.buildMenu(settings);
    return window.flattenMenu(menu);
  }

  function getItems() {
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const flat = getFlattenedItems();
      return flat
        .filter(
          (f) =>
            f.item.label.toLowerCase().includes(q) ||
            f.path.some((p) => p.toLowerCase().includes(q)),
        )
        .map((f) => ({
          ...f.item,
          label: f.path.length
            ? `${f.path.join(' › ')} › ${f.item.label}`
            : f.item.label,
          _searchEntry: true,
        }));
    }
    return currentItems;
  }

  function buildRootItems() {
    return window.buildMenu(settings);
  }

  function setLevel(items, breadcrumbLabel, parentId = null) {
    stack.push({ items: currentItems, breadcrumbLabel, parentId: currentParentId });
    currentItems = items;
    currentParentId = parentId;
    selectedIndex = 0;
    render();
  }

  function goBack() {
    if (stack.length === 0) return;
    const level = stack.pop();
    currentItems = level.items;
    currentParentId = level.parentId;
    selectedIndex = 0;
    render();
  }

  const DRAG_THRESHOLD = 8;
  const canReorder = () => !searchQuery.trim();

  function render() {
    const items = getItems();
    const breadcrumbParts = searchQuery.trim()
      ? ['Search']
      : stack.map((l) => l.breadcrumbLabel);
    breadcrumbEl.textContent = breadcrumbParts.length
      ? breadcrumbParts.join(' › ')
      : 'Main';
    breadcrumbEl.style.display = breadcrumbParts.length ? 'block' : 'none';
    if (btnBack) btnBack.style.display = stack.length > 0 ? 'block' : 'none';

    const inMechanicRpMenu =
      !searchQuery.trim() &&
      stack.length === 1 &&
      (stack[0].breadcrumbLabel === 'Repairs' ||
        stack[0].breadcrumbLabel === 'Mods');
    if (mechanicRpDelayWrap) {
      if (inMechanicRpMenu) {
        mechanicRpDelayWrap.classList.remove('hidden');
        const delay = Math.min(
          30,
          Math.max(1, settings.mechanicRPDelaySeconds ?? 5),
        );
        if (mechanicDelaySlider) {
          mechanicDelaySlider.value = String(delay);
          mechanicDelaySlider.min = '1';
          mechanicDelaySlider.max = '30';
        }
        if (mechanicDelayValue) mechanicDelayValue.textContent = String(delay);
      } else {
        mechanicRpDelayWrap.classList.add('hidden');
      }
    }

    const inUniformEquipmentMenu =
      !searchQuery.trim() &&
      stack.length >= 1 &&
      stack[stack.length - 1]?.breadcrumbLabel === 'Uniform/Equipment Macros';
    if (uniformFlWarningEl) {
      if (inUniformEquipmentMenu) {
        uniformFlWarningEl.classList.remove('hidden');
      } else {
        uniformFlWarningEl.classList.add('hidden');
      }
    }

    menuListEl.innerHTML = '';
    const reorderEnabled = canReorder();
    items.forEach((item, i) => {
      const li = document.createElement('li');
      li.className = 'menu-item' + (i === selectedIndex ? ' selected' : '');
      li.setAttribute('role', 'option');
      li.setAttribute('data-index', i);
      if (reorderEnabled) li.setAttribute('data-id', item.id || '');
      li.title = getTooltip(item);
      const labelWrap = document.createElement('span');
      labelWrap.className = 'label-wrap';
      const label = document.createElement('span');
      label.className = 'label';
      label.textContent = item.label;
      labelWrap.appendChild(label);
      if (item.actionId) {
        const params = item.rpText != null ? { text: item.rpText } : {};
        const cacheKey = item.actionId + '|' + JSON.stringify(params);
        li.dataset.actionCacheKey = cacheKey;
        const dur = durationCache.get(cacheKey);
        if (dur != null && dur > 0) {
          const durSpan = document.createElement('span');
          durSpan.className = 'menu-item-duration';
          durSpan.textContent = (dur / 1000).toFixed(1) + 's';
          durSpan.title = 'Total duration';
          labelWrap.appendChild(durSpan);
        } else if (!durationFetchInFlight.has(cacheKey)) {
          durationFetchInFlight.add(cacheKey);
          window.api.getActionDuration(item.actionId, params).then((ms) => {
            durationFetchInFlight.delete(cacheKey);
            durationCache.set(cacheKey, ms);
            if (ms > 0) {
              const targetLi = menuListEl.querySelector(`[data-action-cache-key="${CSS.escape(cacheKey)}"]`);
              if (targetLi) {
                const lw = targetLi.querySelector('.label-wrap');
                if (lw && !lw.querySelector('.menu-item-duration')) {
                  const durSpan = document.createElement('span');
                  durSpan.className = 'menu-item-duration';
                  durSpan.textContent = (ms / 1000).toFixed(1) + 's';
                  durSpan.title = 'Total duration';
                  lw.appendChild(durSpan);
                }
              }
            }
          }).catch(() => durationFetchInFlight.delete(cacheKey));
        }
      }
      li.appendChild(labelWrap);
      if (item.rpText) {
        const preview = document.createElement('span');
        preview.className = 'rp-preview';
        const text =
          item.rpText.length > 40
            ? item.rpText.slice(0, 40) + '…'
            : item.rpText;
        preview.textContent = text;
        preview.title = item.rpText;
        li.appendChild(preview);
      }
      if (item.children && item.children.length) {
        const arrow = document.createElement('span');
        arrow.className = 'arrow';
        arrow.textContent = '▶';
        arrow.setAttribute('aria-hidden', 'true');
        li.appendChild(arrow);
      }
      if (item.linkUrl) {
        const linkActions = document.createElement('div');
        linkActions.className = 'link-item-actions';
        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'btn btn-small link-copy-btn';
        copyBtn.textContent = 'Copy';
        copyBtn.title = 'Copy link to clipboard';
        copyBtn.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          copyLinkToClipboard(item);
        });
        const openBtn = document.createElement('button');
        openBtn.type = 'button';
        openBtn.className = 'btn btn-small link-open-btn';
        openBtn.textContent = 'Open';
        openBtn.title = 'Open in browser';
        openBtn.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          openLinkInBrowser(item);
        });
        linkActions.appendChild(copyBtn);
        linkActions.appendChild(openBtn);
        li.appendChild(linkActions);
      }
      function handleItemActivate() {
        selectedIndex = i;
        render();
        if (item.children && item.children.length) {
          setLevel(item.children, item.label, item.id);
        } else if (item.actionId) {
          dispatchAction(item);
        }
      }
      if (reorderEnabled) {
        let dragStartY = 0;
        let dragStartX = 0;
        let isDragging = false;
        const cleanup = () => {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          menuListEl.classList.remove('dragging');
          menuListEl.querySelectorAll('.menu-item-drag-over').forEach((el) =>
            el.classList.remove('menu-item-drag-over'),
          );
        };
        const onMove = (e) => {
          if (!isDragging && (Math.abs(e.clientY - dragStartY) > DRAG_THRESHOLD || Math.abs(e.clientX - dragStartX) > DRAG_THRESHOLD)) {
            isDragging = true;
            menuListEl.classList.add('dragging');
            li.classList.add('menu-item-dragging');
          }
          if (isDragging) {
            const over = document.elementFromPoint(e.clientX, e.clientY);
            const overLi = over?.closest('.menu-item[data-id]');
            menuListEl.querySelectorAll('.menu-item-drag-over').forEach((el) => {
              if (el !== overLi) el.classList.remove('menu-item-drag-over');
            });
            if (overLi && overLi !== li) overLi.classList.add('menu-item-drag-over');
          }
        };
        const onUp = () => {
          if (isDragging) {
            const overLi = menuListEl.querySelector('.menu-item-drag-over');
            if (overLi && overLi !== li) {
              const overId = overLi.getAttribute('data-id');
              const currentIds = items.map((it) => it.id);
              const fromIdx = currentIds.indexOf(item.id);
              const toIdx = currentIds.indexOf(overId);
              if (fromIdx >= 0 && toIdx >= 0 && fromIdx !== toIdx) {
                const reordered = [...currentIds];
                reordered.splice(fromIdx, 1);
                reordered.splice(toIdx, 0, item.id);
                const isRoot = stack.length === 0;
                const snapParentId = currentParentId;
                if (isRoot) {
                  const orderKey = settings.department === 'Admin' ? 'adminMenuOrder' : 'menuOrder';
                  settings = { ...settings, [orderKey]: reordered };
                } else {
                  const subMenuOrders = { ...(settings.subMenuOrders || {}), [snapParentId]: reordered };
                  settings = { ...settings, subMenuOrders };
                }
                const byId = Object.fromEntries(items.map((it) => [it.id, it]));
                window.api.saveSettings(settings).then((updated) => {
                  settings = updated;
                  if (isRoot) {
                    currentItems = buildRootItems();
                  } else {
                    currentItems = reordered.filter((id) => byId[id]).map((id) => byId[id]);
                  }
                  render();
                  renderQuickBar();
                  showToast('Order updated');
                });
              }
            }
          } else {
            handleItemActivate();
          }
          li.classList.remove('menu-item-dragging');
          cleanup();
        };
        li.addEventListener('mousedown', (e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          e.stopPropagation();
          dragStartY = e.clientY;
          dragStartX = e.clientX;
          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp, { once: true });
        });
      } else {
        li.addEventListener('mousedown', (e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          e.stopPropagation();
          handleItemActivate();
        });
      }
      menuListEl.appendChild(li);
    });
    const selectedEl = menuListEl.querySelector('.menu-item.selected');
    if (selectedEl)
      selectedEl.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  }

  function onSelectItem(item, index) {
    selectedIndex = index;
    render();
    if (item.children && item.children.length) {
      setLevel(item.children, item.label, item.id);
    } else if (item.actionId) {
      dispatchAction(item);
    }
  }

  function moveSelection(delta) {
    const items = getItems();
    if (!items.length) return;
    selectedIndex = (selectedIndex + delta + items.length) % items.length;
    render();
  }

  function activateSelected() {
    const items = getItems();
    const item = items[selectedIndex];
    if (!item) return;
    if (item.children && item.children.length) {
      setLevel(item.children, item.label, item.id);
    } else if (item.actionId) {
      dispatchAction(item);
    }
  }

  function highlightMatch(text, q) {
    if (!text) return '';
    const safe = escapeHtml(text);
    if (!q || !q.trim()) return safe;
    const escapedRegex = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    try {
      const re = new RegExp(`(${escapedRegex})`, 'gi');
      return safe.replace(
        re,
        (m) => '<mark class="penal-code-highlight">' + m + '</mark>',
      );
    } catch {
      return safe;
    }
  }

  function renderOffenseCard(off, categoryName, q) {
    const card = document.createElement('div');
    card.className = 'penal-code-offense-card';
    const p = off.penalties || {};
    const lic = p.license_suspensions || {};
    const driver = lic.driver_license_suspension || {};
    const trucker = lic.trucker_license_suspension || {};
    const weapon = lic.weapon_license_suspension || {};
    const pilot = lic.pilot_license_suspension || {};
    const fmtLic = (l) => {
      const s = l.status || '—';
      const d = l.duration || l.extra;
      return d ? `${escapeHtml(s)} (${escapeHtml(d)})` : escapeHtml(s);
    };
    const sentenceStr =
      p.sentence_raw != null
        ? p.sentence_raw
        : p.sentence != null
          ? p.sentence + ' months'
          : 'N/A';
    const fineStr =
      p.fine != null
        ? typeof p.fine === 'number'
          ? '$' + p.fine.toLocaleString()
          : String(p.fine)
        : 'N/A';
    const licTable = `
      <table class="penal-code-licenses">
        <tr><th>Driver</th><td>${fmtLic(driver)}</td></tr>
        <tr><th>Trucker</th><td>${fmtLic(trucker)}</td></tr>
        <tr><th>Weapon</th><td>${fmtLic(weapon)}</td></tr>
        <tr><th>Pilot</th><td>${fmtLic(pilot)}</td></tr>
      </table>
    `;
    const hl = (text) => (q ? highlightMatch(text, q) : escapeHtml(text || ''));
    const descLines = (off.description || '')
      .split('\n')
      .map((line) => hl(line))
      .join('<br>');
    const categoryHtml = categoryName
      ? `<div class="penal-code-offense-category">${escapeHtml(categoryName)}</div>`
      : '';
    card.innerHTML = `
      ${categoryHtml}
      <div class="penal-code-offense-header">${hl(off.code || '')} — ${hl(off.title || '')}</div>
      <div class="penal-code-offense-desc">${descLines}</div>
      <div class="penal-code-offense-penalties">
        <span class="penal-code-penalty"><strong>Sentence:</strong> ${escapeHtml(sentenceStr)}</span>
        <span class="penal-code-penalty"><strong>Fine:</strong> ${escapeHtml(fineStr)}</span>
        ${licTable}
      </div>
    `;
    return card;
  }

  async function openPenalCodeModal() {
    window.api.focusApp();
    window.api.setIgnoreMouseEvents(false);
    modalTitle.textContent = 'Penal Code';
    modalBody.innerHTML = '<p class="penal-code-loading">Loading…</p>';
    window.api.setModalOpen(true);
    modalOverlay.classList.remove('hidden');
    try {
      const fullData = await window.api.getPenalCodeFull();
      const categories = (fullData.categories || []).map((c, i) => ({
        id: i,
        name: c.name,
      }));
      if (!categories.length) {
        modalBody.innerHTML =
          '<p class="penal-code-error">No penal code data found.</p><div class="modal-actions"><button type="button" class="btn" id="penalCodeDone">Done</button></div>';
        document.getElementById('penalCodeDone').onclick = closeModal;
        return;
      }
      const topRow = document.createElement('div');
      topRow.className = 'penal-code-top-row';
      const catSelect = document.createElement('select');
      catSelect.id = 'penalCodeCategorySelect';
      catSelect.className = 'penal-code-category-select';
      catSelect.innerHTML =
        '<option value="-1">All</option>' +
        categories
          .map(
            (c) =>
              `<option value="${c.id}">${escapeHtml(c.name.replace(/\n/g, ' '))}</option>`,
          )
          .join('');
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'penal-code-edit-btn';
      editBtn.textContent = 'Edit';
      editBtn.title = 'Edit penal_code.json';
      editBtn.onclick = async () => {
        await window.api.openPenalCodeForEdit();
      };
      topRow.appendChild(catSelect);
      topRow.appendChild(editBtn);

      const searchWrap = document.createElement('div');
      searchWrap.className = 'penal-code-search-wrap';
      const searchLabel = document.createElement('label');
      searchLabel.className = 'penal-code-search-label';
      searchLabel.textContent = 'Search:';
      const searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.className = 'penal-code-search';
      searchInput.placeholder = 'Search all by code, title, or description...';
      searchInput.autocomplete = 'off';
      searchWrap.appendChild(searchLabel);
      searchWrap.appendChild(searchInput);

      const listWrap = document.createElement('div');
      listWrap.className = 'penal-code-offenses';
      listWrap.id = 'penalCodeOffensesList';
      const btnWrap = document.createElement('div');
      btnWrap.className = 'modal-actions';
      btnWrap.innerHTML =
        '<button type="button" class="btn" id="penalCodeDone">Done</button>';
      btnWrap.querySelector('#penalCodeDone').onclick = closeModal;
      modalBody.innerHTML = '';
      modalBody.appendChild(topRow);
      modalBody.appendChild(searchWrap);
      modalBody.appendChild(listWrap);
      modalBody.appendChild(btnWrap);

      function applySearch() {
        const q = (searchInput.value || '').trim();
        const qLower = q.toLowerCase();
        const idx = parseInt(catSelect.value, 10);
        listWrap.innerHTML = '';

        if (q) {
          const matches = [];
          (fullData.categories || []).forEach((cat, catIdx) => {
            (cat.offenses || []).forEach((off) => {
              const code = (off.code || '').toLowerCase();
              const title = (off.title || '').toLowerCase();
              const desc = (off.description || '').toLowerCase();
              if (
                code.includes(qLower) ||
                title.includes(qLower) ||
                desc.includes(qLower)
              ) {
                matches.push({ offense: off, categoryName: cat.name });
              }
            });
          });
          if (!matches.length) {
            listWrap.innerHTML =
              '<p class="penal-code-empty">No matching offenses found.</p>';
            return;
          }
          matches.forEach(({ offense: off, categoryName }) => {
            listWrap.appendChild(renderOffenseCard(off, categoryName, q));
          });
        } else if (idx === -1) {
          const allOffenses = [];
          (fullData.categories || []).forEach((cat) => {
            (cat.offenses || []).forEach((off) => {
              allOffenses.push({ offense: off, categoryName: cat.name });
            });
          });
          if (!allOffenses.length) {
            listWrap.innerHTML =
              '<p class="penal-code-empty">No offenses found.</p>';
            return;
          }
          allOffenses.forEach(({ offense: off, categoryName }) => {
            listWrap.appendChild(renderOffenseCard(off, categoryName, null));
          });
        } else {
          const cat = (fullData.categories || [])[idx];
          const section = cat
            ? { name: cat.name, offenses: cat.offenses || [] }
            : null;
          if (!section || !section.offenses || !section.offenses.length) {
            listWrap.innerHTML =
              '<p class="penal-code-empty">No offenses in this category.</p>';
            return;
          }
          section.offenses.forEach((off) => {
            listWrap.appendChild(renderOffenseCard(off, null, null));
          });
        }
      }

      catSelect.addEventListener('change', applySearch);
      searchInput.addEventListener('input', applySearch);
      searchInput.addEventListener('keyup', applySearch);
      applySearch();
    } catch (e) {
      modalBody.innerHTML =
        '<p class="penal-code-error">Failed to load penal code.</p><div class="modal-actions"><button type="button" class="btn" id="penalCodeDone">Done</button></div>';
      document.getElementById('penalCodeDone').onclick = closeModal;
    }
  }

  async function copyBBCODEToClipboard(item) {
    const text = item.bbcodeContent != null ? String(item.bbcodeContent) : '';
    if (!text) {
      showToast('Template is empty', 'error');
      return;
    }
    try {
      await window.api.writeClipboard(text);
      showToast('Copied to clipboard');
      if (settings.soundOnAction) playActionSound();
    } catch (e) {
      showToast(e.message || 'Copy failed', 'error');
    }
  }

  async function copyLinkToClipboard(item) {
    const url = item.linkUrl != null ? String(item.linkUrl) : '';
    if (!url) { showToast('No URL on this link', 'error'); return; }
    try {
      await window.api.writeClipboard(url);
      showToast('Link copied to clipboard');
      if (settings.soundOnAction) playActionSound();
    } catch (e) {
      showToast(e.message || 'Copy failed', 'error');
    }
  }

  function openLinkInBrowser(item) {
    const url = item.linkUrl != null ? String(item.linkUrl) : '';
    if (!url) { showToast('No URL on this link', 'error'); return; }
    window.api.openExternal(url);
  }

  function openManageLinksModal() {
    window.api.focusApp();
    window.api.setIgnoreMouseEvents(false);
    modalTitle.textContent = 'Manage Useful Links';
    renderManageLinksList();
    window.api.setModalOpen(true);
    modalOverlay.classList.remove('hidden');
  }

  function renderManageLinksList() {
    modalBody.innerHTML = '';
    const list = settings.usefulLinks || [];
    const listEl = document.createElement('div');
    listEl.className = 'manage-rp-list';
    listEl.innerHTML = '<p class="manage-rp-hint">Save links you use often. From the menu you can copy a link to clipboard or open it directly in your browser.</p>';
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn';
    addBtn.textContent = 'Add link';
    addBtn.onclick = () => showManageLinksForm();
    listEl.appendChild(addBtn);
    const ul = document.createElement('ul');
    ul.className = 'manage-rp-entries';
    list.forEach((entry) => {
      const li = document.createElement('li');
      li.className = 'manage-rp-entry manage-bbcode-entry';
      const preview = entry.url.length > 55 ? entry.url.slice(0, 55) + '…' : entry.url;
      li.innerHTML = `
        <span class="manage-rp-entry-title">${escapeHtml(entry.title)}</span>
        <span class="manage-rp-entry-text bbcode-preview" title="${escapeHtml(entry.url)}">${escapeHtml(preview)}</span>
        <div class="manage-rp-actions">
          <button type="button" class="btn btn-small edit-rp" data-id="${escapeHtml(entry.id)}">Edit</button>
          <button type="button" class="btn btn-small btn-secondary delete-rp" data-id="${escapeHtml(entry.id)}">Delete</button>
        </div>
      `;
      li.querySelector('.edit-rp').onclick = () => showManageLinksForm(entry);
      li.querySelector('.delete-rp').onclick = () => deleteLinkEntry(entry.id);
      ul.appendChild(li);
    });
    listEl.appendChild(ul);
    if (list.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'manage-rp-empty';
      empty.textContent = 'No links yet. Click Add link to create one.';
      listEl.appendChild(empty);
    }
    const doneBtn = document.createElement('button');
    doneBtn.type = 'button';
    doneBtn.className = 'btn btn-secondary';
    doneBtn.textContent = 'Done';
    doneBtn.onclick = closeModal;
    listEl.appendChild(doneBtn);
    modalBody.appendChild(listEl);
  }

  function showManageLinksForm(entry = null) {
    const isEdit = !!entry;
    const titleVal = entry ? entry.title : '';
    const urlVal = entry ? entry.url : '';
    modalBody.innerHTML = `
      <div class="form-group">
        <label>Title (shown in menu)</label>
        <input type="text" id="linkFormTitle" placeholder="e.g. ECRP Rules" value="${escapeHtml(titleVal)}">
      </div>
      <div class="form-group">
        <label>URL</label>
        <input type="url" id="linkFormUrl" placeholder="https://..." value="${escapeHtml(urlVal)}">
      </div>
      <div class="modal-actions">
        <button type="button" class="btn" id="linkFormSave">${isEdit ? 'Save' : 'Add'}</button>
        <button type="button" class="btn btn-secondary" id="linkFormCancel">Cancel</button>
      </div>
    `;
    document.getElementById('linkFormSave').onclick = () => saveLinkEntry(entry ? entry.id : null);
    document.getElementById('linkFormCancel').onclick = () => renderManageLinksList();
    setTimeout(() => document.getElementById('linkFormTitle').focus(), 50);
  }

  function saveLinkEntry(id) {
    const title = document.getElementById('linkFormTitle').value.trim();
    const url = document.getElementById('linkFormUrl').value.trim();
    if (!title || !url) return;
    if (!url.startsWith('https://') && !url.startsWith('http://')) {
      showToast('URL must start with https:// or http://', 'error');
      return;
    }
    const list = [...(settings.usefulLinks || [])];
    const newEntry = {
      id: id || 'link-' + Date.now() + '-' + Math.random().toString(36).slice(2),
      title,
      url,
    };
    if (id) {
      const idx = list.findIndex((e) => e.id === id);
      if (idx >= 0) list[idx] = newEntry;
    } else {
      list.push(newEntry);
    }
    settings = { ...settings, usefulLinks: list };
    window.api.saveSettings(settings).then((s) => {
      settings = s;
      renderManageLinksList();
      refreshCurrentLevelAfterLinksChange();
      render();
    });
  }

  function deleteLinkEntry(id) {
    const list = (settings.usefulLinks || []).filter((e) => e.id !== id);
    settings = { ...settings, usefulLinks: list };
    window.api.saveSettings(settings).then((s) => {
      settings = s;
      renderManageLinksList();
      refreshCurrentLevelAfterLinksChange();
      render();
    });
  }

  function refreshCurrentLevelAfterLinksChange() {
    const root = window.buildMenu(settings);
    const cat = root.find((x) => x.id === 'useful-links');
    const inLinksMenu = stack.length === 1 && stack[0].breadcrumbLabel === 'Useful Links';
    if (inLinksMenu && cat) {
      currentItems = cat.children;
    } else if (stack.length === 0) {
      currentItems = buildRootItems();
    }
  }

  function openManageRpModal() {
    window.api.focusApp();
    window.api.setIgnoreMouseEvents(false);
    window.api.setModalOpen(true);
    modalTitle.textContent = 'Manage RP phrases';
    renderManageRpList();
    modalOverlay.classList.remove('hidden');
  }

  function renderManageRpList(editId = null) {
    modalBody.innerHTML = '';
    const list = settings.customRp || [];
    const listEl = document.createElement('div');
    listEl.className = 'manage-rp-list';
    listEl.innerHTML =
      '<p class="manage-rp-hint">Add custom /me and /do phrases for general RP. Use them from the RP menu.</p>';
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn';
    addBtn.textContent = 'Add phrase';
    addBtn.onclick = () => showManageRpForm();
    listEl.appendChild(addBtn);
    const ul = document.createElement('ul');
    ul.className = 'manage-rp-entries';
    list.forEach((entry) => {
      const li = document.createElement('li');
      li.className = 'manage-rp-entry';
      const preview =
        entry.text.length > 45 ? entry.text.slice(0, 45) + '…' : entry.text;
      li.innerHTML = `
        <span class="manage-rp-entry-title">${escapeHtml(entry.title)}</span>
        <span class="manage-rp-entry-type">${
          entry.type === 'me' ? '/me' : '/do'
        }</span>
        <span class="manage-rp-entry-text" title="${escapeHtml(
          entry.text,
        )}">${escapeHtml(preview)}</span>
        <div class="manage-rp-actions">
          <button type="button" class="btn btn-small edit-rp" data-id="${escapeHtml(
            entry.id,
          )}">Edit</button>
          <button type="button" class="btn btn-small btn-secondary delete-rp" data-id="${escapeHtml(
            entry.id,
          )}">Delete</button>
        </div>
      `;
      li.querySelector('.edit-rp').onclick = () => showManageRpForm(entry);
      li.querySelector('.delete-rp').onclick = () => deleteRpPhrase(entry.id);
      ul.appendChild(li);
    });
    listEl.appendChild(ul);
    if (list.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'manage-rp-empty';
      empty.textContent = 'No phrases yet. Click Add phrase to create one.';
      listEl.appendChild(empty);
    }
    const doneBtn = document.createElement('button');
    doneBtn.type = 'button';
    doneBtn.className = 'btn btn-secondary';
    doneBtn.textContent = 'Done';
    doneBtn.onclick = closeModal;
    listEl.appendChild(doneBtn);
    modalBody.appendChild(listEl);
  }

  // Safe for both element text and quoted attribute values
  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function stripRpPrefix(s) {
    if (!s || typeof s !== 'string') return '';
    const t = s.trim();
    if (/^\/me\s+/i.test(t)) return t.replace(/^\/me\s+/i, '').trim();
    if (/^\/do\s+/i.test(t)) return t.replace(/^\/do\s+/i, '').trim();
    if (/^\/me$/i.test(t) || /^\/do$/i.test(t)) return '';
    return t;
  }

  function showManageRpForm(entry = null) {
    const isEdit = !!entry;
    modalBody.innerHTML = '';
    const typeVal = entry ? entry.type : 'me';
    const titleVal = entry ? entry.title : '';
    const textVal = entry ? stripRpPrefix(entry.text) : '';
    modalBody.innerHTML = `
      <div class="form-group">
        <label>Type</label>
        <select id="rpFormType">
          <option value="me" ${typeVal === 'me' ? 'selected' : ''}>/me</option>
          <option value="do" ${typeVal === 'do' ? 'selected' : ''}>/do</option>
        </select>
      </div>
      <div class="form-group">
        <label>Title (shown in menu)</label>
        <input type="text" id="rpFormTitle" placeholder="e.g. Look at guy strangely" value="${escapeHtml(
          titleVal,
        )}">
      </div>
      <div class="form-group">
        <label>Text (/me or /do is added automatically)</label>
        <input type="text" id="rpFormText" placeholder="e.g. looks at the guy strangely" value="${escapeHtml(
          textVal,
        )}">
      </div>
      <div class="modal-actions">
        <button type="button" class="btn" id="rpFormSave">${
          isEdit ? 'Save' : 'Add'
        }</button>
        <button type="button" class="btn btn-secondary" id="rpFormCancel">Cancel</button>
      </div>
    `;
    document.getElementById('rpFormSave').onclick = () =>
      saveRpPhrase(entry ? entry.id : null);
    document.getElementById('rpFormCancel').onclick = () =>
      renderManageRpList();
  }

  function saveRpPhrase(id) {
    const type = document.getElementById('rpFormType').value;
    const title = document.getElementById('rpFormTitle').value.trim();
    const rawText = document.getElementById('rpFormText').value.trim();
    if (!title || !rawText) return;
    const content = stripRpPrefix(rawText) || rawText;
    const text = (type === 'me' ? '/me ' : '/do ') + content;
    const list = [...(settings.customRp || [])];
    const newEntry = {
      id: id || 'rp-' + Date.now() + '-' + Math.random().toString(36).slice(2),
      type,
      title,
      text,
    };
    if (id) {
      const idx = list.findIndex((e) => e.id === id);
      if (idx >= 0) list[idx] = newEntry;
    } else {
      list.push(newEntry);
    }
    settings = { ...settings, customRp: list };
    window.api.saveSettings(settings).then((s) => {
      settings = s;
      renderManageRpList();
      refreshCurrentLevelAfterRpChange();
      render();
    });
  }

  function deleteRpPhrase(id) {
    const list = (settings.customRp || []).filter((e) => e.id !== id);
    settings = { ...settings, customRp: list };
    window.api.saveSettings(settings).then((s) => {
      settings = s;
      renderManageRpList();
      refreshCurrentLevelAfterRpChange();
      render();
    });
  }

  function refreshCurrentLevelAfterRpChange() {
    const root = window.buildMenu(settings);
    const rpCategory = root.find((x) => x.id === 'custom-rp');
    const inRpSubmenu = stack.length === 1 && stack[0].breadcrumbLabel === 'RP';
    if (inRpSubmenu && rpCategory) {
      currentItems = rpCategory.children;
    } else if (stack.length === 0) {
      currentItems = buildRootItems();
    }
  }

  function openManageBBCODEModal() {
    window.api.focusApp();
    window.api.setIgnoreMouseEvents(false);
    modalTitle.textContent = 'Manage BBCODE templates';
    renderManageBBCODEList();
    window.api.setModalOpen(true);
    modalOverlay.classList.remove('hidden');
  }

  function renderManageBBCODEList() {
    modalBody.innerHTML = '';
    const list = settings.bbcodeTemplates || [];
    const listEl = document.createElement('div');
    listEl.className = 'manage-rp-list';
    listEl.innerHTML =
      '<p class="manage-rp-hint">Store BBCODE for arrest reports, emails, etc. Open this menu, select a template to copy it to the clipboard, then paste on the website.</p>';
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn';
    addBtn.textContent = 'Add template';
    addBtn.onclick = () => showManageBBCODEForm();
    listEl.appendChild(addBtn);
    const ul = document.createElement('ul');
    ul.className = 'manage-rp-entries';
    list.forEach((entry) => {
      const li = document.createElement('li');
      li.className = 'manage-rp-entry manage-bbcode-entry';
      const preview =
        (entry.content || '').length > 50
          ? (entry.content || '').slice(0, 50) + '…'
          : entry.content || '(empty)';
      li.innerHTML = `
        <span class="manage-rp-entry-title">${escapeHtml(
          entry.title || 'Untitled',
        )}</span>
        <span class="manage-rp-entry-text bbcode-preview" title="${escapeHtml(
          entry.content || '',
        )}">${escapeHtml(preview)}</span>
        <div class="manage-rp-actions">
          <button type="button" class="btn btn-small edit-rp" data-id="${escapeHtml(
            entry.id,
          )}">Edit</button>
          <button type="button" class="btn btn-small btn-secondary delete-rp" data-id="${escapeHtml(
            entry.id,
          )}">Delete</button>
        </div>
      `;
      li.querySelector('.edit-rp').onclick = () => showManageBBCODEForm(entry);
      li.querySelector('.delete-rp').onclick = () =>
        deleteBBCODETemplate(entry.id);
      ul.appendChild(li);
    });
    listEl.appendChild(ul);
    if (list.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'manage-rp-empty';
      empty.textContent = 'No templates yet. Click Add template to create one.';
      listEl.appendChild(empty);
    }
    const doneBtn = document.createElement('button');
    doneBtn.type = 'button';
    doneBtn.className = 'btn btn-secondary';
    doneBtn.textContent = 'Done';
    doneBtn.onclick = closeModal;
    listEl.appendChild(doneBtn);
    modalBody.appendChild(listEl);
  }

  function showManageBBCODEForm(entry = null) {
    const isEdit = !!entry;
    const titleVal = entry ? entry.title || '' : '';
    const contentVal = entry ? entry.content || '' : '';
    modalBody.innerHTML = `
      <div class="form-group">
        <label>Title (shown in menu)</label>
        <input type="text" id="bbcodeFormTitle" placeholder="e.g. Arrest report template" value="${escapeHtml(
          titleVal,
        )}">
      </div>
      <div class="form-group">
        <label>BBCODE content</label>
        <textarea id="bbcodeFormContent" rows="10" placeholder="Paste your [b]BBCODE[/b] here...">${escapeHtml(
          contentVal,
        )}</textarea>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn" id="bbcodeFormSave">${
          isEdit ? 'Save' : 'Add'
        }</button>
        <button type="button" class="btn btn-secondary" id="bbcodeFormCancel">Cancel</button>
      </div>
    `;
    document.getElementById('bbcodeFormSave').onclick = () =>
      saveBBCODETemplate(entry ? entry.id : null);
    document.getElementById('bbcodeFormCancel').onclick = () =>
      renderManageBBCODEList();
  }

  function saveBBCODETemplate(id) {
    const title = document.getElementById('bbcodeFormTitle').value.trim();
    const content = document.getElementById('bbcodeFormContent').value;
    if (!title) return;
    const list = [...(settings.bbcodeTemplates || [])];
    const newEntry = {
      id:
        id ||
        'bbcode-' + Date.now() + '-' + Math.random().toString(36).slice(2),
      title,
      content: content || '',
    };
    if (id) {
      const idx = list.findIndex((e) => e.id === id);
      if (idx >= 0) list[idx] = newEntry;
    } else {
      list.push(newEntry);
    }
    settings = { ...settings, bbcodeTemplates: list };
    window.api.saveSettings(settings).then((s) => {
      settings = s;
      renderManageBBCODEList();
      refreshCurrentLevelAfterBBCODEChange();
      render();
    });
  }

  function deleteBBCODETemplate(id) {
    const list = (settings.bbcodeTemplates || []).filter((e) => e.id !== id);
    settings = { ...settings, bbcodeTemplates: list };
    window.api.saveSettings(settings).then((s) => {
      settings = s;
      renderManageBBCODEList();
      refreshCurrentLevelAfterBBCODEChange();
      render();
    });
  }

  function refreshCurrentLevelAfterBBCODEChange() {
    const root = window.buildMenu(settings);
    const cat = root.find((x) => x.id === 'bbcode-templates');
    const inBBCODEMenu =
      stack.length === 1 && stack[0].breadcrumbLabel === 'BBCODE Templates';
    if (inBBCODEMenu && cat) {
      currentItems = cat.children;
    } else if (stack.length === 0) {
      currentItems = buildRootItems();
    }
  }

  function openInputModal(item) {
    window.api.focusApp();
    window.api.setIgnoreMouseEvents(false);
    pendingAction = item;
    modalTitle.textContent = item.label;
    modalBody.innerHTML = '';

    if (item.actionId === 'IssueCitation') {
      modalBody.innerHTML = `
        <div class="form-group">
          <label>Player ID (if demerit/suspension)</label>
          <input type="text" id="inputPlayerId" placeholder="Optional">
        </div>
        <div class="form-group">
          <label>Citation Type (VC)</label>
          <select id="inputCitationType">
            <option value="">Select...</option>
            <option value="VC01 - Speeding 1st Degree">VC01 - Speeding 1st Degree</option>
            <option value="VC02 - Speeding 2nd Degree">VC02 - Speeding 2nd Degree</option>
            <option value="VC03 - Speeding 3rd Degree">VC03 - Speeding 3rd Degree</option>
            <option value="VC04 - Illegal Parking">VC04 - Illegal Parking</option>
            <option value="VC05 - Improper Traffic Maneuvers">VC05 - Improper Traffic Maneuvers</option>
            <option value="VC06 - Following or Impeding Emergency Response">VC06 - Following or Impeding Emergency Response</option>
            <option value="VC07 - Operating a Vehicle Without a License on Your Person">VC07 - Operating a Vehicle Without a License on Your Person</option>
            <option value="VC08 - Negligent Operation of a Road or Marine Vehicle">VC08 - Negligent Operation</option>
            <option value="VC09 - Blocking Intersection">VC09 - Blocking Intersection</option>
            <option value="VC10 - Unroadworthy Vehicle">VC10 - Unroadworthy Vehicle</option>
            <option value="VC11 - Failure to Pay a Toll">VC11 - Failure to Pay a Toll</option>
            <option value="VC12 - Operating an Unregistered Vehicle">VC12 - Unregistered Vehicle</option>
            <option value="VC13 - Disruptive Impeding or Blocking Travel">VC13 - Disruptive Impeding</option>
          </select>
        </div>
        <div class="form-group">
          <label>General Citation (GC)</label>
          <select id="inputGeneralCitationType">
            <option value="">Select...</option>
            <option value="GC01 - Loitering">GC01 - Loitering</option>
            <option value="GC02 - Traffic Endangerment">GC02 - Traffic Endangerment</option>
            <option value="GC03 - Disorderly Conduct">GC03 - Disorderly Conduct</option>
            <option value="GC04 - Face Concealment">GC04 - Face Concealment</option>
            <option value="GC05 - Misuse of Government Public Safety Radio Frequencies or Hotlines">GC05 - Misuse of Radio</option>
            <option value="GC06 - Possession of Cannabis">GC06 - Possession of Cannabis</option>
          </select>
        </div>
        <div class="form-group">
          <label>Demerit / Suspension</label>
          <select id="inputDemeritSuspend">
            <option value="No">No</option>
            <option value="Yes">Yes</option>
            <option value="Demerit and Suspension">Demerit and Suspension</option>
          </select>
        </div>
        <div class="form-group">
          <label>License Type (if suspension)</label>
          <select id="inputLicenseType">
            <option value="">Select...</option>
            <option value="Driver">Driver</option>
            <option value="Driver and Trucker">Driver and Trucker</option>
          </select>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn" id="modalSubmit">Submit</button>
          <button type="button" class="btn btn-secondary" id="modalCancel">Cancel</button>
        </div>
      `;
      document.getElementById('modalSubmit').onclick = () => {
        const citationType = document.getElementById('inputCitationType').value;
        const generalCitationType = document.getElementById(
          'inputGeneralCitationType',
        ).value;
        if (!citationType && !generalCitationType) return;
        runAction(
          'IssueCitation',
          {
            playerId: document.getElementById('inputPlayerId').value.trim(),
            citationType: citationType || undefined,
            generalCitationType: generalCitationType || undefined,
            demeritSuspend: document.getElementById('inputDemeritSuspend')
              .value,
            licenseType:
              document.getElementById('inputLicenseType').value || undefined,
          },
          item.label,
        );
        closeModal();
      };
    } else if (
      item.actionId === 'Radio1015' ||
      item.actionId === 'Radio1015HVT'
    ) {
      modalBody.innerHTML = `
        <div class="form-group">
          <label>How many 10-15s?</label>
          <input type="text" id="inputCount" placeholder="e.g. 2">
        </div>
        <div class="form-group">
          <label>ETA (minutes)</label>
          <input type="text" id="inputEta" placeholder="e.g. 5">
        </div>
        <div class="modal-actions">
          <button type="button" class="btn" id="modalSubmit">Submit</button>
          <button type="button" class="btn btn-secondary" id="modalCancel">Cancel</button>
        </div>
      `;
      document.getElementById('modalSubmit').onclick = () => {
        const count = document.getElementById('inputCount').value.trim();
        const eta = document.getElementById('inputEta').value.trim();
        if (!count || !eta) return;
        runAction(item.actionId, { count, eta }, item.label);
        closeModal();
      };
    } else if (item.actionId === 'RadioInjured1015') {
      modalBody.innerHTML = `
        <div class="form-group">
          <label>How many injured 10-15s?</label>
          <input type="text" id="inputInjuredCount" placeholder="e.g. 1">
        </div>
        <div class="form-group">
          <label>Backup number</label>
          <input type="text" id="inputBackupNumber" placeholder="e.g. 42">
        </div>
        <div class="modal-actions">
          <button type="button" class="btn" id="modalSubmit">Submit</button>
          <button type="button" class="btn btn-secondary" id="modalCancel">Cancel</button>
        </div>
      `;
      document.getElementById('modalSubmit').onclick = () => {
        const injuredCount = document
          .getElementById('inputInjuredCount')
          .value.trim();
        const backupNumber = document
          .getElementById('inputBackupNumber')
          .value.trim();
        if (!injuredCount || !backupNumber) return;
        runAction(
          'RadioInjured1015',
          { injuredCount, backupNumber },
          item.label,
        );
        closeModal();
      };
    } else if (item.actionId === 'MechOffer') {
      modalBody.innerHTML = `
        <div class="form-group">
          <label>Type</label>
          <select id="inputMechType">
            <option value="0">Mods (20% of total)</option>
            <option value="1" selected>Repairs (full price)</option>
          </select>
        </div>
        <div class="form-group">
          <label id="inputMechAmountLabel">Amount ($)</label>
          <input type="text" id="inputMechAmount" value="500" placeholder="e.g. 500">
          <p class="form-hint" id="inputMechAmountHint">For mods: enter total mod price; 20% will be charged.</p>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn" id="modalSubmit">Submit</button>
          <button type="button" class="btn btn-secondary" id="modalCancel">Cancel</button>
        </div>
      `;
      const submitMechOffer = () => {
        const type = document.getElementById('inputMechType').value;
        const amount = document.getElementById('inputMechAmount').value.trim();
        if (!amount) return;
        runAction('MechOffer', { type, amount }, item.label);
        closeModal();
      };
      document.getElementById('modalSubmit').onclick = submitMechOffer;
      const onEnter = (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
          e.preventDefault();
          submitMechOffer();
        }
      };
      document.getElementById('inputMechType').onkeydown = onEnter;
      document.getElementById('inputMechAmount').onkeydown = onEnter;
    } else if (
      item.actionId === 'JoinUnit' ||
      item.actionId === 'RenameUnit' ||
      item.actionId === 'CustomUnit'
    ) {
      modalBody.innerHTML = `
        <div class="form-group">
          <label>Unit / Callsign</label>
          <input type="text" id="inputCallSign" placeholder="e.g. RED, 228B, FLD" autofocus>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn" id="modalSubmit">Submit</button>
          <button type="button" class="btn btn-secondary" id="modalCancel">Cancel</button>
        </div>
      `;
      const submitUnit = () => {
        const callSign = document.getElementById('inputCallSign').value.trim();
        if (!callSign) return;
        const actionId =
          item.actionId === 'CustomUnit' ? 'JoinUnit' : item.actionId;
        runAction(actionId, { callSign }, item.label);
        closeModal();
      };
      document.getElementById('modalSubmit').onclick = submitUnit;
      const inputEl = document.getElementById('inputCallSign');
      inputEl.onkeydown = (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
          e.preventDefault();
          submitUnit();
        }
      };
      setTimeout(() => inputEl.focus(), 50);
    }

    document.getElementById('modalCancel').onclick = closeModal;
    window.api.setModalOpen(true);
    modalOverlay.classList.remove('hidden');
  }

  let previewCleanup = null;
  function closeModal() {
    if (previewCleanup) {
      previewCleanup();
      previewCleanup = null;
    }
    modalOverlay.classList.add('hidden');
    pendingAction = null;
    window.api.setModalOpen(false);
    // Pass-through is controlled by window focus/blur in main process when setting is on
    if (settings.mousePassThrough !== true) {
      window.api.setIgnoreMouseEvents(false);
    }
  }

  function showToast(message, type = 'success') {
    const el = document.createElement('div');
    el.className = 'toast ' + (type === 'error' ? 'error' : 'success');
    el.textContent = message;
    toastContainerEl.appendChild(el);
    setTimeout(() => el.remove(), 2800);
  }

  function applyAdminVisibility() {
    const unlocked = settings.adminUnlocked === true;
    document.querySelectorAll('.admin-gated').forEach((el) => {
      el.classList.toggle('hidden', !unlocked);
    });
    if (!unlocked && settings.department === 'Admin') {
      settings = { ...settings, department: 'PD' };
      window.api.saveSettings(settings).then((updated) => {
        settings = updated;
        refreshMenu();
      });
    }
  }

  function openAdminUnlockPrompt() {
    if (settings.adminUnlocked === true) {
      showToast('Admin already unlocked');
      return;
    }
    window.api.focusApp();
    window.api.setIgnoreMouseEvents(false);
    modalTitle.textContent = 'Unlock';
    modalBody.innerHTML = `
      <div class="form-group">
        <label>Password</label>
        <input type="password" id="adminUnlockPassword" autocomplete="off" autofocus>
      </div>
      <p class="form-hint" id="adminUnlockError" style="color:#f66;display:none;">Incorrect password</p>
      <div class="modal-actions">
        <button type="button" class="btn" id="adminUnlockSubmit">Unlock</button>
        <button type="button" class="btn btn-secondary" id="adminUnlockCancel">Cancel</button>
      </div>
    `;
    const input = document.getElementById('adminUnlockPassword');
    const errEl = document.getElementById('adminUnlockError');
    const submit = async () => {
      const result = await window.api.unlockAdmin(input.value);
      if (result && result.ok) {
        settings = result.settings || { ...settings, adminUnlocked: true };
        applyAdminVisibility();
        closeModal();
        showToast('Admin unlocked');
        return;
      }
      if (errEl) errEl.style.display = '';
      if (input) {
        input.value = '';
        input.focus();
      }
    };
    document.getElementById('adminUnlockSubmit').onclick = submit;
    document.getElementById('adminUnlockCancel').onclick = closeModal;
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          submit();
        }
      });
    }
    window.api.setModalOpen(true);
    modalOverlay.classList.remove('hidden');
    setTimeout(() => input && input.focus(), 50);
  }

  if (window.api.onPromptAdminUnlock) {
    window.api.onPromptAdminUnlock(() => openAdminUnlockPrompt());
  }

  function pushActionLog(label, actionId) {
    const max = Math.max(10, Math.min(50, settings.actionLogMax || 20));
    actionLog.unshift({ time: Date.now(), label, actionId });
    actionLog = actionLog.slice(0, max);
    renderActionLog();
  }

  function renderActionLog() {
    actionLogListEl.innerHTML = '';
    const max = Math.max(10, Math.min(50, settings.actionLogMax || 20));
    actionLog.slice(0, max).forEach((entry) => {
      const li = document.createElement('li');
      const timeStr = new Date(entry.time).toLocaleTimeString();
      li.textContent = `${timeStr} — ${entry.label}`;
      actionLogListEl.appendChild(li);
    });
  }

  async function runAction(actionId, params, labelForToast) {
    const label =
      labelForToast ||
      getFlattenedItems().find((f) => f.item.actionId === actionId)?.item
        ?.label ||
      actionId;
    try {
      const result = await window.api.runAction(actionId, params);
      if (result && !result.ok) {
        showToast(
          result.cancelled ? 'RP cancelled' : result.error || 'Action failed',
          result.cancelled ? 'success' : 'error',
        );
        if (result.preview && result.preview.length) {
          openPreviewModal(label, result.preview);
        }
        return;
      }
      if (result && result.preview && result.preview.length) {
        openPreviewModal(label, result.preview);
        if (settings.actionLogEnabled !== false) pushActionLog(label, actionId);
      } else {
        showToast(`${label} sent`);
        if (settings.soundOnAction) playActionSound();
        if (settings.actionLogEnabled !== false) pushActionLog(label, actionId);
      }
      if ((actionId === 'JoinUnit' || actionId === 'RenameUnit') && params.callSign) {
        const callSign = String(params.callSign).trim();
        if (callSign) {
          settings = { ...settings, displayUnit: callSign };
          window.api.saveSettings(settings).then((updated) => {
            settings = updated;
            updateCurrentUnit();
          });
        }
      }
      if (actionId === 'StartWatch') {
        const calls = window.getCallsigns ? window.getCallsigns(settings) : null;
        if (calls) {
          settings = { ...settings, displayUnit: calls.LincolnCallsign };
          window.api.saveSettings(settings).then((updated) => {
            settings = updated;
            updateCurrentUnit();
          });
        }
      }
      if (actionId === 'EndWatch') {
        settings = { ...settings, displayUnit: null };
        window.api.saveSettings(settings).then((updated) => {
          settings = updated;
          updateCurrentUnit();
        });
      }
      if (searchQuery.trim()) {
        searchQuery = '';
        searchInputEl.value = '';
      }
      if (stack.length === 0) currentItems = buildRootItems();
      render();
      renderQuickBar();
    } catch (e) {
      console.error('runAction', e);
      showToast(e.message || 'Action failed', 'error');
    }
  }

  function openPreviewModal(label, steps) {
    window.api.focusApp();
    window.api.setIgnoreMouseEvents(false);
    const items = steps
      .map((s) => ({
        text: (typeof s === 'string' ? s : s.text || '').trim(),
        delayAfter: Math.max(0, (typeof s === 'object' && s.delayAfter) || 0),
      }))
      .filter((s) => s.text);
    if (items.length === 0) {
      modalTitle.textContent = 'Preview: ' + label;
      modalBody.innerHTML = `<p class="preview-hint">No output for this action.</p><div class="modal-actions"><button type="button" class="btn" id="previewDone">Done</button></div>`;
      document.getElementById('previewDone').onclick = closeModal;
      window.api.setModalOpen(true);
      modalOverlay.classList.remove('hidden');
      return;
    }
    if (settings.devModeTimedPreview === false) {
      const lines = items.map((i) => i.text);
      const totalMs = items.reduce((acc, it) => acc + (it.delayAfter || 0), 0);
      const totalText = totalMs > 0 ? ` — total: ${(totalMs / 1000).toFixed(1)}s` : '';
      modalTitle.textContent = 'Preview: ' + label;
      modalBody.innerHTML = `
        <p class="preview-hint">Would send to game (dev mode)${escapeHtml(totalText)}</p>
        <div class="preview-steps"><pre>${lines.map((l) => escapeHtml(l)).join('\n')}</pre></div>
        <div class="modal-actions"><button type="button" class="btn" id="previewDone">Done</button></div>
      `;
      document.getElementById('previewDone').onclick = closeModal;
      window.api.setModalOpen(true);
      modalOverlay.classList.remove('hidden');
      return;
    }
    let currentIndex = 0;
    let speed = 1;
    let countdownInterval = null;
    let nextTimeout = null;
    const container = document.createElement('div');
    container.className = 'preview-playback';
    const hint = document.createElement('p');
    hint.className = 'preview-hint';
    hint.textContent = 'Would send to game (dev mode) — playing with timing:';
    const timerEl = document.createElement('div');
    timerEl.className = 'preview-timer';
    const stepsEl = document.createElement('div');
    stepsEl.className = 'preview-steps-list';
    items.forEach((item, i) => {
      const row = document.createElement('div');
      row.className = 'preview-step-row' + (i === 0 ? ' current' : '');
      row.dataset.index = String(i);
      const num = document.createElement('span');
      num.className = 'preview-step-num';
      num.textContent = String(i + 1) + '.';
      const text = document.createElement('span');
      text.className = 'preview-step-text';
      text.textContent = item.text;
      const delay = document.createElement('span');
      delay.className = 'preview-step-delay';
      delay.textContent = item.delayAfter ? ` (${(item.delayAfter / 1000).toFixed(1)}s after)` : '';
      row.appendChild(num);
      row.appendChild(text);
      row.appendChild(delay);
      stepsEl.appendChild(row);
    });
    const controls = document.createElement('div');
    controls.className = 'preview-controls';
    const speedBtn = document.createElement('button');
    speedBtn.type = 'button';
    speedBtn.className = 'btn btn-secondary';
    speedBtn.textContent = 'Speed: 1x';
    const skipBtn = document.createElement('button');
    skipBtn.type = 'button';
    skipBtn.className = 'btn btn-secondary';
    skipBtn.textContent = 'Skip to end';
    const doneBtn = document.createElement('button');
    doneBtn.type = 'button';
    doneBtn.className = 'btn';
    doneBtn.id = 'previewDone';
    doneBtn.textContent = 'Done';
    controls.appendChild(speedBtn);
    controls.appendChild(skipBtn);
    controls.appendChild(doneBtn);
    container.appendChild(hint);
    container.appendChild(timerEl);
    container.appendChild(stepsEl);
    container.appendChild(controls);

    const totalMs = items.reduce((acc, it) => acc + (it.delayAfter || 0), 0);
    const totalSeconds = (totalMs / 1000).toFixed(1);

    function updateDisplay() {
      stepsEl.querySelectorAll('.preview-step-row').forEach((row, i) => {
        row.classList.toggle('done', i < currentIndex);
        row.classList.toggle('current', i === currentIndex);
        row.classList.remove('pending');
        if (i > currentIndex) row.classList.add('pending');
      });
      if (currentIndex >= items.length) {
        timerEl.textContent = 'Complete — total: ' + totalSeconds + 's';
        timerEl.classList.add('complete');
      }
    }

    let countdownStart = 0;
    let countdownTotal = 0;
    function scheduleNext() {
      if (countdownInterval) clearInterval(countdownInterval);
      if (nextTimeout) clearTimeout(nextTimeout);
      countdownInterval = null;
      nextTimeout = null;
      if (currentIndex >= items.length) {
        updateDisplay();
        return;
      }
      const item = items[currentIndex];
      const delay = Math.max(0, Math.round((item.delayAfter || 0) / speed));
      updateDisplay();
      if (delay <= 0) {
        currentIndex++;
        scheduleNext();
        return;
      }
      countdownStart = Date.now();
      countdownTotal = delay;
      let remaining = delay / 1000;
      timerEl.textContent = 'Next in ' + remaining.toFixed(1) + 's';
      timerEl.classList.remove('complete');
      countdownInterval = setInterval(() => {
        const elapsed = Date.now() - countdownStart;
        remaining = Math.max(0, (countdownTotal - elapsed) / 1000);
        if (remaining <= 0) {
          clearInterval(countdownInterval);
          countdownInterval = null;
        }
        timerEl.textContent = 'Next in ' + remaining.toFixed(1) + 's';
      }, 100);
      nextTimeout = setTimeout(() => {
        nextTimeout = null;
        if (countdownInterval) clearInterval(countdownInterval);
        countdownInterval = null;
        currentIndex++;
        scheduleNext();
      }, delay);
    }

    function cleanup() {
      if (countdownInterval) clearInterval(countdownInterval);
      if (nextTimeout) clearTimeout(nextTimeout);
    }

    speedBtn.onclick = () => {
      const oldSpeed = speed;
      speed = speed === 1 ? 10 : 1;
      speedBtn.textContent = 'Speed: ' + speed + 'x';
      if (nextTimeout && currentIndex < items.length) {
        const elapsed = Date.now() - countdownStart;
        const remaining = Math.max(0, countdownTotal - elapsed);
        const newDelay = Math.round(remaining * (oldSpeed / speed));
        clearTimeout(nextTimeout);
        if (countdownInterval) clearInterval(countdownInterval);
        countdownInterval = null;
        nextTimeout = null;
        if (newDelay <= 0) {
          currentIndex++;
          scheduleNext();
        } else {
          countdownStart = Date.now();
          countdownTotal = newDelay;
          countdownInterval = setInterval(() => {
            const e = Date.now() - countdownStart;
            const r = Math.max(0, (countdownTotal - e) / 1000);
            if (r <= 0) clearInterval(countdownInterval);
            timerEl.textContent = 'Next in ' + r.toFixed(1) + 's';
          }, 100);
          nextTimeout = setTimeout(() => {
            nextTimeout = null;
            if (countdownInterval) clearInterval(countdownInterval);
            currentIndex++;
            scheduleNext();
          }, newDelay);
        }
      }
    };

    skipBtn.onclick = () => {
      cleanup();
      currentIndex = items.length;
      updateDisplay();
      timerEl.textContent = 'Complete — total: ' + totalSeconds + 's';
      timerEl.classList.add('complete');
    };

    doneBtn.onclick = () => {
      cleanup();
      closeModal();
    };

    previewCleanup = cleanup;

    modalTitle.textContent = 'Preview: ' + label;
    modalBody.innerHTML = '';
    modalBody.appendChild(container);
    window.api.setModalOpen(true);
    modalOverlay.classList.remove('hidden');
    scheduleNext();
  }

  function refreshMenu() {
    durationCache.clear();
    durationFetchInFlight.clear();
    searchQuery = '';
    if (searchInputEl) searchInputEl.value = '';
    currentItems = buildRootItems();
    stack = [];
    selectedIndex = 0;
    render();
    renderQuickBar();
    renderActionLog();
    const dept = settings.department || 'PD';
    appTitleEl.textContent = "KWAAI's RP DESK";
    const deptBadge = document.getElementById('departmentBadge');
    if (deptBadge) deptBadge.textContent = dept;
    const devBadge = document.getElementById('devBadge');
    if (devBadge) devBadge.classList.toggle('hidden', !settings.devMode);
  }

  function getQuickBarHotkeyLabel(slotIndex) {
    if (settings.quickBarHotkeysEnabled !== true) return '';
    const raw = (settings.quickBarKeys || [])[slotIndex];
    let accel = (raw || '').trim().replace(/\bCtrl\b/gi, 'Control');
    if (/^Control\+\d$/.test(accel)) accel = 'Alt+' + (slotIndex + 1);
    if (!accel) accel = 'Alt+' + (slotIndex + 1);
    return accel;
  }

  function renderQuickBar() {
    quickBarEl.innerHTML = '';
    const bar = settings.quickBar || [];
    if (bar.length === 0) {
      quickBarEl.classList.add('empty');
      return;
    }
    quickBarEl.classList.remove('empty');
    bar.forEach((entry, i) => {
      const actionId = typeof entry === 'string' ? entry : entry?.actionId;
      if (!actionId) return;
      const label = typeof entry === 'string' ? null : entry?.label;
      const flat = getFlattenedItems();
      const item = flat.find(
        (f) =>
          f.item.actionId === actionId && (!label || f.item.label === label),
      )?.item;
      const displayLabel = label || item?.label || actionId;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quick-bar-btn';
      btn.title = item ? getTooltip(item) : displayLabel;
      const labelSpan = document.createElement('span');
      labelSpan.className = 'quick-bar-btn-label';
      labelSpan.textContent = displayLabel;
      btn.appendChild(labelSpan);
      const hotkeySpan = document.createElement('span');
      hotkeySpan.className = 'quick-bar-hotkey';
      hotkeySpan.textContent = getQuickBarHotkeyLabel(i);
      btn.appendChild(hotkeySpan);
      btn.addEventListener('click', () => {
        if (item) {
          if (item.actionId === 'CopyBBCODE') copyBBCODEToClipboard(item);
          else if (item.actionId === 'OpenPenalCode') openPenalCodeModal();
          else if (item.needsInput) openInputModal(item);
          else runAction(actionId, {}, displayLabel);
        } else runAction(actionId, {}, displayLabel);
      });
      quickBarEl.appendChild(btn);
    });
  }

  function updateGameStatus() {
    window.api.getGameStatus().then(({ running }) => {
      gameStatusEl.textContent = running ? 'Game running' : 'Not found';
      gameStatusEl.className =
        'game-status ' + (running ? 'running' : 'not-found');
    });
  }

  function openSettings() {
    window.api.focusApp();
    window.api.setIgnoreMouseEvents(false);
    modalTitle.textContent = 'Settings';
    modalBody.innerHTML = `
      <div class="settings-tabs">
        <div class="settings-tab-bar">
          <button type="button" class="settings-tab active" data-tab="identity">Identity</button>
          <button type="button" class="settings-tab" data-tab="window">Window</button>
          <button type="button" class="settings-tab" data-tab="appearance">Appearance</button>
          <button type="button" class="settings-tab" data-tab="rp">RP</button>
          <button type="button" class="settings-tab" data-tab="shortcuts">Shortcuts</button>
          <button type="button" class="settings-tab" data-tab="menu">Menu</button>
          <button type="button" class="settings-tab" data-tab="data">Data</button>
          <button type="button" class="settings-tab" data-tab="dev">Development</button>
        </div>
        <div class="settings-tab-panels">
          <div class="settings-tab-panel active" id="panel-identity">
      <div class="form-group">
        <label>Department</label>
        <select id="settingDepartment">
          <option value="PD" ${
            settings.department === 'PD' ? 'selected' : ''
          }>PD (Police Department)</option>
          <option value="SD" ${
            settings.department === 'SD' ? 'selected' : ''
          }>SD (Sheriff's Department)</option>
          <option value="Mechanic" ${
            settings.department === 'Mechanic' ? 'selected' : ''
          }>Mechanic (Car repair RP only)</option>
          ${
            settings.adminUnlocked
              ? `<option value="Admin" ${
                  settings.department === 'Admin' ? 'selected' : ''
                }>Admin (Admin shortcuts &amp; report replies)</option>`
              : ''
          }
        </select>
      </div>
      <div class="form-group">
        <label>Department full name (e.g. for megaphone)</label>
        <input type="text" id="settingDepartmentFullName" value="${escapeHtml(
          settings.departmentFullName || '',
        )}" placeholder="LSPD or LSSD">
      </div>
      <div class="form-group">
        <label>Badge number</label>
        <input type="text" id="settingBadge" value="${escapeHtml(
          settings.badgeNumber || '',
        )}" placeholder="24195">
      </div>
      <div class="form-group">
        <label>Callsign</label>
        <input type="text" id="settingCallsign" value="${escapeHtml((() => {
          const c = settings.callsign;
          if (typeof c === 'string') return c;
          if (c && typeof c === 'object' && (c.division != null || c.letter != null || c.number != null)) {
            return [c.division, c.letter, c.number].filter(Boolean).join('-') || '';
          }
          return '';
        })())}" placeholder="228B or 3-K-22">
      </div>
      <div class="form-group">
        <label>Pronouns (for /me /do)</label>
        <div class="form-row">
          <input type="text" id="settingPronounSubject" value="${escapeHtml(
            settings.pronouns?.subject || 'he',
          )}" placeholder="he">
          <input type="text" id="settingPronounPossessive" value="${escapeHtml(
            settings.pronouns?.possessive || 'his',
          )}" placeholder="his">
        </div>
      </div>
          </div>
          <div class="settings-tab-panel" id="panel-window">
      <div class="form-group">
        <label>Target exe (game)</label>
        <input type="text" id="settingTargetExe" value="${escapeHtml(
          settings.targetExe || 'FiveM_GTAProcess.exe',
        )}" placeholder="FiveM_GTAProcess.exe">
        <p class="form-hint">FiveM build names like FiveM_b3889_GTAProcess.exe are auto-detected if this exact name is not found.</p>
      </div>
      <div class="form-group">
        <label>Window</label>
        <div class="checkbox-group">
          <input type="checkbox" id="settingMousePassThrough" ${
            settings.mousePassThrough ? 'checked' : ''
          }>
          <label for="settingMousePassThrough">Mouse pass-through (cursor goes through app to game; use Ctrl+arrows to navigate)</label>
        </div>
        <p class="form-hint">When pass-through is on: Alt+Tab to the app or press Ctrl+Shift+M to focus and get the mouse back; Ctrl+Shift+S to open Settings.</p>
        <div class="checkbox-group">
          <input type="checkbox" id="settingBorderless" ${
            settings.borderless ? 'checked' : ''
          }>
          <label for="settingBorderless">Borderless (frameless) — restart app to apply</label>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Width</label>
            <input type="number" id="settingWindowWidth" min="240" max="800" value="${
              settings.windowWidth ?? 320
            }">
          </div>
          <div class="form-group">
            <label>Height</label>
            <input type="number" id="settingWindowHeight" min="300" max="900" value="${
              settings.windowHeight ?? 560
            }">
          </div>
        </div>
        <div class="form-group">
          <label>Opacity (%) — blend into game</label>
          <input type="range" id="settingWindowOpacity" min="15" max="100" value="${
            settings.windowOpacity ?? 100
          }">
          <span id="settingWindowOpacityValue">${
            settings.windowOpacity ?? 100
          }%</span>
        </div>
        <div class="checkbox-group">
          <input type="checkbox" id="settingSidebarAutoCollapse" ${
            settings.sidebarAutoCollapse === true ? 'checked' : ''
          }>
          <label for="settingSidebarAutoCollapse">Auto-collapse sidebar after idle (uncheck to keep expanded)</label>
        </div>
        <div class="form-group" id="settingSidebarCollapseSecondsWrap">
          <label>Collapse after (seconds)</label>
          <input type="number" id="settingSidebarCollapseSeconds" min="3" max="120" value="${Math.min(
            120,
            Math.max(3, settings.sidebarCollapseSeconds ?? 10),
          )}">
          <p class="form-hint">When auto-collapse is on: sidebar shrinks after idle. Ctrl+Left at main menu can collapse when enabled. You can drag the window to any monitor.</p>
        </div>
      </div>
          </div>
          <div class="settings-tab-panel" id="panel-appearance">
      <div class="form-group">
        <label>Theme and style</label>
        <div class="form-row">
          <div class="form-group">
            <label>Theme</label>
            <select id="settingTheme">
              <option value="dark" ${
                settings.theme === 'light' ? '' : 'selected'
              }>Dark</option>
              <option value="light" ${
                settings.theme === 'light' ? 'selected' : ''
              }>Light</option>
            </select>
          </div>
          <div class="form-group">
            <label>Accent color</label>
            <input type="color" id="settingAccentColor" value="${(
              settings.accentColor || '#5b7cfa'
            ).slice(0, 7)}">
          </div>
        </div>
        <div class="checkbox-group">
          <input type="checkbox" id="settingCompactList" ${
            settings.compactList ? 'checked' : ''
          }>
          <label for="settingCompactList">Compact list (smaller font, tighter rows)</label>
        </div>
        <div class="checkbox-group">
          <input type="checkbox" id="settingSoundOnAction" ${
            settings.soundOnAction ? 'checked' : ''
          }>
          <label for="settingSoundOnAction">Play sound when action is sent</label>
        </div>
      </div>
          </div>
          <div class="settings-tab-panel" id="panel-rp">
      <div class="form-group">
        <label>Mechanic RP delay (seconds between /me lines)</label>
        <input type="number" id="settingMechanicRPDelaySeconds" min="1" max="60" value="${Math.min(
          60,
          Math.max(1, settings.mechanicRPDelaySeconds ?? 5),
        )}">
        <p class="form-hint">Repairs, mods, and tow vehicle. Increase if /me lines fly by too fast (default 5).</p>
      </div>
      <div class="form-group">
        <label>SD Uniform/Equipment — Uniform macro</label>
        <p class="form-hint">Starts with /fl, then: Clothes (Enter) → Uniform (Down×1, Enter) → Select jump2 (Down×64, Enter). Long downs are fast.</p>
        <div class="form-row">
          <div class="form-group">
            <label>Delay (ms)</label>
            <input type="number" id="settingUniformDelayMs" min="0" max="5000" step="50" value="${Math.min(
              5000,
              Math.max(
                0,
                settings.clockInMacros?.uniform?.delayMs ?? 100,
              ),
            )}">
          </div>
        </div>
        <div class="macro-steps" id="uniformMacroSteps"></div>
        <div class="form-row form-wrap" style="margin-top:8px;gap:8px;">
          <button type="button" class="btn-secondary" id="btnUniformAddStep">Add step</button>
          <button type="button" class="btn-secondary" id="btnUniformReset">Reset to default</button>
        </div>
      </div>
      <div class="form-group">
        <label>SD Uniform/Equipment — Weapons macro</label>
        <p class="form-hint">Starts with /fl, then: Select weapons (Down×1, Enter) → Remove all defaults (Enter) → Stungun → Night stick → Pistol .50 → Bump shotgun.</p>
        <div class="form-row">
          <div class="form-group">
            <label>Delay (ms)</label>
            <input type="number" id="settingWeaponsDelayMs" min="0" max="5000" step="50" value="${Math.min(
              5000,
              Math.max(
                0,
                settings.clockInMacros?.weapons?.delayMs ?? 100,
              ),
            )}">
          </div>
        </div>
        <div class="macro-steps" id="weaponsMacroSteps"></div>
        <div class="form-row form-wrap" style="margin-top:8px;gap:8px;">
          <button type="button" class="btn-secondary" id="btnWeaponsAddStep">Add step</button>
          <button type="button" class="btn-secondary" id="btnWeaponsReset">Reset to default</button>
        </div>
      </div>
          </div>
          <div class="settings-tab-panel" id="panel-shortcuts">
      <div class="form-group">
        <label>Navigation keybinds</label>
        <p class="form-hint">Use format: Control+Up, Alt+1, etc. Ctrl is accepted as Control.</p>
        <div class="form-row form-wrap">
          <div class="form-group keybind-row">
            <label>Nav Up</label>
            <input type="text" id="settingNavUpAccel" value="${escapeHtml(
              settings.navUpAccel || 'Control+Up',
            )}" placeholder="Control+Up">
          </div>
          <div class="form-group keybind-row">
            <label>Nav Down</label>
            <input type="text" id="settingNavDownAccel" value="${escapeHtml(
              settings.navDownAccel || 'Control+Down',
            )}" placeholder="Control+Down">
          </div>
          <div class="form-group keybind-row">
            <label>Nav Left</label>
            <input type="text" id="settingNavLeftAccel" value="${escapeHtml(
              settings.navLeftAccel || 'Control+Left',
            )}" placeholder="Control+Left">
          </div>
          <div class="form-group keybind-row">
            <label>Nav Right</label>
            <input type="text" id="settingNavRightAccel" value="${escapeHtml(
              settings.navRightAccel || 'Control+Right',
            )}" placeholder="Control+Right">
          </div>
          <div class="form-group keybind-row">
            <label>Expand sidebar</label>
            <input type="text" id="settingExpandAccel" value="${escapeHtml(
              settings.expandAccel || 'Control+Shift+Right',
            )}" placeholder="Control+Shift+Right">
          </div>
        </div>
        <div class="form-group">
          <label>Quick bar hotkeys (slot 1–6)</label>
          <div class="checkbox-group">
            <input type="checkbox" id="settingQuickBarHotkeysEnabled" ${
              settings.quickBarHotkeysEnabled !== false ? 'checked' : ''
            }>
            <label for="settingQuickBarHotkeysEnabled">Enable quick bar hotkeys</label>
          </div>
          <p class="form-hint">Key to run quick bar slot without opening menu. Leave empty to disable that slot.</p>
          <div class="form-row form-wrap" id="quickBarKeysWrap">
            ${[1, 2, 3, 4, 5, 6]
              .map((i) => {
                const raw = (settings.quickBarKeys || [])[i - 1];
                const val =
                  !raw || /^Control\+\d$/.test(String(raw).trim())
                    ? 'Alt+' + i
                    : raw;
                return `<div class="form-group keybind-row"><label>Slot ${i}</label><input type="text" id="settingQuickBarKey${i}" value="${escapeHtml(
                  val || 'Alt+' + i,
                )}" placeholder="Alt+${i}"></div>`;
              })
              .join('')}
          </div>
        </div>
      </div>
          </div>
          <div class="settings-tab-panel" id="panel-menu">
      <div class="form-group">
        <label>Quick bar (up to 6 actions)</label>
        <div class="quick-bar-settings" id="quickBarSettings"></div>
      </div>
      <div class="checkbox-group">
        <input type="checkbox" id="settingActionLogEnabled" ${
          settings.actionLogEnabled !== false ? 'checked' : ''
        }>
        <label for="settingActionLogEnabled">Show action log</label>
      </div>
      <div class="form-group">
        <label>Action log max entries</label>
        <input type="number" id="settingActionLogMax" min="10" max="50" value="${
          settings.actionLogMax ?? 20
        }">
      </div>
      <div class="form-group">
        <label>Menu order</label>
        <p class="form-hint">Change the order of main menu categories. Use ↑ ↓ to move.</p>
        <div id="menuOrderListContainer" class="menu-order-list"></div>
      </div>
          </div>
          <div class="settings-tab-panel" id="panel-dev">
      <div class="form-group">
        <div class="checkbox-group">
          <input type="checkbox" id="settingDevMode" ${
            settings.devMode ? 'checked' : ''
          }>
          <label for="settingDevMode">Development / Sandbox mode</label>
        </div>
        <p class="form-hint">When enabled, actions show a preview of what would be sent to the game instead of actually running. Use this to test without GTA running.</p>
      </div>
      <div class="form-group" id="devModeTimedPreviewWrap" style="${settings.devMode ? '' : 'display:none'}">
        <div class="checkbox-group">
          <input type="checkbox" id="settingDevModeTimedPreview" ${
            settings.devModeTimedPreview !== false ? 'checked' : ''
          }>
          <label for="settingDevModeTimedPreview">Timed simulator (countdown between steps)</label>
        </div>
        <p class="form-hint">When on: preview plays with real timing (e.g. 5s between mechanic RP steps). When off: show all RP at once.</p>
      </div>
          </div>
          <div class="settings-tab-panel" id="panel-data">
      <div class="form-group">
        <label>Import / Export</label>
        <div class="form-row">
          <button type="button" class="btn btn-secondary" id="btnExportSettings">Export</button>
          <button type="button" class="btn btn-secondary" id="btnImportSettings">Import</button>
        </div>
        <input type="file" id="importFileInput" accept=".json" style="display:none">
      </div>
          </div>
        </div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn" id="modalSaveSettings">Save</button>
        <button type="button" class="btn btn-secondary" id="modalCancel">Cancel</button>
      </div>
    `;
    document.querySelectorAll('.settings-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document
          .querySelectorAll('.settings-tab')
          .forEach((t) => t.classList.remove('active'));
        document
          .querySelectorAll('.settings-tab-panel')
          .forEach((p) => p.classList.remove('active'));
        tab.classList.add('active');
        const panel = document.getElementById(
          'panel-' + tab.getAttribute('data-tab'),
        );
        if (panel) panel.classList.add('active');
      });
    });

    const DEFAULT_UNIFORM_SEQUENCES = [
      {
        name: 'Clothes',
        steps: [{ key: 'enter', count: 1 }],
      },
      {
        name: 'Uniform',
        steps: [
          { key: 'down', count: 1 },
          { key: 'enter', count: 1 },
        ],
      },
      {
        name: 'Select jump2',
        steps: [
          { key: 'down', count: 64 },
          { key: 'enter', count: 1 },
        ],
      },
    ];
    const DEFAULT_UNIFORM_MACRO = {
      sequenceVersion: 2,
      delayMs: 100,
      sequences: DEFAULT_UNIFORM_SEQUENCES,
      steps: DEFAULT_UNIFORM_SEQUENCES.flatMap((s) => s.steps),
    };
    const DEFAULT_WEAPONS_SEQUENCES = [
      {
        name: 'Select weapons menu',
        steps: [
          { key: 'down', count: 1 },
          { key: 'enter', count: 1 },
        ],
      },
      {
        name: 'Remove all default weapons',
        steps: [{ key: 'enter', count: 1 }],
      },
      {
        name: 'Select stungun',
        steps: [
          { key: 'down', count: 1 },
          { key: 'enter', count: 1 },
          { key: 'enter', count: 1 },
          { key: 'backspace', count: 1 },
        ],
      },
      {
        name: 'Select night stick',
        steps: [
          { key: 'down', count: 2 },
          { key: 'enter', count: 1 },
          { key: 'enter', count: 1 },
          { key: 'backspace', count: 1 },
        ],
      },
      {
        name: 'Select pistol .50',
        steps: [
          { key: 'down', count: 5 },
          { key: 'enter', count: 1 },
          { key: 'enter', count: 1 },
          { key: 'backspace', count: 1 },
        ],
      },
      {
        name: 'Select bump shotgun',
        steps: [
          { key: 'down', count: 17 },
          { key: 'enter', count: 1 },
          { key: 'enter', count: 1 },
          { key: 'backspace', count: 1 },
        ],
      },
    ];
    const DEFAULT_WEAPONS_MACRO = {
      sequenceVersion: 5,
      delayMs: 100,
      sequences: DEFAULT_WEAPONS_SEQUENCES,
      steps: DEFAULT_WEAPONS_SEQUENCES.flatMap((s) => s.steps),
    };
    const MACRO_KEY_OPTIONS = [
      ['enter', 'Enter'],
      ['down', 'Down'],
      ['up', 'Up'],
      ['left', 'Left'],
      ['right', 'Right'],
      ['backspace', 'Backspace'],
      ['escape', 'Escape'],
      ['tab', 'Tab'],
      ['space', 'Space'],
    ];
    function createMacroEditor(opts) {
      const {
        stepsContainerId,
        delayInputId,
        addBtnId,
        resetBtnId,
        defaults,
        initialSteps,
      } = opts;
      let steps = (initialSteps || defaults.steps).map((s) => ({
        key: s.key || 'enter',
        count: Math.max(1, Math.min(200, parseInt(s.count, 10) || 1)),
      }));
      function render() {
        const wrap = document.getElementById(stepsContainerId);
        if (!wrap) return;
        wrap.innerHTML = '';
        steps.forEach((step, idx) => {
          const row = document.createElement('div');
          row.className = 'macro-step-row';
          const keySel = document.createElement('select');
          keySel.className = 'macro-step-key';
          keySel.innerHTML = MACRO_KEY_OPTIONS.map(
            ([val, label]) =>
              `<option value="${val}" ${
                step.key === val ? 'selected' : ''
              }>${label}</option>`,
          ).join('');
          keySel.addEventListener('change', () => {
            steps[idx].key = keySel.value;
          });
          const countInput = document.createElement('input');
          countInput.type = 'number';
          countInput.className = 'macro-step-count';
          countInput.min = '1';
          countInput.max = '200';
          countInput.value = String(step.count);
          countInput.title = 'Times to press';
          countInput.addEventListener('change', () => {
            steps[idx].count = Math.max(
              1,
              Math.min(200, parseInt(countInput.value, 10) || 1),
            );
            countInput.value = String(steps[idx].count);
          });
          const removeBtn = document.createElement('button');
          removeBtn.type = 'button';
          removeBtn.className = 'btn-secondary macro-step-remove';
          removeBtn.textContent = '×';
          removeBtn.title = 'Remove step';
          removeBtn.addEventListener('click', () => {
            steps.splice(idx, 1);
            render();
          });
          row.appendChild(keySel);
          row.appendChild(countInput);
          row.appendChild(removeBtn);
          wrap.appendChild(row);
        });
        if (!steps.length) {
          wrap.innerHTML =
            '<p class="form-hint">No steps — add at least one, or reset to default.</p>';
        }
      }
      render();
      const addBtn = document.getElementById(addBtnId);
      if (addBtn) {
        addBtn.addEventListener('click', () => {
          steps.push({ key: 'down', count: 1 });
          render();
        });
      }
      const resetBtn = document.getElementById(resetBtnId);
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          steps = defaults.steps.map((s) => ({ ...s }));
          const delayEl = document.getElementById(delayInputId);
          if (delayEl) delayEl.value = String(defaults.delayMs);
          render();
        });
      }
      return {
        getSteps: () => steps,
        getDefaults: () => defaults,
      };
    }
    const savedUniform = settings.clockInMacros?.uniform;
    const uniformStepsInitial =
      savedUniform &&
      (savedUniform.sequenceVersion || 0) >= DEFAULT_UNIFORM_MACRO.sequenceVersion
        ? savedUniform.sequences
          ? savedUniform.sequences.flatMap((s) => s.steps || [])
          : savedUniform.steps
        : DEFAULT_UNIFORM_MACRO.steps;
    const uniformMacroEditor = createMacroEditor({
      stepsContainerId: 'uniformMacroSteps',
      delayInputId: 'settingUniformDelayMs',
      addBtnId: 'btnUniformAddStep',
      resetBtnId: 'btnUniformReset',
      defaults: DEFAULT_UNIFORM_MACRO,
      initialSteps: uniformStepsInitial,
    });
    const savedWeapons = settings.clockInMacros?.weapons;
    const weaponsStepsInitial =
      savedWeapons &&
      (savedWeapons.sequenceVersion || 0) >= DEFAULT_WEAPONS_MACRO.sequenceVersion
        ? savedWeapons.sequences
          ? savedWeapons.sequences.flatMap((s) => s.steps || [])
          : savedWeapons.steps
        : DEFAULT_WEAPONS_MACRO.steps;
    const weaponsMacroEditor = createMacroEditor({
      stepsContainerId: 'weaponsMacroSteps',
      delayInputId: 'settingWeaponsDelayMs',
      addBtnId: 'btnWeaponsAddStep',
      resetBtnId: 'btnWeaponsReset',
      defaults: DEFAULT_WEAPONS_MACRO,
      initialSteps: weaponsStepsInitial,
    });

    const devModeCheck = document.getElementById('settingDevMode');
    const timedPreviewWrap = document.getElementById('devModeTimedPreviewWrap');
    if (devModeCheck && timedPreviewWrap) {
      devModeCheck.addEventListener('change', () => {
        timedPreviewWrap.style.display = devModeCheck.checked ? '' : 'none';
      });
    }
    const flat = getFlattenedItems();
    const qbSettings = document.getElementById('quickBarSettings');
    const quickBar = settings.quickBar || [];
    for (let i = 0; i < 6; i++) {
      const entry = quickBar[i] || {};
      const sel = document.createElement('select');
      sel.id = 'settingQuickBar' + i;
      sel.className = 'quick-bar-select';
      sel.innerHTML =
        '<option value="">— None —</option>' +
        flat.map(
          (f) =>
            `<option value="${escapeHtml(f.item.actionId)}" data-label="${escapeHtml(
              f.item.label || '',
            )}" ${
              entry.actionId === f.item.actionId ? 'selected' : ''
            }>${escapeHtml(
              f.path.length
                ? f.path.join(' › ') + ' › ' + f.item.label
                : f.item.label,
            )}</option>`,
        ).join('');
      qbSettings.appendChild(sel);
    }
    const opacitySlider = document.getElementById('settingWindowOpacity');
    const opacityValue = document.getElementById('settingWindowOpacityValue');
    if (opacitySlider && opacityValue) {
      opacitySlider.addEventListener('input', () => {
        opacityValue.textContent = opacitySlider.value + '%';
      });
    }
    const rootMenu = window.buildMenu(settings);
    const defaultIds = rootMenu.map((x) => x.id);
    let menuOrderCurrent = (settings.menuOrder || []).filter((id) =>
      defaultIds.includes(id),
    );
    defaultIds.forEach((id) => {
      if (!menuOrderCurrent.includes(id)) menuOrderCurrent.push(id);
    });
    const idToLabel = Object.fromEntries(rootMenu.map((x) => [x.id, x.label]));
    const menuOrderContainer = document.getElementById(
      'menuOrderListContainer',
    );
    function renderMenuOrderList() {
      menuOrderContainer.innerHTML = '';
      menuOrderCurrent.forEach((id, i) => {
        const row = document.createElement('div');
        row.className = 'menu-order-row';
        const label = idToLabel[id] || id;
        row.innerHTML = `
          <span class="menu-order-label">${escapeHtml(label)}</span>
          <div class="menu-order-btns">
            <button type="button" class="btn-icon btn-order" data-dir="up" data-index="${i}" ${
              i === 0 ? 'disabled' : ''
            } title="Move up">↑</button>
            <button type="button" class="btn-icon btn-order" data-dir="down" data-index="${i}" ${
              i === menuOrderCurrent.length - 1 ? 'disabled' : ''
            } title="Move down">↓</button>
          </div>
        `;
        row.querySelectorAll('.btn-order').forEach((btn) => {
          btn.onclick = () => {
            const idx = parseInt(btn.getAttribute('data-index'), 10);
            const dir = btn.getAttribute('data-dir');
            if (dir === 'up' && idx > 0) {
              [menuOrderCurrent[idx - 1], menuOrderCurrent[idx]] = [
                menuOrderCurrent[idx],
                menuOrderCurrent[idx - 1],
              ];
            } else if (dir === 'down' && idx < menuOrderCurrent.length - 1) {
              [menuOrderCurrent[idx], menuOrderCurrent[idx + 1]] = [
                menuOrderCurrent[idx + 1],
                menuOrderCurrent[idx],
              ];
            }
            renderMenuOrderList();
          };
        });
        menuOrderContainer.appendChild(row);
      });
    }
    renderMenuOrderList();
    document.getElementById('modalSaveSettings').onclick = () => {
      const department = document.getElementById('settingDepartment').value;
      const quickBar = [];
      for (let i = 0; i < 6; i++) {
        const sel = document.getElementById('settingQuickBar' + i);
        if (sel && sel.value) {
          const opt = sel.options[sel.selectedIndex];
          quickBar.push({
            actionId: sel.value,
            label: opt.getAttribute('data-label') || opt.textContent,
          });
        }
      }
      settings = {
        ...settings,
        department,
        departmentFullName:
          document.getElementById('settingDepartmentFullName').value.trim() ||
          (department === 'SD' ? 'LSSD' : 'LSPD'),
        badgeNumber:
          document.getElementById('settingBadge').value.trim() ||
          settings.badgeNumber,
        callsign:
          document.getElementById('settingCallsign').value.trim() ||
          (typeof settings.callsign === 'string' ? settings.callsign : '228B'),
        pronouns: {
          subject:
            document.getElementById('settingPronounSubject').value.trim() ||
            'he',
          possessive:
            document.getElementById('settingPronounPossessive').value.trim() ||
            'his',
        },
        targetExe:
          document.getElementById('settingTargetExe').value.trim() ||
          'FiveM_GTAProcess.exe',
        menuOrder: menuOrderCurrent,
        theme: document.getElementById('settingTheme').value,
        accentColor:
          document.getElementById('settingAccentColor').value || '#5b7cfa',
        compactList: document.getElementById('settingCompactList').checked,
        soundOnAction: document.getElementById('settingSoundOnAction').checked,
        mechanicRPDelaySeconds: Math.min(
          60,
          Math.max(
            1,
            parseInt(
              document.getElementById('settingMechanicRPDelaySeconds').value,
              10,
            ) || 5,
          ),
        ),
        clockInMacros: {
          ...(settings.clockInMacros || {}),
          uniform: {
            sequenceVersion: DEFAULT_UNIFORM_MACRO.sequenceVersion,
            delayMs: Math.min(
              5000,
              Math.max(
                0,
                parseInt(
                  document.getElementById('settingUniformDelayMs')?.value,
                  10,
                ) || 100,
              ),
            ),
            steps: (() => {
              const list = uniformMacroEditor.getSteps();
              const fallback = uniformMacroEditor.getDefaults().steps;
              return (list.length ? list : fallback).map((s) => ({
                key: s.key || 'enter',
                count: Math.max(1, Math.min(200, parseInt(s.count, 10) || 1)),
              }));
            })(),
          },
          weapons: {
            sequenceVersion: DEFAULT_WEAPONS_MACRO.sequenceVersion,
            delayMs: Math.min(
              5000,
              Math.max(
                0,
                parseInt(
                  document.getElementById('settingWeaponsDelayMs')?.value,
                  10,
                ) || 100,
              ),
            ),
            steps: (() => {
              const list = weaponsMacroEditor.getSteps();
              const fallback = weaponsMacroEditor.getDefaults().steps;
              return (list.length ? list : fallback).map((s) => ({
                key: s.key || 'enter',
                count: Math.max(1, Math.min(200, parseInt(s.count, 10) || 1)),
              }));
            })(),
          },
        },
        devMode: document.getElementById('settingDevMode')?.checked || false,
        devModeTimedPreview: document.getElementById('settingDevModeTimedPreview')?.checked !== false,
        navUpAccel: (
          document.getElementById('settingNavUpAccel').value || 'Control+Up'
        )
          .trim()
          .replace(/\bCtrl\b/gi, 'Control'),
        navDownAccel: (
          document.getElementById('settingNavDownAccel').value || 'Control+Down'
        )
          .trim()
          .replace(/\bCtrl\b/gi, 'Control'),
        navLeftAccel: (
          document.getElementById('settingNavLeftAccel').value || 'Control+Left'
        )
          .trim()
          .replace(/\bCtrl\b/gi, 'Control'),
        navRightAccel: (
          document.getElementById('settingNavRightAccel').value ||
          'Control+Right'
        )
          .trim()
          .replace(/\bCtrl\b/gi, 'Control'),
        expandAccel: (
          document.getElementById('settingExpandAccel').value ||
          'Control+Shift+Right'
        )
          .trim()
          .replace(/\bCtrl\b/gi, 'Control'),
        quickBarHotkeysEnabled: document.getElementById(
          'settingQuickBarHotkeysEnabled',
        ).checked,
        quickBarKeys: [1, 2, 3, 4, 5, 6].map((i) => {
          const v = document
            .getElementById('settingQuickBarKey' + i)
            .value.trim()
            .replace(/\bCtrl\b/gi, 'Control');
          return v || '';
        }),
        mousePassThrough: document.getElementById('settingMousePassThrough')
          .checked,
        borderless: document.getElementById('settingBorderless').checked,
        windowWidth: Math.min(
          800,
          Math.max(
            240,
            parseInt(document.getElementById('settingWindowWidth').value, 10) ||
              320,
          ),
        ),
        windowHeight: Math.min(
          900,
          Math.max(
            300,
            parseInt(
              document.getElementById('settingWindowHeight').value,
              10,
            ) || 560,
          ),
        ),
        windowOpacity: Math.min(
          100,
          Math.max(
            15,
            parseInt(
              document.getElementById('settingWindowOpacity').value,
              10,
            ) || 100,
          ),
        ),
        sidebarAutoCollapse: document.getElementById(
          'settingSidebarAutoCollapse',
        ).checked,
        sidebarCollapseSeconds: Math.min(
          120,
          Math.max(
            3,
            parseInt(
              document.getElementById('settingSidebarCollapseSeconds').value,
              10,
            ) || 10,
          ),
        ),
        quickBar,
        actionLogEnabled: document.getElementById('settingActionLogEnabled')
          .checked,
        actionLogMax: Math.min(
          50,
          Math.max(
            10,
            parseInt(
              document.getElementById('settingActionLogMax').value,
              10,
            ) || 20,
          ),
        ),
      };
      window.api.saveSettings(settings).then((s) => {
        settings = s;
        refreshMenu();
        updateCurrentUnit();
        applyTheme(s);
        applyCompactList();
        if (actionLogWrapEl)
          actionLogWrapEl.style.display =
            s.actionLogEnabled !== false ? 'flex' : 'none';
        closeModal();
      });
    };
    document.getElementById('btnExportSettings').onclick = () => {
      window.api.exportSettings().then((json) => {
        const a = document.createElement('a');
        a.href =
          'data:application/json;charset=utf-8,' + encodeURIComponent(json);
        a.download = 'kwaais-rp-desk-settings.json';
        a.click();
      });
    };
    document.getElementById('btnImportSettings').onclick = () =>
      document.getElementById('importFileInput').click();
    document.getElementById('importFileInput').onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result;
        if (typeof text !== 'string') return;
        window.api
          .importSettings(text)
          .then((s) => {
            settings = s;
            refreshMenu();
            showToast('Settings imported');
            closeModal();
          })
          .catch((err) => showToast(err.message || 'Import failed', 'error'));
      };
      reader.readAsText(file);
      e.target.value = '';
    };
    document.getElementById('modalCancel').onclick = closeModal;
    window.api.setModalOpen(true);
    modalOverlay.classList.remove('hidden');
  }

  searchInputEl.addEventListener('input', () => {
    searchQuery = searchInputEl.value;
    if (searchQuery.trim()) {
      stack = [];
      selectedIndex = 0;
    }
    render();
  });
  searchInputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchQuery = '';
      searchInputEl.value = '';
      searchInputEl.blur();
      if (stack.length === 0) currentItems = buildRootItems();
      render();
    }
  });

  actionLogToggleEl.addEventListener('click', () => {
    actionLogWrapEl.classList.toggle('collapsed');
  });

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveSelection(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveSelection(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        activateSelected();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (stack.length === 0) window.api.requestCollapse();
        else goBack();
      }
    }
    if (e.key === 'Escape') {
      if (!modalOverlay.classList.contains('hidden')) closeModal();
      else if (searchQuery.trim()) {
        searchQuery = '';
        searchInputEl.value = '';
        if (stack.length === 0) currentItems = buildRootItems();
        render();
      } else goBack();
    }
  });

  const btnQuit = document.getElementById('btnQuit');
  btnQuit.addEventListener('click', () => window.api.quitApp());
  btnSettings.addEventListener('click', openSettings);

  if (mechanicDelaySlider) {
    mechanicDelaySlider.addEventListener('input', () => {
      const v = parseInt(mechanicDelaySlider.value, 10);
      if (!Number.isNaN(v) && v >= 1 && v <= 30) {
        if (mechanicDelayValue) mechanicDelayValue.textContent = String(v);
        settings = { ...settings, mechanicRPDelaySeconds: v };
        window.api.saveSettings(settings).then((updated) => {
          settings = updated;
        });
      }
    });
  }

  const headerTop = document.querySelector('.header-top');
  if (headerTop && typeof window.api?.windowDragStart === 'function') {
    let dragging = false;
    headerTop.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      dragging = true;
      window.api.windowDragStart(e.screenX, e.screenY);
    });
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      window.api.windowDragMove(e.screenX, e.screenY);
    });
    document.addEventListener('mouseup', () => {
      if (dragging) {
        dragging = false;
        window.api.windowDragEnd();
      }
    });
  }
  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  const profilePickerOverlay = document.getElementById('profilePickerOverlay');

  function finishStartup() {
    if (profilePickerOverlay) profilePickerOverlay.classList.add('hidden');
    applyAdminVisibility();
    refreshMenu();
    updateCurrentUnit();
    applyTheme(settings);
    applyCompactList();
    updateGameStatus();
    setInterval(updateGameStatus, 5000);
    if (actionLogWrapEl)
      actionLogWrapEl.style.display =
        settings.actionLogEnabled !== false ? 'flex' : 'none';
    /* Mouse pass-through is handled by main process (focus/blur). Only ensure mouse works when it's off. */
    if (settings.mousePassThrough !== true) {
      window.api.setIgnoreMouseEvents(false);
    }
  }

  window.api.getSettings().then((s) => {
    settings = s;
    if (settings.department === 'Admin' && settings.adminUnlocked !== true) {
      settings = { ...settings, department: 'PD' };
    }
    applyTheme(s);
    applyAdminVisibility();
    if (profilePickerOverlay) {
      profilePickerOverlay
        .querySelectorAll('.profile-picker-btn')
        .forEach((btn) => {
          btn.onclick = () => {
            const dept = btn.getAttribute('data-department');
            if (!dept) return;
            if (dept === 'Admin' && settings.adminUnlocked !== true) return;
            settings = { ...settings, department: dept };
            window.api.saveSettings(settings).then((updated) => {
              settings = updated;
              finishStartup();
            });
          };
        });
      const dept = (settings.department || '').trim();
      if (dept) {
        profilePickerOverlay.classList.add('hidden');
        finishStartup();
      } else {
        window.api.saveSettings(settings);
      }
    } else {
      finishStartup();
    }
  });

  async function openAbout() {
    window.api.focusApp();
    window.api.setIgnoreMouseEvents(false);
    const v = await window.api.getAppVersion().then((x) => x || '1.0.0');
    modalTitle.textContent = 'About';
    modalBody.innerHTML = `
      <div class="settings-tabs">
        <div class="settings-tab-bar">
          <button type="button" class="settings-tab active" data-tab="about">About</button>
          <button type="button" class="settings-tab" data-tab="changelog">Changelog</button>
        </div>
        <div class="settings-tab-panels">
          <div class="settings-tab-panel active" id="about-panel-about">
            <p><strong>KWAAI's RP DESK</strong></p>
            <p>PD, SD &amp; Mechanic RP overlay for FiveM / GTA V. Duty commands, penal code, quick actions, mechanic repairs &amp; more.</p>
            <p class="about-version">Version ${String(v).replace(/</g, '&lt;')}</p>
            <p class="about-version">Created by KWAAI</p>
            <p class="about-contact">Contact: Discord <strong>dirtyddawg</strong> — suggestions &amp; bug reports</p>
          </div>
          <div class="settings-tab-panel" id="about-panel-changelog">
            <div class="changelog-entry">
              <h4 class="changelog-version">v1.0.0</h4>
              <p class="changelog-desc">Initial release. PD, SD &amp; Mechanic duty overlay with Ctrl+Arrow navigation, radio commands, citations, pursuits, penal code, animations, quick bar, and mechanic RP.</p>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-actions"><button type="button" class="btn" id="aboutDone">Done</button></div>
    `;
    modalBody.querySelectorAll('.settings-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        modalBody.querySelectorAll('.settings-tab').forEach((t) => t.classList.remove('active'));
        modalBody.querySelectorAll('.settings-tab-panel').forEach((p) => p.classList.remove('active'));
        tab.classList.add('active');
        const panel = modalBody.querySelector('#about-panel-' + tab.getAttribute('data-tab'));
        if (panel) panel.classList.add('active');
      });
    });
    document.getElementById('aboutDone').onclick = closeModal;
    window.api.setModalOpen(true);
    modalOverlay.classList.remove('hidden');
  }

  document.getElementById('btnAbout').addEventListener('click', openAbout);

  const departmentBadge = document.getElementById('departmentBadge');
  const departmentDropdown = document.getElementById('departmentDropdown');
  if (departmentBadge && departmentDropdown) {
    departmentBadge.addEventListener('click', (e) => {
      e.stopPropagation();
      departmentDropdown.classList.toggle('hidden');
    });
    departmentDropdown.querySelectorAll('.department-option').forEach((btn) => {
      btn.addEventListener('click', () => {
        const dept = btn.getAttribute('data-department');
        if (!dept || dept === (settings.department || 'PD')) {
          departmentDropdown.classList.add('hidden');
          return;
        }
        if (dept === 'Admin' && settings.adminUnlocked !== true) {
          departmentDropdown.classList.add('hidden');
          return;
        }
        settings = { ...settings, department: dept };
        window.api.saveSettings(settings).then((updated) => {
          settings = updated;
          departmentDropdown.classList.add('hidden');
          refreshMenu();
          updateCurrentUnit();
          showToast(`Switched to ${dept}`);
        });
      });
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.department-switcher')) departmentDropdown.classList.add('hidden');
    });
  }

  const unitDropdown = document.getElementById('unitDropdown');
  if (currentUnitEl && unitDropdown) {
    currentUnitEl.addEventListener('click', (e) => {
      e.stopPropagation();
      const dept = settings.department || 'PD';
      if (dept === 'Mechanic') return;
      unitDropdown.classList.toggle('hidden');
    });
    unitDropdown.querySelectorAll('.unit-option').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        unitDropdown.classList.add('hidden');
        if (action === 'JoinUnit') {
          openInputModal({ actionId: 'JoinUnit', needsInput: true, label: 'Join unit' });
        } else if (action === 'RenameUnit') {
          openInputModal({ actionId: 'RenameUnit', needsInput: true, label: 'Change unit' });
        }
      });
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.unit-switcher')) unitDropdown.classList.add('hidden');
    });
  }

  window.api.onOpenSettings(() => {
    if (modalOverlay.classList.contains('hidden')) openSettings();
  });

  window.api.onNav((direction) => {
    if (!modalOverlay.classList.contains('hidden')) return;
    switch (direction) {
      case 'up':
        moveSelection(-1);
        break;
      case 'down':
        moveSelection(1);
        break;
      case 'left':
        if (stack.length === 0) window.api.requestCollapse();
        else goBack();
        break;
      case 'right':
        activateSelected();
        break;
    }
  });

  if (btnBack) btnBack.addEventListener('click', goBack);

  window.api.onRunQuickBarSlot((index) => {
    const bar = settings.quickBar || [];
    const entry = bar[index];
    if (!entry) return;
    const actionId = typeof entry === 'string' ? entry : entry?.actionId;
    if (!actionId) return;
    const label = typeof entry === 'string' ? null : entry?.label;
    const flat = getFlattenedItems();
    const item = flat.find(
      (f) => f.item.actionId === actionId && (!label || f.item.label === label),
    )?.item;
    const displayLabel = label || item?.label || actionId;
    if (item) {
      if (item.actionId === 'CopyBBCODE') copyBBCODEToClipboard(item);
      else if (item.actionId === 'OpenPenalCode') openPenalCodeModal();
      else if (item.needsInput) openInputModal(item);
      else
        runAction(
          actionId,
          item.rpText != null ? { text: item.rpText } : {},
          displayLabel,
        );
    } else runAction(actionId, {}, displayLabel);
  });

  const appEl = document.querySelector('.app');
  const headerEl = document.querySelector('.header');
  window.api.onExpanded(() => {
    if (appEl) appEl.classList.remove('sidebar-collapsed');
  });
  window.api.onCollapsed(() => {
    if (appEl) appEl.classList.add('sidebar-collapsed');
  });
})();
