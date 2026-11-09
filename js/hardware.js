(function () {
  "use strict";

  var STORAGE_KEY = "wmavr-rig-v1";
  var gpuSelect = document.querySelector("#gpu");
  var headsetSelect = document.querySelector("#headset");
  var networkSelect = document.querySelector("#network");
  var sceneSelect = document.querySelector("#scene");
  var ethernetInput = document.querySelector("#ethernet");
  var resultEl = document.querySelector("#result");
  var openRig = document.querySelector("#open-rig");
  var dataSet = null;

  fetch("../data/rig.json")
    .then(function (response) {
      if (!response.ok) throw new Error("status " + response.status);
      return response.json();
    })
    .then(function (data) {
      dataSet = data;
      window.WmavrCatalog.fillGpuSelect(gpuSelect, data.gpus);
      fill(headsetSelect, data.headsets, "name");
      fill(networkSelect, data.networks, "label");
      fill(sceneSelect, data.scenes, "label");
      restore();
      if (!gpuSelect.value) {
        var reading = window.WmavrCatalog.matchGpu(data.gpus, window.WmavrCatalog.readRenderer());
        if (reading.kind === "match") gpuSelect.value = reading.gpu.id;
      }
      document.querySelector("#check").addEventListener("change", onChange);
      openRig.addEventListener("click", save);
      renderGuide(data);
      paint();
    })
    .catch(function () {
      resultEl.innerHTML = "<h2>页面数据没加载出来</h2><p>请刷新后再试。</p>";
    });

  function fill(select, list, labelKey) {
    list.forEach(function (item) {
      var option = document.createElement("option");
      option.value = item.id;
      option.textContent = item[labelKey];
      select.appendChild(option);
    });
  }

  function restore() {
    var raw = null;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (error) { raw = null; }
    if (!raw) return;
    var saved = null;
    try { saved = JSON.parse(raw); } catch (error) { return; }
    if (!saved || typeof saved !== "object") return;
    if (saved.gpuId) gpuSelect.value = saved.gpuId;
    if (saved.headsetId) headsetSelect.value = saved.headsetId;
    if (saved.networkId) networkSelect.value = saved.networkId;
    if (saved.sceneId) sceneSelect.value = saved.sceneId;
    if (saved.ethernet === false) ethernetInput.checked = false;
  }

  function inputNow() {
    return {
      gpuId: gpuSelect.value,
      headsetId: headsetSelect.value,
      networkId: networkSelect.value,
      sceneId: sceneSelect.value,
      ethernet: ethernetInput.checked
    };
  }

  function save() {
    var input = inputNow();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(input)); } catch (error) { /* private mode */ }
  }

  function onChange() {
    save();
    paint();
  }

  function paint() {
    var input = inputNow();
    if (!input.gpuId) {
      resultEl.className = "result tone-incomplete";
      resultEl.innerHTML = "<h2>先选显卡和头显</h2>";
      markSelected();
      return;
    }
    var result = window.WmavrDiagnose.diagnose(dataSet, input);
    resultEl.className = "result tone-" + (result.bottleneck ? result.bottleneck.id : "incomplete");
    resultEl.innerHTML = "<h2></h2><p></p><p class=\"fine\"></p>";
    resultEl.querySelector("h2").textContent = result.bottleneck.title;
    var line = result.bottleneck.detail;
    if (result.codec) line += " 编码用 " + result.codec.label + "。码率：" + result.bitrate.text.split("。")[0] + "。";
    resultEl.querySelector("p").textContent = line;
    var extra = resultEl.querySelector(".fine");
    if (result.alternates && result.alternates.length) {
      extra.textContent = result.alternates.map(function (item) {
        return item.label + "：" + item.summary;
      }).join(" ");
    }
    markSelected();
  }

  function markSelected() {
    var cards = document.querySelectorAll("#guide .guide-card");
    for (var i = 0; i < cards.length; i += 1) {
      var card = cards[i];
      var on = (card.getAttribute("data-kind") === "gpu" && card.getAttribute("data-id") === gpuSelect.value) ||
        (card.getAttribute("data-kind") === "headset" && card.getAttribute("data-id") === headsetSelect.value);
      card.classList.toggle("is-selected", on);
      card.setAttribute("aria-pressed", on ? "true" : "false");
    }
  }

  function codecLine(ids) {
    return ids.map(function (id) {
      if (id === "av1") return "AV1";
      if (id === "hevc") return "HEVC";
      return "H.264";
    }).join(" · ");
  }

  function sectionKey(groupName) {
    if (groupName.indexOf("RTX 50") !== -1) return "rtx50";
    if (groupName.indexOf("RTX 40") !== -1) return "rtx40";
    if (groupName.indexOf("RTX 30") !== -1) return "rtx30";
    if (groupName.indexOf("RTX 20") !== -1) return "rtx20";
    if (groupName.indexOf("GTX 16") !== -1) return "gtx16";
    if (groupName.indexOf("GTX 10") !== -1) return "gtx10";
    if (groupName.indexOf("RX 7000") !== -1) return "rx7000";
    if (groupName.indexOf("RX 6000") !== -1) return "rx6000";
    return "other";
  }

  function toneFor(groupName, av1) {
    var amd = groupName.indexOf("AMD") === 0;
    if (av1) return amd ? "#e85d4c" : "#7dce2a";
    return amd ? "#8d6a62" : "#8b9384";
  }

  function gpuSvg(tone) {
    return '<svg viewBox="0 0 160 100" aria-hidden="true"><rect x="18" y="22" width="112" height="56" rx="6" fill="#2a2e28"/><rect x="18" y="22" width="8" height="56" fill="' + tone + '"/><circle cx="62" cy="50" r="16" fill="#171a16" stroke="' + tone + '" stroke-width="3"/><circle cx="108" cy="50" r="16" fill="#171a16" stroke="' + tone + '" stroke-width="3"/><rect x="40" y="78" width="68" height="6" fill="#c2b48a"/></svg>';
  }

  function headsetSvg(id) {
    if (id === "quest3s") {
      return '<svg viewBox="0 0 160 100" aria-hidden="true"><path d="M28 58h-8M140 58h8" stroke="#3a3e46" stroke-width="6" stroke-linecap="round"/><rect x="32" y="32" width="96" height="40" rx="12" fill="#4a5160"/><rect x="44" y="42" width="30" height="18" rx="6" fill="#1c2028"/><rect x="86" y="42" width="30" height="18" rx="6" fill="#1c2028"/><circle cx="70" cy="28" r="2" fill="#c5ccd6"/><circle cx="90" cy="28" r="2" fill="#c5ccd6"/></svg>';
    }
    if (id === "pico4") {
      return '<svg viewBox="0 0 160 100" aria-hidden="true"><path d="M26 56h-8M142 56h8" stroke="#d7dbe3" stroke-width="6" stroke-linecap="round"/><rect x="30" y="30" width="100" height="42" rx="16" fill="#f4f6fb"/><rect x="42" y="40" width="32" height="20" rx="8" fill="#2a3140"/><rect x="86" y="40" width="32" height="20" rx="8" fill="#2a3140"/><circle cx="80" cy="26" r="2.5" fill="#9aa3b2"/></svg>';
    }
    if (id === "pico4ultra") {
      return '<svg viewBox="0 0 160 100" aria-hidden="true"><path d="M28 54h-10M142 54h10" stroke="#e8ebf2" stroke-width="5" stroke-linecap="round"/><rect x="34" y="28" width="92" height="36" rx="14" fill="#f7f8fb"/><rect x="40" y="40" width="80" height="16" rx="6" fill="#1b1f28"/><rect x="70" y="20" width="20" height="6" rx="2" fill="#c5cad3"/></svg>';
    }
    return '<svg viewBox="0 0 160 100" aria-hidden="true"><path d="M30 52h-12M142 52h12" stroke="#2c3038" stroke-width="6" stroke-linecap="round"/><rect x="34" y="34" width="92" height="32" rx="12" fill="#2c3038"/><rect x="46" y="42" width="28" height="14" rx="5" fill="#12141a"/><rect x="86" y="42" width="28" height="14" rx="5" fill="#12141a"/><circle cx="58" cy="30" r="2" fill="#9aa3ad"/><circle cx="80" cy="28" r="2" fill="#9aa3ad"/><circle cx="102" cy="30" r="2" fill="#9aa3ad"/></svg>';
  }

  function shot(svg) {
    var span = document.createElement("span");
    span.className = "shot";
    span.innerHTML = svg;
    return span;
  }

  function pill(ok, text) {
    var badge = document.createElement("span");
    badge.className = "pill " + (ok ? "yes" : "no");
    badge.textContent = text;
    return badge;
  }

  function renderGuide(data) {
    var filters = document.querySelector("#guide-filters");
    var guide = document.querySelector("#guide");
    var date = document.querySelector("#guide-date");
    date.textContent = "资料日期 " + data.dataDate;
    var sections = [{ id: "headset", name: "头显" }];
    var grouped = {};
    data.gpus.forEach(function (gpu) {
      var key = sectionKey(gpu.group);
      if (!grouped[key]) {
        grouped[key] = { id: key, name: gpu.group.replace(/（.*）/, ""), items: [] };
        sections.push(grouped[key]);
      }
      grouped[key].items.push(gpu);
    });

    sections.forEach(function (section) {
      var button = document.createElement("button");
      button.type = "button";
      button.textContent = section.name;
      button.setAttribute("data-section", section.id);
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", function () { setGuideFilter(section.id); });
      filters.appendChild(button);
    });
    var all = document.createElement("button");
    all.type = "button";
    all.textContent = "全部";
    all.setAttribute("data-section", "all");
    all.setAttribute("aria-pressed", "true");
    all.addEventListener("click", function () { setGuideFilter("all"); });
    filters.insertBefore(all, filters.firstChild);

    var headsetSection = document.createElement("section");
    headsetSection.className = "guide-section";
    headsetSection.setAttribute("data-section", "headset");
    var headsetTitle = document.createElement("h2");
    headsetTitle.textContent = "头显";
    var headsetGrid = document.createElement("div");
    headsetGrid.className = "guide-grid wide";
    data.headsets.forEach(function (headset) {
      var ok = headset.decode.indexOf("av1") !== -1;
      headsetGrid.appendChild(card("headset", headset.id, headset.name, ok ? "能解 AV1" : "不支持 AV1", ok, headset.summary, headsetSvg(headset.id)));
    });
    headsetSection.appendChild(headsetTitle);
    headsetSection.appendChild(headsetGrid);
    guide.appendChild(headsetSection);

    sections.forEach(function (section) {
      if (section.id === "headset") return;
      var block = document.createElement("section");
      block.className = "guide-section";
      block.setAttribute("data-section", section.id);
      var title = document.createElement("h2");
      title.textContent = section.name;
      var grid = document.createElement("div");
      grid.className = "guide-grid";
      section.items.forEach(function (gpu) {
        var ok = gpu.encode.indexOf("av1") !== -1;
        var shortName = gpu.name.replace("NVIDIA GeForce ", "").replace("AMD Radeon ", "");
        grid.appendChild(card("gpu", gpu.id, shortName, ok ? "能编 AV1" : "不能编 AV1", ok, codecLine(gpu.encode), gpuSvg(toneFor(gpu.group, ok))));
      });
      block.appendChild(title);
      block.appendChild(grid);
      guide.appendChild(block);
    });

    guide.addEventListener("click", function (event) {
      var node = event.target;
      var picked = null;
      while (node && node !== guide) {
        if (node.classList && node.classList.contains("guide-card")) picked = node;
        node = node.parentNode;
      }
      if (!picked) return;
      if (picked.getAttribute("data-kind") === "gpu") gpuSelect.value = picked.getAttribute("data-id");
      if (picked.getAttribute("data-kind") === "headset") headsetSelect.value = picked.getAttribute("data-id");
      save();
      paint();
      var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      resultEl.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
    });
  }

  function card(kind, id, name, badge, ok, note, svg) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "guide-card";
    button.setAttribute("data-kind", kind);
    button.setAttribute("data-id", id);
    button.setAttribute("aria-pressed", "false");
    var title = document.createElement("strong");
    title.textContent = name;
    var line = document.createElement("p");
    line.className = "fine";
    line.textContent = note;
    button.appendChild(pill(ok, badge));
    button.appendChild(shot(svg));
    button.appendChild(title);
    button.appendChild(line);
    return button;
  }

  function setGuideFilter(id) {
    var buttons = document.querySelectorAll("#guide-filters button");
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].setAttribute("aria-pressed", buttons[i].getAttribute("data-section") === id ? "true" : "false");
    }
    var blocks = document.querySelectorAll("#guide .guide-section");
    for (var j = 0; j < blocks.length; j += 1) {
      blocks[j].hidden = id !== "all" && blocks[j].getAttribute("data-section") !== id;
    }
  }
})();
