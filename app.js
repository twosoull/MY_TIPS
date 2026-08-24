(function () {
  "use strict";

  const ITEM_KEY = "myTips.items";
  const TAG_KEY = "myTips.tags";
  const DEFAULT_TAGS = ["운동", "크로스핏", "노래", "요리", "개발", "업무", "인생"];

  const els = {
    search: document.getElementById("searchInput"),
    clearSearch: document.getElementById("clearSearch"),
    filterRow: document.getElementById("filterRow"),
    tipsList: document.getElementById("tipsList"),
    sectionKicker: document.getElementById("sectionKicker"),
    sectionTitle: document.getElementById("sectionTitle"),
    resultCount: document.getElementById("resultCount"),
    newTipButton: document.getElementById("newTipButton"),
    openTagManager: document.getElementById("openTagManager"),
    tipModal: document.getElementById("tipModal"),
    tagModal: document.getElementById("tagModal"),
    tipForm: document.getElementById("tipForm"),
    tipModalTitle: document.getElementById("tipModalTitle"),
    tipContent: document.getElementById("tipContent"),
    contentCount: document.getElementById("contentCount"),
    tipTitle: document.getElementById("tipTitle"),
    formFavorite: document.getElementById("formFavorite"),
    editorTags: document.getElementById("editorTags"),
    deleteTip: document.getElementById("deleteTip"),
    newTagForm: document.getElementById("newTagForm"),
    newTagInput: document.getElementById("newTagInput"),
    managedTags: document.getElementById("managedTags"),
    tagModalTitle: document.getElementById("tagModalTitle"),
    toast: document.getElementById("toast")
  };

  let items = readStorage(ITEM_KEY, []);
  let tags = readStorage(TAG_KEY, DEFAULT_TAGS);
  let activeFilter = "전체";
  let editingId = null;
  let selectedTags = [];
  let formFavorite = false;
  let addTagFromEditor = false;
  let toastTimer;

  function readStorage(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return Array.isArray(value) ? value : fallback.slice();
    } catch (_) {
      return fallback.slice();
    }
  }

  function saveStorage() {
    localStorage.setItem(ITEM_KEY, JSON.stringify(items));
    localStorage.setItem(TAG_KEY, JSON.stringify(tags));
  }

  function newId() {
    return window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char];
    });
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.add("show");
    toastTimer = setTimeout(function () { els.toast.classList.remove("show"); }, 1700);
  }

  function dateLabel(value) {
    const date = new Date(value);
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const days = Math.round((start - target) / 86400000);
    if (days === 0) return "오늘";
    if (days === 1) return "어제";
    if (days > 1 && days < 7) return days + "일 전";
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join(".");
  }

  function isToday(value) { return dateLabel(value) === "오늘"; }

  function filteredItems() {
    const query = els.search.value.trim().toLocaleLowerCase("ko");
    return items
      .filter(function (item) {
        const filterMatch = activeFilter === "전체" || (activeFilter === "즐겨찾기" ? item.favorite : item.tags.includes(activeFilter));
        const haystack = [item.title || "", item.content || "", (item.tags || []).join(" ")].join(" ").toLocaleLowerCase("ko");
        return filterMatch && (!query || haystack.includes(query));
      })
      .sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
  }

  function renderFilters() {
    const filters = ["전체", "즐겨찾기"].concat(tags);
    els.filterRow.innerHTML = filters.map(function (tag) {
      const favoriteClass = tag === "즐겨찾기" ? " favorite-filter" : "";
      return '<button class="chip' + favoriteClass + (activeFilter === tag ? " active" : "") + '" type="button" data-filter="' + escapeHtml(tag) + '">' + (tag === "즐겨찾기" ? "☆ " : "") + escapeHtml(tag) + "</button>";
    }).join("");
  }

  function cardTemplate(item) {
    const tagMarkup = (item.tags || []).map(function (tag) { return '<span class="mini-tag">' + escapeHtml(tag) + "</span>"; }).join("");
    return '<article class="tip-card" tabindex="0" data-id="' + item.id + '" aria-label="' + escapeHtml(item.title || "꿀팁 열기") + '">' +
      '<div class="card-top"><div class="card-tags">' + tagMarkup + '</div><button class="favorite-toggle' + (item.favorite ? " active" : "") + '" type="button" data-favorite="' + item.id + '" aria-label="즐겨찾기 ' + (item.favorite ? "해제" : "설정") + '">' + (item.favorite ? "★" : "☆") + "</button></div>" +
      (item.title ? '<h3 class="card-title">' + escapeHtml(item.title) + "</h3>" : "") +
      '<p class="card-content">' + escapeHtml(item.content) + '</p><time class="card-date" datetime="' + escapeHtml(item.createdAt) + '">' + dateLabel(item.createdAt) + "</time></article>";
  }

  function renderItems() {
    const result = filteredItems();
    const searching = Boolean(els.search.value.trim());
    const defaultView = activeFilter === "전체" && !searching;
    const todayExists = result.some(function (item) { return isToday(item.createdAt); });

    els.sectionKicker.textContent = searching ? "SEARCH" : activeFilter === "즐겨찾기" ? "FAVORITES" : activeFilter === "전체" ? (todayExists ? "TODAY" : "MY NOTES") : "TAG";
    els.sectionTitle.textContent = searching ? "검색 결과" : activeFilter === "전체" ? (todayExists ? "오늘의 꿀팁" : "나의 꿀팁") : activeFilter;
    els.resultCount.textContent = result.length ? result.length + "개" : "";

    if (!result.length) {
      const isTrulyEmpty = items.length === 0;
      els.tipsList.innerHTML = '<div class="empty-state"><div class="empty-sky" aria-hidden="true"></div><h3>' + (isTrulyEmpty ? "아직 저장한 꿀팁이 없어요." : "조건에 맞는 꿀팁이 없어요.") + '</h3><p>' + (isTrulyEmpty ? "오늘 깨달은 작은 팁을 기록해보세요." : "검색어나 선택한 필터를 바꿔보세요.") + '</p>' + (isTrulyEmpty ? '<button class="empty-action" type="button" id="emptyAction">첫 꿀팁 작성하기</button>' : "") + "</div>";
      const emptyAction = document.getElementById("emptyAction");
      if (emptyAction) emptyAction.addEventListener("click", openNewTip);
      return;
    }

    if (defaultView && todayExists) {
      const today = result.filter(function (item) { return isToday(item.createdAt); });
      const older = result.filter(function (item) { return !isToday(item.createdAt); });
      els.tipsList.innerHTML = today.map(cardTemplate).join("") + (older.length ? '<div class="section-heading older-heading"><div><p class="section-kicker">ARCHIVE</p><h2>이전 꿀팁</h2></div></div>' + older.map(cardTemplate).join("") : "");
    } else {
      els.tipsList.innerHTML = result.map(cardTemplate).join("");
    }
  }

  function renderAll() { renderFilters(); renderItems(); }

  function renderEditorTags() {
    els.editorTags.innerHTML = tags.map(function (tag) {
      return '<button class="chip' + (selectedTags.includes(tag) ? " active" : "") + '" type="button" data-editor-tag="' + escapeHtml(tag) + '">' + escapeHtml(tag) + "</button>";
    }).join("") + '<button class="chip add-tag-chip" type="button" id="addTagFromEditor" aria-label="새 태그 추가">+</button>';
    document.getElementById("addTagFromEditor").addEventListener("click", function () {
      addTagFromEditor = true;
      openTagModal("새 태그");
    });
  }

  function updateFormFavorite() {
    els.formFavorite.textContent = formFavorite ? "★" : "☆";
    els.formFavorite.classList.toggle("active", formFavorite);
    els.formFavorite.setAttribute("aria-label", formFavorite ? "즐겨찾기 해제" : "즐겨찾기 설정");
  }

  function openModal(modal) {
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
  }

  function closeModal(modal) {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    if (!document.querySelector(".modal.open")) document.body.classList.remove("no-scroll");
    if (modal === els.tagModal && addTagFromEditor) addTagFromEditor = false;
  }

  function openNewTip() {
    editingId = null;
    selectedTags = [];
    formFavorite = false;
    els.tipForm.reset();
    els.contentCount.textContent = "0";
    els.tipModalTitle.textContent = "새 꿀팁";
    els.deleteTip.classList.remove("visible");
    renderEditorTags();
    updateFormFavorite();
    openModal(els.tipModal);
    setTimeout(function () { els.tipContent.focus(); }, 260);
  }

  function openEditTip(id) {
    const item = items.find(function (tip) { return tip.id === id; });
    if (!item) return;
    editingId = id;
    selectedTags = (item.tags || []).slice();
    formFavorite = Boolean(item.favorite);
    els.tipContent.value = item.content;
    els.tipTitle.value = item.title || "";
    els.contentCount.textContent = item.content.length;
    els.tipModalTitle.textContent = "꿀팁 수정";
    els.deleteTip.classList.add("visible");
    renderEditorTags();
    updateFormFavorite();
    openModal(els.tipModal);
  }

  function renderManagedTags() {
    if (!tags.length) {
      els.managedTags.innerHTML = '<p class="tag-empty">아직 만든 태그가 없어요.</p>';
      return;
    }
    els.managedTags.innerHTML = tags.map(function (tag) {
      const usage = items.filter(function (item) { return item.tags.includes(tag); }).length;
      return '<div class="managed-tag"><span>' + escapeHtml(tag) + '<small>' + usage + '개</small></span><button type="button" data-delete-tag="' + escapeHtml(tag) + '">삭제</button></div>';
    }).join("");
  }

  function openTagModal(title) {
    els.tagModalTitle.textContent = title || "태그 관리";
    els.newTagForm.reset();
    renderManagedTags();
    openModal(els.tagModal);
    setTimeout(function () { els.newTagInput.focus(); }, 230);
  }

  function addTag(name) {
    const clean = name.trim().replace(/\s+/g, " ");
    if (!clean) return false;
    if (["전체", "즐겨찾기"].includes(clean) || tags.some(function (tag) { return tag.toLocaleLowerCase("ko") === clean.toLocaleLowerCase("ko"); })) {
      showToast("이미 있는 태그예요");
      return false;
    }
    tags.push(clean);
    if (addTagFromEditor) selectedTags.push(clean);
    saveStorage();
    renderAll();
    renderManagedTags();
    renderEditorTags();
    showToast("태그를 추가했어요");
    return true;
  }

  els.filterRow.addEventListener("click", function (event) {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    activeFilter = button.dataset.filter;
    renderAll();
  });

  els.tipsList.addEventListener("click", function (event) {
    const favorite = event.target.closest("[data-favorite]");
    if (favorite) {
      event.stopPropagation();
      const item = items.find(function (tip) { return tip.id === favorite.dataset.favorite; });
      if (item) { item.favorite = !item.favorite; item.updatedAt = new Date().toISOString(); saveStorage(); renderItems(); }
      return;
    }
    const card = event.target.closest("[data-id]");
    if (card) openEditTip(card.dataset.id);
  });

  els.tipsList.addEventListener("keydown", function (event) {
    const card = event.target.closest("[data-id]");
    if (card && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); openEditTip(card.dataset.id); }
  });

  els.search.addEventListener("input", function () {
    els.clearSearch.classList.toggle("visible", Boolean(els.search.value));
    renderItems();
  });

  els.clearSearch.addEventListener("click", function () {
    els.search.value = "";
    els.clearSearch.classList.remove("visible");
    els.search.focus();
    renderItems();
  });

  els.newTipButton.addEventListener("click", openNewTip);
  els.openTagManager.addEventListener("click", function () { addTagFromEditor = false; openTagModal("태그 관리"); });
  els.formFavorite.addEventListener("click", function () { formFavorite = !formFavorite; updateFormFavorite(); });
  els.tipContent.addEventListener("input", function () { els.contentCount.textContent = els.tipContent.value.length; });

  els.editorTags.addEventListener("click", function (event) {
    const button = event.target.closest("[data-editor-tag]");
    if (!button) return;
    const tag = button.dataset.editorTag;
    selectedTags = selectedTags.includes(tag) ? selectedTags.filter(function (value) { return value !== tag; }) : selectedTags.concat(tag);
    renderEditorTags();
  });

  els.tipForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const content = els.tipContent.value.trim();
    if (!content) { els.tipContent.focus(); return; }
    const now = new Date().toISOString();
    if (editingId) {
      const item = items.find(function (tip) { return tip.id === editingId; });
      if (item) Object.assign(item, { title: els.tipTitle.value.trim(), content: content, tags: selectedTags.slice(), favorite: formFavorite, updatedAt: now });
      showToast("꿀팁을 수정했어요");
    } else {
      items.push({ id: newId(), title: els.tipTitle.value.trim(), content: content, tags: selectedTags.slice(), favorite: formFavorite, createdAt: now, updatedAt: now });
      showToast("꿀팁을 저장했어요");
    }
    saveStorage();
    closeModal(els.tipModal);
    renderAll();
  });

  els.deleteTip.addEventListener("click", function () {
    if (!editingId || !confirm("이 꿀팁을 삭제할까요?")) return;
    items = items.filter(function (item) { return item.id !== editingId; });
    saveStorage();
    closeModal(els.tipModal);
    renderAll();
    showToast("꿀팁을 삭제했어요");
  });

  els.newTagForm.addEventListener("submit", function (event) {
    event.preventDefault();
    if (addTag(els.newTagInput.value)) {
      els.newTagInput.value = "";
      if (addTagFromEditor) closeModal(els.tagModal);
      else els.newTagInput.focus();
    }
  });

  els.managedTags.addEventListener("click", function (event) {
    const button = event.target.closest("[data-delete-tag]");
    if (!button) return;
    const tag = button.dataset.deleteTag;
    const usage = items.filter(function (item) { return item.tags.includes(tag); }).length;
    const message = usage ? '"' + tag + '" 태그를 ' + usage + "개의 꿀팁에서 제거하고 삭제할까요?" : '"' + tag + '" 태그를 삭제할까요?';
    if (!confirm(message)) return;
    tags = tags.filter(function (value) { return value !== tag; });
    items.forEach(function (item) { item.tags = item.tags.filter(function (value) { return value !== tag; }); });
    selectedTags = selectedTags.filter(function (value) { return value !== tag; });
    if (activeFilter === tag) activeFilter = "전체";
    saveStorage();
    renderManagedTags();
    renderEditorTags();
    renderAll();
    showToast("태그를 삭제했어요");
  });

  document.addEventListener("click", function (event) {
    const closer = event.target.closest("[data-close]");
    if (!closer) return;
    closeModal(closer.dataset.close === "tip" ? els.tipModal : els.tagModal);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    if (els.tagModal.classList.contains("open")) closeModal(els.tagModal);
    else if (els.tipModal.classList.contains("open")) closeModal(els.tipModal);
  });

  renderAll();
})();
