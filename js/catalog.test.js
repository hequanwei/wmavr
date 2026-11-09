"use strict";

var assert = require("assert");
var catalog = require("./catalog.js");
var data = require("../data/rig.json");
var matchGpu = catalog.matchGpu;
var modelKey = catalog.modelKey;

assert.strictEqual(modelKey("NVIDIA GeForce RTX 4070 Ti Super"), "rtx 4070 ti super");
assert.strictEqual(modelKey("AMD Radeon RX 7900 XTX"), "rx 7900 xtx");
assert.strictEqual(modelKey("AMD Radeon RX 7800 XT"), "rx 7800 xt");

var desktop = matchGpu(data.gpus, "ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 (0x2786) Direct3D11 vs_5_0 ps_5_0, D3D11)");
assert.strictEqual(desktop.kind, "match");
assert.strictEqual(desktop.gpu.id, "rtx-4070");

var tiSuper = matchGpu(data.gpus, "NVIDIA GeForce RTX 4070 Ti Super");
assert.strictEqual(tiSuper.gpu.id, "rtx-4070tis");

var laptop = matchGpu(data.gpus, "ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Laptop GPU Direct3D11 vs_5_0 ps_5_0, D3D11)");
assert.strictEqual(laptop.kind, "laptop");
assert.strictEqual(laptop.gpu, null);

var amd = matchGpu(data.gpus, "ANGLE (AMD, AMD Radeon RX 7800 XT Direct3D11 vs_5_0 ps_5_0, D3D11)");
assert.strictEqual(amd.gpu.id, "rx-7800xt");

var xtx = matchGpu(data.gpus, "AMD Radeon RX 7900 XTX");
assert.strictEqual(xtx.gpu.id, "rx-7900xtx");

var intel = matchGpu(data.gpus, "ANGLE (Intel, Intel(R) UHD Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)");
assert.strictEqual(intel.kind, "unknown");

var empty = matchGpu(data.gpus, "");
assert.strictEqual(empty.kind, "unread");

assert.strictEqual(modelKey("NVIDIA GeForce RTX 2060 Super"), "rtx 2060 super");
assert.strictEqual(matchGpu(data.gpus, "NVIDIA GeForce RTX 2060 Super").gpu.id, "rtx-2060s");
assert.strictEqual(matchGpu(data.gpus, "NVIDIA GeForce RTX 2060").gpu.id, "rtx-2060");
assert.strictEqual(matchGpu(data.gpus, "NVIDIA GeForce GTX 1660 Ti").gpu.id, "gtx-1660ti");
assert.strictEqual(matchGpu(data.gpus, "NVIDIA GeForce GTX 1660").gpu.id, "gtx-1660");
assert.strictEqual(matchGpu(data.gpus, "NVIDIA GeForce GTX 1080 Ti").gpu.id, "gtx-1080ti");

console.log("catalog.test.js passed");
