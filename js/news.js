(function () {
  "use strict";

  var list = document.querySelector("#news-list");
  var note = document.querySelector("#news-note");
  if (!list) return;

  fetch("/data/news.json")
    .then(function (response) {
      if (!response.ok) throw new Error("status " + response.status);
      return response.json();
    })
    .then(function (data) {
      if (note && data.note) note.textContent = data.note;
      var items = data.items || [];
      if (!items.length) {
        list.textContent = "今天没有拉到条目。";
        return;
      }
      items.forEach(function (item) {
        var row = document.createElement("li");
        var meta = document.createElement("div");
        meta.className = "news-meta";
        meta.textContent = item.published || "";
        var body = document.createElement("div");
        var link = document.createElement("a");
        link.href = item.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = item.title || "";
        var source = document.createElement("span");
        source.className = "news-source";
        source.textContent = item.source || "";
        body.appendChild(link);
        if (item.source) body.appendChild(source);
        row.appendChild(meta);
        row.appendChild(body);
        list.appendChild(row);
      });
    })
    .catch(function () {
      list.textContent = "新闻没有加载出来，请刷新后再试。";
    });
})();
