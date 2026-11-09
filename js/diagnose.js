(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.WmavrDiagnose = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var FALLBACK = ["av1", "hevc", "h264"];

  function findById(list, id) {
    for (var i = 0; i < list.length; i += 1) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  function hasCodec(list, codec) {
    return list.indexOf(codec) !== -1;
  }

  function networkCap(data, networkId, ethernet) {
    var row = data.rules.networkCapsMbps[networkId];
    if (!row) return null;
    return ethernet ? row.ethernet : row.wireless;
  }

  function preferenceOrder(sceneId) {
    if (sceneId === "rhythm") return ["h264", "hevc", "av1"];
    if (sceneId === "dark") return ["av1", "hevc", "h264"];
    return ["h264", "av1", "hevc"];
  }

  function firstAvailable(order, available) {
    for (var i = 0; i < order.length; i += 1) {
      if (hasCodec(available, order[i])) return order[i];
    }
    return available[0] || null;
  }

  function pickCodec(sceneId, available, caps, floor) {
    if (!available.length) return null;
    if (sceneId === "sim") {
      var best = available[0];
      var bestCap = caps[best] == null ? -1 : caps[best];
      for (var i = 1; i < available.length; i += 1) {
        var codec = available[i];
        var cap = caps[codec] == null ? -1 : caps[codec];
        if (cap > bestCap) {
          best = codec;
          bestCap = cap;
        }
      }
      if (bestCap < 0) return firstAvailable(["av1", "hevc", "h264"], available);
      var tied = [];
      for (var j = 0; j < available.length; j += 1) {
        if (caps[available[j]] === bestCap) tied.push(available[j]);
      }
      if (tied.length > 1 && bestCap < floor) {
        return firstAvailable(["av1", "hevc", "h264"], tied);
      }
      return firstAvailable(["h264", "av1", "hevc"], tied);
    }
    var order = preferenceOrder(sceneId);
    if (sceneId === "rhythm") {
      var h264Cap = caps.h264;
      if (hasCodec(available, "h264") && h264Cap != null && h264Cap < floor) {
        return firstAvailable(["hevc", "av1", "h264"], available);
      }
    }
    return firstAvailable(order, available);
  }

  function bitrateText(codec, headsetMax, cap) {
    if (headsetMax == null) {
      return {
        kind: "unknown",
        text: "不给出具体区间。这台头显的 " + codecLabel(codec) + " 没有公开的码率上限。"
      };
    }
    if (cap < headsetMax) {
      return {
        kind: "cap",
        text: "建议不超过 " + cap + " Mbps。头显的 " + codecLabel(codec) + " 上限是 " + headsetMax + " Mbps，当前网络用不到那么高。"
      };
    }
    if (codec === "h264" && headsetMax >= 500) {
      return {
        kind: "range",
        text: "400–500 Mbps。500 是 Virtual Desktop 在 Quest 3 上的 H.264+ 上限，400 是同一说明里更早的上限。"
      };
    }
    if ((codec === "av1" || codec === "hevc") && headsetMax === 200) {
      return {
        kind: "range",
        text: "上限 200 Mbps。这是 Virtual Desktop 对这档头显的 " + codecLabel(codec) + " 上限。"
      };
    }
    return {
      kind: "range",
      text: "上限 " + headsetMax + " Mbps。"
    };
  }

  function codecLabel(codec) {
    if (codec === "av1") return "AV1";
    if (codec === "hevc") return "HEVC";
    if (codec === "h264") return "H.264";
    return codec;
  }

  function suggestionFor(bottleneckId, ethernet) {
    if (bottleneckId === "unknown") {
      return "这张显卡不在列表里，没有编码器资料，所以不给编码和码率。";
    }
    if (bottleneckId === "gpu") {
      return "这张显卡编不了更合适的格式。先用上面的编码。要上 AV1，需要 RTX 40 系、RTX 50 系或 RX 7000。";
    }
    if (bottleneckId === "headset") {
      return "这台头显解不了更合适的格式。换头显之前先用上面的编码，码率不要照搬别的头显。";
    }
    if (bottleneckId === "network" && !ethernet) {
      return "先把电脑用网线接到路由器，头显单独走 5 GHz 或 6 GHz。";
    }
    if (bottleneckId === "network") {
      return "这段 Wi-Fi 到不了需要的码率。H.264 要到 400 Mbps 以上，需要 Wi-Fi 6E，并且电脑用网线。";
    }
    return "按上面的编码和码率设置。分辨率先别再往上加。";
  }

  function appRecommendation(headset) {
    var reason = "这里的码率上限来自 Virtual Desktop，不要直接填到 Air Link 或 Steam Link。";
    if (headset.vendor === "pico") {
      reason += "PICO 国行商店可能没有这款软件。没有它时，不要把这里的 Mbps 填进其他串流软件。";
    }
    return { name: "Virtual Desktop", reason: reason };
  }

  function codecReason(scene, chosen, bottleneckId, headsetMax) {
    if (scene.id === "dark" && chosen === "av1") {
      return "暗场景优先 AV1。Virtual Desktop 在 Quest 3 上提供了 AV1 10-bit。";
    }
    if (scene.id === "dark") {
      return "暗场景更适合 AV1。当前组合用不上，改为 " + codecLabel(chosen) + "。";
    }
    if (scene.id === "rhythm" && chosen === "h264") {
      return "节奏和竞速优先 H.264。动作快的内容更适合高码率 H.264+。";
    }
    if (scene.id === "rhythm") {
      return "节奏和竞速更适合高码率 H.264。当前网络不够，改为 " + codecLabel(chosen) + "。";
    }
    if (chosen === "h264" && headsetMax == null) {
      return "模拟器看重码率，所以用 H.264。这台头显没有公开上限，这里不写具体数字。";
    }
    if (chosen === "h264" && bottleneckId === "none") {
      return "模拟器看重码率。这条链路够得到 H.264 更高的上限，所以继续用 H.264。";
    }
    if (chosen === "h264") {
      return "模拟器看重码率，当前能用的格式里选了 H.264。";
    }
    return "模拟器看重码率。这条链路用不上更高的 H.264，改为 " + codecLabel(chosen) + "。";
  }

  function usedSources(data, ids) {
    var seen = {};
    var list = [];
    for (var i = 0; i < ids.length; i += 1) {
      if (seen[ids[i]]) continue;
      seen[ids[i]] = true;
      var source = findById(data.sources, ids[i]);
      if (source) list.push(source);
    }
    return list;
  }

  function evaluate(data, input) {
    var gpuId = input.gpuId;
    var headset = findById(data.headsets, input.headsetId);
    var network = findById(data.networks, input.networkId);
    var scene = findById(data.scenes, input.sceneId);
    var ethernet = input.ethernet;
    if (!headset || !network || !scene || typeof ethernet !== "boolean" || !gpuId) {
      return { status: "incomplete" };
    }

    var assumption = "按 " + data.assumptions.refreshHz + "Hz 和" + data.assumptions.resolution + "估算。";
    var cap = networkCap(data, network.id, ethernet);
    var backhaulLabel = ethernet ? "电脑用网线接到路由器" : "电脑也在用 Wi-Fi";

    if (gpuId === "unknown") {
      return {
        status: "uncertain",
        bottleneck: {
          id: "unknown",
          title: "暂时判断不了",
          detail: "这张显卡不在列表里，没有编码器资料，判断不了该用哪种编码。"
        },
        codec: null,
        codecReason: "",
        bitrate: { kind: "unknown", text: "不确定。" },
        suggestion: suggestionFor("unknown", ethernet),
        app: null,
        assumption: assumption,
        disclaimer: data.disclaimer,
        dataDate: data.dataDate,
        headsetNote: headset.note,
        networkNote: data.rules.networkNote,
        sources: [],
        selection: {
          gpu: "不在列表里",
          headset: headset.name,
          network: network.label,
          backhaul: backhaulLabel,
          scene: scene.label
        }
      };
    }

    var gpu = findById(data.gpus, gpuId);
    if (!gpu) return { status: "incomplete" };

    var floor = data.rules.h264HighFloorMbps;
    var starved = data.rules.efficientStarvedBelowMbps;
    var ideal = scene.ideal;
    var bottleneckId = "none";

    if (!hasCodec(headset.decode, ideal)) {
      bottleneckId = "headset";
    } else if (!hasCodec(gpu.encode, ideal)) {
      bottleneckId = "gpu";
    }

    var available = [];
    for (var i = 0; i < FALLBACK.length; i += 1) {
      var codec = FALLBACK[i];
      if (hasCodec(headset.decode, codec) && hasCodec(gpu.encode, codec)) {
        available.push(codec);
      }
    }

    var effective = {};
    for (var n = 0; n < available.length; n += 1) {
      var id = available[n];
      var headsetMax = headset.maxBitrateMbps[id];
      effective[id] = headsetMax == null ? cap : Math.min(headsetMax, cap);
    }

    if (bottleneckId === "none") {
      var idealMax = headset.maxBitrateMbps[ideal];
      var idealEffective = idealMax == null ? cap : Math.min(idealMax, cap);
      if (ideal === "h264" && idealEffective < floor) bottleneckId = "network";
      if (ideal === "av1" && idealEffective < starved) bottleneckId = "network";
    }

    var chosen = pickCodec(scene.id, available, effective, floor);
    var chosenMax = chosen ? headset.maxBitrateMbps[chosen] : null;
    var bitrate = chosen ? bitrateText(chosen, chosenMax, cap) : { kind: "unknown", text: "不确定。" };
    var titles = {
      none: "没有明显卡点",
      gpu: "卡在显卡",
      headset: "卡在头显",
      network: "卡在网络"
    };
    var details = {
      none: "头显能解，显卡能编，网络也够这一档。",
      gpu: "头显能解这个格式，这张显卡编不了。",
      headset: "这台头显解不了更合适的格式。",
      network: "编码两边都支持，网络到不了需要的码率。"
    };

    var sourceIds = gpu.sourceIds.concat(headset.sourceIds).concat(["uploadvr-500"]);
    return {
      status: "ok",
      bottleneck: {
        id: bottleneckId,
        title: titles[bottleneckId],
        detail: details[bottleneckId]
      },
      codec: chosen ? { id: chosen, label: codecLabel(chosen) } : null,
      codecReason: chosen ? codecReason(scene, chosen, bottleneckId, chosenMax) : "",
      bitrate: bitrate,
      suggestion: suggestionFor(bottleneckId, ethernet),
      app: appRecommendation(headset),
      assumption: assumption,
      disclaimer: data.disclaimer,
      dataDate: data.dataDate,
      headsetNote: headset.note,
      networkNote: data.rules.networkNote,
      sources: usedSources(data, sourceIds),
      selection: {
        gpu: gpu.name,
        headset: headset.name,
        network: network.label,
        backhaul: backhaulLabel,
        scene: scene.label
      }
    };
  }

  function copyText(result) {
    if (!result || result.status === "incomplete") return "";
    var lines = [
      "WMAVR 串流诊断 · " + result.dataDate,
      "显卡：" + result.selection.gpu,
      "头显：" + result.selection.headset,
      "网络：" + result.selection.network + "，" + result.selection.backhaul,
      "场景：" + result.selection.scene,
      "假设：" + result.assumption,
      "瓶颈：" + result.bottleneck.title,
      result.bottleneck.detail
    ];
    if (result.codec) {
      lines.push("编码：" + result.codec.label);
      lines.push(result.codecReason);
      lines.push("码率：" + result.bitrate.text);
      lines.push(result.app.name + "。" + result.app.reason);
    } else {
      lines.push("编码：不确定");
      lines.push("码率：不确定");
    }
    lines.push("建议：" + result.suggestion);
    if (result.alternates) {
      result.alternates.forEach(function (item) {
        lines.push(item.label + "：" + item.summary);
      });
    }
    lines.push(result.disclaimer);
    lines.push("https://wmavr.com/");
    return lines.join("\n");
  }

  function outcomeKey(result) {
    var codec = result.codec ? result.codec.id : "";
    var rate = result.bitrate && result.bitrate.text ? result.bitrate.text.split("。")[0] : "";
    return result.bottleneck.id + "|" + codec + "|" + rate;
  }

  function alternateSummary(result) {
    var codec = result.codec ? result.codec.label : "不确定";
    var rate = result.bitrate && result.bitrate.text ? result.bitrate.text.split("。")[0] : "不确定";
    return result.bottleneck.title + "，编码 " + codec + "，" + rate;
  }

  function buildAlternates(data, input, current) {
    var steps = [];
    if (input.ethernet === false) {
      steps.push({
        networkId: input.networkId,
        ethernet: true,
        label: "电脑改用网线后"
      });
    }
    if (input.networkId !== "wifi6e" && current.bottleneck.id === "network") {
      steps.push({
        networkId: "wifi6e",
        ethernet: true,
        label: "头显改用 Wi-Fi 6E、电脑用网线后"
      });
    }
    var list = [];
    var seen = outcomeKey(current);
    steps.forEach(function (step) {
      var next = evaluate(data, {
        gpuId: input.gpuId,
        headsetId: input.headsetId,
        networkId: step.networkId,
        ethernet: step.ethernet,
        sceneId: input.sceneId
      });
      if (!next || next.status !== "ok") return;
      var key = outcomeKey(next);
      if (key === seen) return;
      seen = key;
      list.push({
        label: step.label,
        summary: alternateSummary(next),
        bottleneckId: next.bottleneck.id,
        codecId: next.codec ? next.codec.id : ""
      });
    });
    return list;
  }

  function diagnose(data, input) {
    var result = evaluate(data, input);
    if (result && result.status === "ok") result.alternates = buildAlternates(data, input, result);
    return result;
  }

  return { diagnose: diagnose, copyText: copyText };
});
