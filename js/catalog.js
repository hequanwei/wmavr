(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.WmavrCatalog = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function modelKey(name) {
    var text = String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    var match = text.match(/\b(rtx|gtx|rx)\s+\d{3,4}(?:\s+(?:ti|super|xtx|xt))*/);
    return match ? match[0].replace(/\s+/g, " ") : "";
  }

  function readRenderer() {
    try {
      var canvas = document.createElement("canvas");
      var gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) return "";
      var ext = gl.getExtension("WEBGL_debug_renderer_info");
      if (!ext) return "";
      return String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || "");
    } catch (error) {
      return "";
    }
  }

  function matchGpu(gpus, raw) {
    if (!raw) return { kind: "unread", gpu: null };
    if (/\blaptop\b/i.test(raw)) return { kind: "laptop", gpu: null, raw: raw };
    var found = modelKey(raw);
    if (!found) return { kind: "unknown", gpu: null, raw: raw };
    var hit = null;
    for (var i = 0; i < gpus.length; i += 1) {
      if (modelKey(gpus[i].name) === found) hit = gpus[i];
    }
    if (!hit) return { kind: "unlisted", gpu: null, raw: raw, model: found };
    return { kind: "match", gpu: hit, raw: raw };
  }

  function fillGpuSelect(select, gpus) {
    var groups = {};
    var order = [];
    gpus.forEach(function (gpu) {
      if (!groups[gpu.group]) {
        groups[gpu.group] = document.createElement("optgroup");
        groups[gpu.group].label = gpu.group;
        order.push(gpu.group);
      }
      var option = document.createElement("option");
      option.value = gpu.id;
      option.textContent = gpu.name;
      groups[gpu.group].appendChild(option);
    });
    order.forEach(function (name) { select.appendChild(groups[name]); });
    var unknown = document.createElement("option");
    unknown.value = "unknown";
    unknown.textContent = "不在列表里";
    select.appendChild(unknown);
  }

  function load(url) {
    return fetch(url).then(function (response) {
      if (!response.ok) throw new Error("status " + response.status);
      return response.json();
    });
  }

  function findById(list, id) {
    for (var i = 0; i < list.length; i += 1) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  return {
    modelKey: modelKey,
    readRenderer: readRenderer,
    matchGpu: matchGpu,
    fillGpuSelect: fillGpuSelect,
    load: load,
    findById: findById
  };
});
