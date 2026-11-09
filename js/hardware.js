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
      renderHeadsets(data);
      renderGroups(data);
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
  }

  function renderHeadsets(data) {
    var box = document.querySelector("#headsets");
    data.headsets.forEach(function (headset) {
      var card = document.createElement("article");
      var title = document.createElement("h2");
      title.textContent = headset.name;
      var badge = document.createElement("p");
      badge.className = headset.decode.indexOf("av1") === -1 ? "no" : "yes";
      badge.textContent = headset.decode.indexOf("av1") === -1 ? "不支持 AV1" : "能解 AV1";
      var summary = document.createElement("p");
      summary.textContent = headset.summary;
      card.appendChild(title);
      card.appendChild(badge);
      card.appendChild(summary);
      box.appendChild(card);
    });
  }

  function renderGroups(data) {
    var box = document.querySelector("#groups");
    var groups = [];
    data.gpus.forEach(function (gpu) {
      var found = null;
      for (var i = 0; i < groups.length; i += 1) {
        if (groups[i].name === gpu.group) found = groups[i];
      }
      if (!found) {
        found = { name: gpu.group, av1: gpu.encode.indexOf("av1") !== -1, count: 0 };
        groups.push(found);
      }
      found.count += 1;
    });
    groups.forEach(function (group) {
      var card = document.createElement("article");
      var title = document.createElement("h2");
      title.textContent = group.name.replace(/（.*）/, "");
      var badge = document.createElement("p");
      badge.className = group.av1 ? "yes" : "no";
      badge.textContent = group.av1 ? "能编 AV1" : "不能编 AV1";
      var note = document.createElement("p");
      note.className = "fine";
      note.textContent = group.count + " 个桌面型号";
      card.appendChild(title);
      card.appendChild(badge);
      card.appendChild(note);
      box.appendChild(card);
    });
  }
})();
