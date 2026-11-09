(function () {
  "use strict";

  var box = document.querySelector("#picker");
  var board = document.querySelector("#board");
  var dataSet = null;

  window.WmavrCatalog.load("../data/rig.json").then(function (data) {
    dataSet = data;
    data.headsets.forEach(function (headset, index) {
      var label = document.createElement("label");
      label.className = "choice";
      var input = document.createElement("input");
      input.type = "checkbox";
      input.value = headset.id;
      input.checked = index < 2;
      var text = document.createElement("span");
      text.textContent = headset.name;
      label.appendChild(input);
      label.appendChild(text);
      box.appendChild(label);
    });
    box.addEventListener("change", paint);
    paint();
  }).catch(function () {
    board.textContent = "页面数据没加载出来，请刷新后再试。";
  });

  function cell(max) {
    return max == null ? "不确定" : max + " Mbps";
  }

  function paint() {
    var chosen = [];
    box.querySelectorAll("input:checked").forEach(function (input) {
      chosen.push(window.WmavrCatalog.findById(dataSet.headsets, input.value));
    });
    board.innerHTML = "";
    if (!chosen.length) {
      board.textContent = "请至少选一台头显。";
      return;
    }
    chosen.forEach(function (headset) {
      var card = document.createElement("article");
      var title = document.createElement("h2");
      title.textContent = headset.name;
      var list = document.createElement("ul");
      [
        ["AV1", headset.decode.indexOf("av1") === -1 ? "不支持" : cell(headset.maxBitrateMbps.av1)],
        ["HEVC", cell(headset.maxBitrateMbps.hevc)],
        ["H.264", cell(headset.maxBitrateMbps.h264)]
      ].forEach(function (row) {
        var item = document.createElement("li");
        item.textContent = row[0] + "：" + row[1];
        list.appendChild(item);
      });
      var note = document.createElement("p");
      note.className = "fine";
      note.textContent = headset.note;
      card.appendChild(title);
      card.appendChild(list);
      card.appendChild(note);
      board.appendChild(card);
    });
    var date = document.createElement("p");
    date.className = "fine";
    date.textContent = "更新于 " + dataSet.dataDate + "。上限来自 Virtual Desktop 的说明，只比较解码和码率。";
    board.appendChild(date);
  }
})();
