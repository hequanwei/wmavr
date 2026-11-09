(function () {
  "use strict";

  var board = document.querySelector("#board");
  var filters = document.querySelector("#filters");
  var search = document.querySelector("#q");
  var count = document.querySelector("#count");
  var dataSet = null;
  var category = "all";

  fetch("../data/directory.json")
    .then(function (response) {
      if (!response.ok) throw new Error("status " + response.status);
      return response.json();
    })
    .then(function (data) {
      dataSet = data;
      var all = document.createElement("button");
      all.type = "button";
      all.textContent = "全部";
      all.setAttribute("aria-pressed", "true");
      all.addEventListener("click", function () { setCategory("all"); });
      filters.appendChild(all);
      data.categories.forEach(function (item) {
        var button = document.createElement("button");
        button.type = "button";
        button.textContent = item.name;
        button.setAttribute("aria-pressed", "false");
        button.addEventListener("click", function () { setCategory(item.id); });
        filters.appendChild(button);
      });
      search.addEventListener("input", paint);
      paint();
    })
    .catch(function () {
      board.textContent = "页面数据没加载出来，请刷新后再试。";
    });

  function setCategory(id) {
    category = id;
    filters.querySelectorAll("button").forEach(function (button, index) {
      var value = index === 0 ? "all" : dataSet.categories[index - 1].id;
      button.setAttribute("aria-pressed", value === id ? "true" : "false");
    });
    paint();
  }

  function matches(tool, query) {
    if (category !== "all" && tool.category !== category) return false;
    if (!query) return true;
    var haystack = (tool.name + " " + tool.summary + " " + tool.tags.join(" ")).toLowerCase();
    return haystack.indexOf(query) !== -1;
  }

  function paint() {
    var query = search.value.trim().toLowerCase();
    var shown = dataSet.tools.filter(function (tool) { return matches(tool, query); });
    board.innerHTML = "";
    count.textContent = shown.length + " 个工具 · 更新于 " + dataSet.updated;
    if (!shown.length) {
      board.textContent = "没有符合的工具。";
      return;
    }
    shown.forEach(function (tool) {
      var card = document.createElement("article");
      var frame = document.createElement("div");
      frame.className = "shot";
      frame.innerHTML = categoryArt(tool.category);
      var mark = document.createElement("span");
      mark.className = "mark";
      mark.textContent = monogram(tool.name);
      frame.appendChild(mark);
      var title = document.createElement("h2");
      var link = document.createElement("a");
      link.href = tool.url;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = tool.name;
      title.appendChild(link);
      var kicker = document.createElement("p");
      kicker.className = "kicker";
      kicker.textContent = categoryName(tool.category);
      var summary = document.createElement("p");
      summary.textContent = tool.summary;
      var tags = document.createElement("p");
      tags.className = "tags";
      tool.tags.forEach(function (tag) {
        var chip = document.createElement("span");
        chip.className = "tag";
        chip.textContent = tag;
        tags.appendChild(chip);
      });
      card.appendChild(frame);
      card.appendChild(title);
      card.appendChild(kicker);
      card.appendChild(summary);
      card.appendChild(tags);
      board.appendChild(card);
    });
  }

  function categoryName(id) {
    for (var i = 0; i < dataSet.categories.length; i += 1) {
      if (dataSet.categories[i].id === id) return dataSet.categories[i].name;
    }
    return "";
  }

  function monogram(name) {
    var parts = name.replace(/[^A-Za-z0-9\u4e00-\u9fff ]/g, " ").trim().split(/\s+/);
    if (parts.length >= 2 && /^[A-Za-z]/.test(parts[0])) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    var word = parts[0] || name;
    if (/^[\u4e00-\u9fff]/.test(word)) return word.slice(0, 1);
    return word.slice(0, 2).toUpperCase();
  }

  function categoryArt(id) {
    if (id === "webxr") {
      return '<svg viewBox="0 0 160 100" aria-hidden="true"><rect x="46" y="24" width="68" height="48" rx="6" fill="#243044"/><path d="M58 58l14-16 12 12 8-8 16 16" fill="none" stroke="#7ec8ff" stroke-width="3"/><circle cx="70" cy="40" r="4" fill="#7ec8ff"/></svg>';
    }
    if (id === "spatial") {
      return '<svg viewBox="0 0 160 100" aria-hidden="true"><rect x="36" y="28" width="88" height="44" rx="4" fill="#2a241c"/><rect x="28" y="34" width="8" height="32" fill="#ffb15a"/><rect x="124" y="34" width="8" height="32" fill="#ffb15a"/><circle cx="80" cy="50" r="12" fill="none" stroke="#ffb15a" stroke-width="3"/></svg>';
    }
    if (id === "viz") {
      return '<svg viewBox="0 0 160 100" aria-hidden="true"><path d="M40 72V42l22-12v42M62 30l28 14v28M90 44l28-12v40" fill="none" stroke="#3a3150" stroke-width="8" stroke-linejoin="round"/><path d="M40 72h78" stroke="#e7b6ff" stroke-width="3"/></svg>';
    }
    if (id === "make") {
      return '<svg viewBox="0 0 160 100" aria-hidden="true"><path d="M80 24l28 14v24L80 76 52 62V38z" fill="#243028" stroke="#d6ff4a" stroke-width="3"/><path d="M80 48l28-14M80 48v28M80 48L52 34" stroke="#d6ff4a" stroke-width="2"/></svg>';
    }
    return '<svg viewBox="0 0 160 100" aria-hidden="true"><rect x="48" y="36" width="64" height="28" rx="10" fill="#2c3038"/><rect x="58" y="44" width="16" height="10" rx="3" fill="#10140c"/><rect x="86" y="44" width="16" height="10" rx="3" fill="#10140c"/><path d="M36 50h12M112 50h12" stroke="#d6ff4a" stroke-width="4" stroke-linecap="round"/></svg>';
  }
})();
