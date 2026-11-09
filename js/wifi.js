(function () {
  "use strict";

  var board = document.querySelector("#board");
  window.WmavrCatalog.load("../data/rig.json").then(function (data) {
    data.networks.forEach(function (network) {
      var caps = data.rules.networkCapsMbps[network.id];
      var card = document.createElement("article");
      var title = document.createElement("h2");
      title.textContent = network.label;
      var detail = document.createElement("p");
      detail.textContent = network.detail;
      var list = document.createElement("ul");
      [
        "电脑用网线：" + caps.ethernet + " Mbps",
        "电脑也走 Wi-Fi：" + caps.wireless + " Mbps"
      ].forEach(function (line) {
        var item = document.createElement("li");
        item.textContent = line;
        list.appendChild(item);
      });
      card.appendChild(title);
      card.appendChild(detail);
      card.appendChild(list);
      board.appendChild(card);
    });
    var note = document.createElement("p");
    note.className = "fine";
    note.textContent = data.rules.networkNote + "更新于 " + data.dataDate + "。";
    board.appendChild(note);
  }).catch(function () {
    board.textContent = "页面数据没加载出来，请刷新后再试。";
  });
})();
