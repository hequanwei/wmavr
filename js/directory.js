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
      var title = document.createElement("h2");
      var link = document.createElement("a");
      link.href = tool.url;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = tool.name;
      title.appendChild(link);
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
      card.appendChild(title);
      card.appendChild(summary);
      card.appendChild(tags);
      board.appendChild(card);
    });
  }
})();
