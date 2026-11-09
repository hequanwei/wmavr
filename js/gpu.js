(function () {
  "use strict";

  var select = document.querySelector("#gpu");
  var hintEl = document.querySelector("#gpu-hint");
  var useDetected = document.querySelector("#use-detected");
  var resultEl = document.querySelector("#result");
  var dataSet = null;
  var detectedId = "";

  window.WmavrCatalog.load("../data/rig.json")
    .then(function (data) {
      dataSet = data;
      window.WmavrCatalog.fillGpuSelect(select, data.gpus);
      select.addEventListener("change", paint);
      useDetected.addEventListener("click", function () {
        if (!detectedId) return;
        select.value = detectedId;
        paint();
      });
      showDetection("");
      paint();
    })
    .catch(function () {
      resultEl.innerHTML = "<h2>页面数据没加载出来</h2><p>请刷新后再试。</p>";
    });

  function showDetection(current) {
    var reading = window.WmavrCatalog.matchGpu(dataSet.gpus, window.WmavrCatalog.readRenderer());
    detectedId = reading.kind === "match" ? reading.gpu.id : "";
    if (reading.kind === "unread") {
      hintEl.textContent = "没能自动识别显卡，请从列表里选。";
    } else if (reading.kind === "laptop") {
      hintEl.textContent = "识别到的是笔记本显卡，列表里只有桌面卡，请手动选择。";
    } else if (reading.kind === "match") {
      hintEl.textContent = "已识别为 " + reading.gpu.name + "。";
      if (!current) select.value = reading.gpu.id;
    } else {
      hintEl.textContent = "识别到的显卡不在列表里，请手动选择。";
    }
    useDetected.hidden = !(detectedId && select.value !== detectedId);
  }

  function paint() {
    showDetection(select.value);
    var gpu = window.WmavrCatalog.findById(dataSet.gpus, select.value);
    if (!gpu) {
      resultEl.innerHTML = "<h2>请选择显卡</h2><p class=\"placeholder\">从列表选一张桌面卡。不在列表里的型号，这里不判断编码器。</p>";
      return;
    }
    var labels = { av1: "AV1", hevc: "HEVC", h264: "H.264" };
    resultEl.innerHTML = "<h2></h2><ul id=\"codecs\"></ul><p class=\"fine\"></p>";
    resultEl.querySelector("h2").textContent = gpu.name;
    var list = resultEl.querySelector("ul");
    ["av1", "hevc", "h264"].forEach(function (id) {
      var item = document.createElement("li");
      var has = gpu.encode.indexOf(id) !== -1;
      item.className = has ? "yes" : "no";
      item.textContent = labels[id] + (has ? "：能编码" : "：不能编码");
      list.appendChild(item);
    });
    resultEl.querySelector(".fine").textContent = "更新于 " + dataSet.dataDate + "。只说明有没有这几种硬件编码器。";
  }
})();
