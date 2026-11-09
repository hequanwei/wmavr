(function () {
  "use strict";

  var STORAGE_KEY = "wmavr-rig-v1";
  var form = document.querySelector("#rig-form");
  var gpuSelect = document.querySelector("#gpu");
  var headsetBox = document.querySelector("#headsets");
  var networkBox = document.querySelector("#networks");
  var sceneBox = document.querySelector("#scenes");
  var resultEl = document.querySelector("#result");
  var copyButton = document.querySelector("#copy");
  var imageButton = document.querySelector("#image");
  var sourceList = document.querySelector("#source-list");
  var dataSet = null;
  var latest = null;

  var hintEl = document.querySelector("#gpu-hint");
  var useDetected = document.querySelector("#use-detected");
  var detectedId = "";

  fetch("../data/rig.json")
    .then(function (response) {
      if (!response.ok) throw new Error("status " + response.status);
      return response.json();
    })
    .then(function (data) {
      dataSet = data;
      fillForm(data);
      var savedGpu = restore();
      renderSources(data.sources);
      showDetection(data, savedGpu);
      form.addEventListener("change", onChange);
      copyButton.addEventListener("click", onCopy);
      imageButton.addEventListener("click", onImage);
      useDetected.addEventListener("click", function () {
        if (!detectedId) return;
        gpuSelect.value = detectedId;
        onChange();
        showDetection(dataSet, detectedId);
      });
      evaluate();
    })
    .catch(function () {
      resultEl.className = "result tone-unknown";
      resultEl.innerHTML = "<h2>页面数据没加载出来</h2><p>请刷新后再试。</p>";
    });

  function fillForm(data) {
    window.WmavrCatalog.fillGpuSelect(gpuSelect, data.gpus);

    data.headsets.forEach(function (headset) {
      headsetBox.appendChild(choice("headset", headset.id, headset.name, headset.summary));
    });
    data.networks.forEach(function (network) {
      networkBox.appendChild(choice("network", network.id, network.label, network.detail));
    });
    data.scenes.forEach(function (scene) {
      sceneBox.appendChild(choice("scene", scene.id, scene.label, scene.detail));
    });
  }

  function choice(name, value, title, detail) {
    var label = document.createElement("label");
    label.className = "choice";
    var input = document.createElement("input");
    input.type = "radio";
    input.name = name;
    input.value = value;
    input.required = true;
    var text = document.createElement("span");
    text.innerHTML = "<strong></strong><small></small>";
    text.querySelector("strong").textContent = title;
    text.querySelector("small").textContent = detail;
    label.appendChild(input);
    label.appendChild(text);
    return label;
  }

  function readInput() {
    var selected = function (name) {
      var node = form.querySelector('input[name="' + name + '"]:checked');
      return node ? node.value : "";
    };
    var backhaul = form.querySelector('input[name="backhaul"]:checked');
    return {
      gpuId: gpuSelect.value,
      headsetId: selected("headset"),
      networkId: selected("network"),
      sceneId: selected("scene"),
      ethernet: backhaul ? backhaul.value === "ethernet" : null
    };
  }

  function onChange() {
    var input = readInput();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        gpuId: input.gpuId,
        headsetId: input.headsetId,
        networkId: input.networkId,
        sceneId: input.sceneId,
        ethernet: input.ethernet
      }));
    } catch (error) {
      /* private mode */
    }
    evaluate();
    if (dataSet) showDetection(dataSet, gpuSelect.value);
  }

  function restore() {
    var raw = null;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (error) { raw = null; }
    if (!raw) return "";
    var saved = null;
    try { saved = JSON.parse(raw); } catch (error) { return ""; }
    if (!saved || typeof saved !== "object") return "";
    if (saved.gpuId) gpuSelect.value = saved.gpuId;
    check("headset", saved.headsetId);
    check("network", saved.networkId);
    check("scene", saved.sceneId);
    if (saved.ethernet === true) check("backhaul", "ethernet");
    if (saved.ethernet === false) check("backhaul", "wireless");
    return saved.gpuId || "";
  }

  function showDetection(data, savedGpu) {
    var reading = window.WmavrCatalog.matchGpu(data.gpus, window.WmavrCatalog.readRenderer());
    detectedId = reading.kind === "match" ? reading.gpu.id : "";
    if (reading.kind === "unread") {
      hintEl.textContent = "没能自动识别显卡，请从列表里选。";
    } else if (reading.kind === "laptop") {
      hintEl.textContent = "识别到的是笔记本显卡，列表里只有桌面卡，请手动选择。";
    } else if (reading.kind === "match") {
      hintEl.textContent = "已识别为 " + reading.gpu.name + "。";
      if (!savedGpu) gpuSelect.value = reading.gpu.id;
      else if (savedGpu !== reading.gpu.id) hintEl.textContent += "当前用的是你上次选的型号。";
    } else {
      hintEl.textContent = "识别到的显卡不在列表里，请手动选择。";
    }
    var showButton = detectedId && gpuSelect.value !== detectedId;
    useDetected.hidden = !showButton;
  }

  function check(name, value) {
    if (!value) return;
    var nodes = form.querySelectorAll('input[name="' + name + '"]');
    for (var i = 0; i < nodes.length; i += 1) {
      if (nodes[i].value === value) nodes[i].checked = true;
    }
  }

  function evaluate() {
    var input = readInput();
    if (input.ethernet === null) input.ethernet = undefined;
    latest = window.WmavrDiagnose.diagnose(dataSet, input);
    paint(latest);
  }

  function paint(result) {
    copyButton.disabled = !result || result.status === "incomplete";
    imageButton.disabled = copyButton.disabled;
    if (!result || result.status === "incomplete") {
      resultEl.className = "result tone-incomplete";
      resultEl.innerHTML = "<h2>还没选完</h2><p class=\"placeholder\">选完后，这里显示卡点和建议的码率。</p>";
      return;
    }
    resultEl.className = "result tone-" + result.bottleneck.id;
    var rows = [
      ["原因", result.bottleneck.detail],
      ["配置", result.selection.gpu + " · " + result.selection.headset + " · " + result.selection.network + " · " + result.selection.backhaul + " · " + result.selection.scene]
    ];
    if (result.codec) {
      rows.push(["编码", result.codec.label + "。" + result.codecReason]);
      rows.push(["码率", result.bitrate.text]);
      rows.push(["软件", result.app.name + "。" + result.app.reason]);
    } else {
      rows.push(["编码", "不确定"]);
      rows.push(["码率", "不确定"]);
    }
    rows.push(["建议", result.suggestion]);
    if (result.alternates) {
      result.alternates.forEach(function (item) {
        rows.push(["改接", item.label + "：" + item.summary]);
      });
    }
    rows.push(["头显", result.headsetNote]);
    rows.push(["条件", result.assumption]);
    rows.push(["说明", result.disclaimer + "更新于 " + result.dataDate + "。"]);
    var html = "<h2></h2><dl class=\"kv\"></dl>";
    resultEl.innerHTML = html;
    resultEl.querySelector("h2").textContent = result.bottleneck.title;
    var dl = resultEl.querySelector("dl");
    rows.forEach(function (row) {
      var wrap = document.createElement("div");
      var dt = document.createElement("dt");
      var dd = document.createElement("dd");
      dt.textContent = row[0];
      dd.textContent = row[1];
      wrap.appendChild(dt);
      wrap.appendChild(dd);
      dl.appendChild(wrap);
    });
  }

  function renderSources(sources) {
    sources.forEach(function (source) {
      var item = document.createElement("li");
      var link = document.createElement("a");
      link.href = source.url;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = source.title;
      item.appendChild(link);
      item.appendChild(document.createTextNode(" · " + source.grade + "。 " + source.note));
      sourceList.appendChild(item);
    });
  }

  function onCopy() {
    var text = window.WmavrDiagnose.copyText(latest);
    var done = function () {
      copyButton.textContent = "已复制";
      window.setTimeout(function () { copyButton.textContent = "复制结果"; }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () { fallbackCopy(text); done(); });
    } else {
      fallbackCopy(text);
      done();
    }
  }

  function fallbackCopy(text) {
    var area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }

  function onImage() {
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    var text = window.WmavrDiagnose.copyText(latest);
    var width = 1080;
    var pad = 64;
    var max = width - pad * 2;
    ctx.font = "28px Microsoft YaHei, PingFang SC, sans-serif";
    var paragraphs = text.split("\n");
    var lines = [];
    paragraphs.forEach(function (paragraph) {
      var line = "";
      for (var i = 0; i < paragraph.length; i += 1) {
        var next = line + paragraph.charAt(i);
        if (ctx.measureText(next).width > max && line) {
          lines.push(line);
          line = paragraph.charAt(i);
        } else {
          line = next;
        }
      }
      lines.push(line);
      lines.push("");
    });
    var height = pad * 2 + lines.length * 42;
    canvas.width = width;
    canvas.height = height;
    ctx.fillStyle = "#14170f";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#d6ff4a";
    ctx.fillRect(0, 0, 12, height);
    ctx.font = "28px Microsoft YaHei, PingFang SC, sans-serif";
    ctx.fillStyle = "#f3f1e6";
    lines.forEach(function (line, index) {
      ctx.fillText(line, pad, pad + 32 + index * 42);
    });
    canvas.toBlob(function (blob) {
      var url = URL.createObjectURL(blob);
      var link = document.createElement("a");
      link.href = url;
      link.download = "wmavr-" + latest.dataDate + ".png";
      link.click();
      URL.revokeObjectURL(url);
    });
  }
})();
