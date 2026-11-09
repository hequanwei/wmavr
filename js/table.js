(function () {
  "use strict";

  var board = document.querySelector("#board");

  window.WmavrCatalog.load("../data/rig.json").then(function (data) {
    board.appendChild(headsetSection(data));
    board.appendChild(gpuSection(data));
    board.appendChild(networkSection(data));
    board.appendChild(sourceSection(data));
  }).catch(function () {
    board.textContent = "页面数据没加载出来，请刷新后再试。";
  });

  function section(title, intro) {
    var block = document.createElement("section");
    block.className = "sheet-block";
    var heading = document.createElement("h2");
    heading.textContent = title;
    block.appendChild(heading);
    if (intro) {
      var text = document.createElement("p");
      text.className = "fine";
      text.textContent = intro;
      block.appendChild(text);
    }
    return block;
  }

  function scroller(table) {
    var box = document.createElement("div");
    box.className = "table-wrap";
    box.appendChild(table);
    return box;
  }

  function headerRow(labels) {
    var row = document.createElement("tr");
    labels.forEach(function (label) {
      var cell = document.createElement("th");
      cell.textContent = label;
      row.appendChild(cell);
    });
    return row;
  }

  function textCell(text, className) {
    var cell = document.createElement("td");
    cell.textContent = text;
    if (className) cell.className = className;
    return cell;
  }

  function decodeText(headset, id) {
    if (headset.decode.indexOf(id) === -1) return "不支持";
    var max = headset.maxBitrateMbps[id];
    return max == null ? "不确定" : max + " Mbps";
  }

  function encodeText(gpu, id) {
    return gpu.encode.indexOf(id) === -1 ? "不能" : "能";
  }

  function encodeClass(gpu, id) {
    return gpu.encode.indexOf(id) === -1 ? "no" : "yes";
  }

  function headsetSection(data) {
    var block = section("头显", "格子里是 Virtual Desktop 的码率上限。没有公开数字时写不确定。");
    var table = document.createElement("table");
    table.className = "sheet";
    table.appendChild(headerRow(["头显", "AV1", "HEVC", "H.264"]));
    data.headsets.forEach(function (headset) {
      var row = document.createElement("tr");
      var name = document.createElement("th");
      name.scope = "row";
      name.textContent = headset.name;
      row.appendChild(name);
      ["av1", "hevc", "h264"].forEach(function (id) {
        var text = decodeText(headset, id);
        row.appendChild(textCell(text, text === "不支持" ? "no" : ""));
      });
      table.appendChild(row);
      var note = document.createElement("tr");
      var noteCell = document.createElement("td");
      noteCell.colSpan = 4;
      noteCell.className = "fine";
      noteCell.textContent = headset.note;
      note.appendChild(noteCell);
      table.appendChild(note);
    });
    block.appendChild(scroller(table));
    return block;
  }

  function gpuSection(data) {
    var block = section("显卡", "只列写明了硬件编码器的桌面卡。笔记本和核显不在表里。");
    var table = document.createElement("table");
    table.className = "sheet";
    table.appendChild(headerRow(["显卡", "AV1", "HEVC", "H.264"]));
    var lastGroup = "";
    data.gpus.forEach(function (gpu) {
      if (gpu.group !== lastGroup) {
        lastGroup = gpu.group;
        var group = document.createElement("tr");
        group.className = "group";
        var label = document.createElement("td");
        label.colSpan = 4;
        label.textContent = gpu.group;
        group.appendChild(label);
        table.appendChild(group);
      }
      var row = document.createElement("tr");
      var name = document.createElement("th");
      name.scope = "row";
      name.textContent = gpu.name;
      row.appendChild(name);
      ["av1", "hevc", "h264"].forEach(function (id) {
        row.appendChild(textCell(encodeText(gpu, id), encodeClass(gpu, id)));
      });
      table.appendChild(row);
    });
    block.appendChild(scroller(table));
    return block;
  }

  function networkSection(data) {
    var block = section("网络", "电脑用网线和电脑也走 Wi-Fi，各有一个参考码率。");
    var table = document.createElement("table");
    table.className = "sheet";
    table.appendChild(headerRow(["档位", "电脑用网线", "电脑也走 Wi-Fi"]));
    data.networks.forEach(function (network) {
      var caps = data.rules.networkCapsMbps[network.id];
      var row = document.createElement("tr");
      var name = document.createElement("th");
      name.scope = "row";
      name.textContent = network.label;
      row.appendChild(name);
      row.appendChild(textCell(caps.ethernet + " Mbps"));
      row.appendChild(textCell(caps.wireless + " Mbps"));
      table.appendChild(row);
      var note = document.createElement("tr");
      var noteCell = document.createElement("td");
      noteCell.colSpan = 3;
      noteCell.className = "fine";
      noteCell.textContent = network.detail;
      note.appendChild(noteCell);
      table.appendChild(note);
    });
    block.appendChild(scroller(table));
    var note = document.createElement("p");
    note.className = "fine";
    note.textContent = data.rules.networkNote + "更新于 " + data.dataDate + "。";
    block.appendChild(note);
    return block;
  }

  function sourceSection(data) {
    var block = section("资料来源", "编码按显卡世代。码率只写 Virtual Desktop 公开过的上限。");
    var list = document.createElement("ul");
    data.sources.forEach(function (source) {
      var item = document.createElement("li");
      var link = document.createElement("a");
      link.href = source.url;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = source.title;
      item.appendChild(link);
      item.appendChild(document.createTextNode(" · " + source.grade + "。 " + source.note));
      list.appendChild(item);
    });
    block.appendChild(list);
    return block;
  }
})();
