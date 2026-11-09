"use strict";

var assert = require("assert");
var diagnoseApi = require("./diagnose.js");
var data = require("../data/rig.json");
var diagnose = diagnoseApi.diagnose;
var copyText = diagnoseApi.copyText;

function run(gpuId, headsetId, networkId, ethernet, sceneId) {
  return diagnose(data, {
    gpuId: gpuId,
    headsetId: headsetId,
    networkId: networkId,
    ethernet: ethernet,
    sceneId: sceneId
  });
}

var darkAv1 = run("rtx-4070", "quest3", "wifi6e", true, "dark");
assert.strictEqual(darkAv1.status, "ok");
assert.strictEqual(darkAv1.bottleneck.id, "none");
assert.strictEqual(darkAv1.codec.id, "av1");
assert.ok(darkAv1.bitrate.text.indexOf("200") !== -1);

var gpuBlocksAv1 = run("rtx-3060ti", "quest3", "wifi6e", true, "dark");
assert.strictEqual(gpuBlocksAv1.bottleneck.id, "gpu");
assert.strictEqual(gpuBlocksAv1.codec.id, "hevc");

var headsetBeforeGpu = run("rtx-3060ti", "pico4", "wifi6e", true, "dark");
assert.strictEqual(headsetBeforeGpu.bottleneck.id, "headset");
assert.strictEqual(headsetBeforeGpu.codec.id, "hevc");
assert.strictEqual(headsetBeforeGpu.bitrate.kind, "unknown");

var picoStillHeadset = run("rtx-4070", "pico4", "wifi6e", true, "dark");
assert.strictEqual(picoStillHeadset.bottleneck.id, "headset");
assert.ok(picoStillHeadset.app.reason.indexOf("国行") !== -1);
assert.strictEqual(picoStillHeadset.app.name, "Virtual Desktop");

var rhythm = run("rtx-4070", "quest3", "wifi6e", true, "rhythm");
assert.strictEqual(rhythm.bottleneck.id, "none");
assert.strictEqual(rhythm.codec.id, "h264");
assert.ok(rhythm.bitrate.text.indexOf("400–500") !== -1);

var rhythmOnWifi5 = run("rtx-4070", "quest3", "wifi5", true, "rhythm");
assert.strictEqual(rhythmOnWifi5.bottleneck.id, "network");
assert.notStrictEqual(rhythmOnWifi5.codec.id, "h264");

var noCable = run("rtx-4070", "quest3", "wifi6e", false, "rhythm");
assert.strictEqual(noCable.bottleneck.id, "network");
assert.ok(noCable.suggestion.indexOf("网线") !== -1);

var simClipped = run("rtx-4070", "quest3", "wifi6", true, "sim");
assert.strictEqual(simClipped.bottleneck.id, "network");
assert.strictEqual(simClipped.codec.id, "av1");

var simOpen = run("rx-7800xt", "quest3", "wifi6e", true, "sim");
assert.strictEqual(simOpen.bottleneck.id, "none");
assert.strictEqual(simOpen.codec.id, "h264");

var quest3s = run("rtx-4070", "quest3s", "wifi6e", true, "rhythm");
assert.strictEqual(quest3s.codec.id, "h264");
assert.strictEqual(quest3s.bitrate.kind, "unknown");
assert.ok(quest3s.bitrate.text.indexOf("不给出具体区间") !== -1);
assert.ok(quest3s.bitrate.text.indexOf("400–500") === -1);

var unknown = run("unknown", "quest3", "wifi6e", true, "dark");
assert.strictEqual(unknown.status, "uncertain");
assert.strictEqual(unknown.codec, null);
assert.ok(copyText(unknown).indexOf("不确定") !== -1);
assert.ok(copyText(unknown).indexOf("500") === -1);

var copied = copyText(darkAv1);
assert.ok(copied.indexOf("90Hz") !== -1);
assert.ok(copied.indexOf("不预测某一款游戏的帧率") !== -1);
assert.ok(copied.indexOf("https://wmavr.com/") !== -1);
assert.ok(copied.indexOf("?") === -1);

assert.strictEqual(run("rtx-4070", "quest3", "wifi6e", true, "missing").status, "incomplete");

assert.strictEqual(darkAv1.alternates.length, 0);

assert.strictEqual(noCable.alternates.length, 1);
assert.strictEqual(noCable.alternates[0].bottleneckId, "none");
assert.strictEqual(noCable.alternates[0].codecId, "h264");
assert.ok(noCable.alternates[0].label.indexOf("网线") !== -1);
assert.ok(copyText(noCable).indexOf("电脑改用网线后") !== -1);
assert.ok(copyText(noCable).indexOf("?") === -1);

assert.strictEqual(rhythmOnWifi5.alternates.length, 1);
assert.strictEqual(rhythmOnWifi5.alternates[0].bottleneckId, "none");
assert.strictEqual(rhythmOnWifi5.alternates[0].codecId, "h264");

var wifi5Wireless = run("rtx-4070", "quest3", "wifi5", false, "rhythm");
assert.strictEqual(wifi5Wireless.alternates.length, 2);
assert.strictEqual(wifi5Wireless.alternates[1].bottleneckId, "none");
assert.strictEqual(wifi5Wireless.alternates[1].codecId, "h264");

var turing = run("rtx-2060", "quest3", "wifi6e", true, "dark");
assert.strictEqual(turing.bottleneck.id, "gpu");
assert.strictEqual(turing.codec.id, "hevc");

var pascal = run("gtx-1060", "quest3", "wifi6e", true, "dark");
assert.strictEqual(pascal.bottleneck.id, "gpu");
assert.strictEqual(pascal.codec.id, "hevc");

console.log("diagnose.test.js: " + 12 + " cases passed");
