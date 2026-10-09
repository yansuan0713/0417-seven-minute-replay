"use strict";
/* 《04:17 · 七分钟重播》—— 研判答案仅以 SHA-256 哈希校验，不以明文比对。 */
const HASH = {
  q1:     "7691320f6a991d3ec7aa264cbdf12ae49e19b5d68f0d855b4b162f9a009fe713",
  time:   "e4782cfc2b471cd4e24686f692188416d8a313cccb62679dc08c348447c2507b",
  code:   "e4782cfc2b471cd4e24686f692188416d8a313cccb62679dc08c348447c2507b",
  culprit:"740387eac428a02387eec17bf42f4d886df55b65e3ac26189764f15925950c0d",
  contra: "11c69a840e03f2e7c40f29874551ebc5de0ffbed4dd7a405790970dacaa2e035"
};
const HINTS = {
  s1: ["先逐辆验算：入场时刻＋票面时长，应当等于什么？",
       "注意 #444 之后：照片序号在前进，水印时间却不增反减。单调计时器不会说谎——减下去的只能是墙钟。分界点就在 #444 与 #445 之间。"],
  s2: ["解封码与任何人的生日、工牌号都无关，它只由封存规则决定。",
       "回到阶段一的研判 2：那辆车的真实离场时刻，去掉冒号，就是四位码。"],
  s3: ["先别看谁“像”坏人。逐条核对：谁的陈述与单调计时器算出的真实时刻冲突？",
       "OPS-03 当晚的虹膜名单只有一人；而他的不在场证明，恰好建立在一张只读墙钟的水印上。"]
};
const KEY = "arg0417-progress-v1";
let progress = 0; // 0 未开始 1 阶段一已开 2 阶段二已开 3 阶段三已开 4 已结案
try { progress = JSON.parse(localStorage.getItem(KEY)) || 0; } catch (e) {}

const $ = (s) => document.querySelector(s);
const sel = {}; // 每组单选的当前 token

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}
const digits4 = (v) => (v.replace(/\D/g, "").padStart(4, "0")).slice(-4);

function save() { localStorage.setItem(KEY, JSON.stringify(progress)); }
function render() {
  $("#stage1").classList.toggle("hidden", progress < 1);
  $("#stage2").classList.toggle("hidden", progress < 2);
  $("#locker").classList.toggle("hidden", progress < 3 && !lockerOpen);
  $("#stage3").classList.toggle("hidden", progress < 3);
  $("#finale").classList.toggle("hidden", progress < 4);
  document.querySelectorAll(".progress .step").forEach(el => {
    el.classList.toggle("on", Number(el.dataset.step) <= Math.max(progress, 0) && progress >= 1);
  });
}
let lockerOpen = false;

function feedback(id, ok, msg) {
  const el = $(id); el.textContent = msg; el.className = "feedback " + (ok ? "ok" : "err");
}

/* 单选组 */
document.querySelectorAll(".options").forEach(group => {
  group.addEventListener("click", (e) => {
    const btn = e.target.closest(".opt"); if (!btn) return;
    group.querySelectorAll(".opt").forEach(b => b.classList.remove("sel"));
    btn.classList.add("sel");
    sel[group.dataset.group] = btn.dataset.t;
  });
});

/* 提示（每阶段多级，逐级展开） */
const hintLevel = {};
document.querySelectorAll("[data-hint]").forEach(btn => {
  btn.addEventListener("click", () => {
    const k = btn.dataset.hint;
    hintLevel[k] = Math.min((hintLevel[k] || 0) + 1, HINTS[k].length);
    const box = document.querySelector(`[data-hint-text="${k}"]`);
    box.textContent = "提示 " + hintLevel[k] + "：" + HINTS[k][hintLevel[k] - 1];
    box.classList.remove("hidden");
  });
});

$("#btn-start").addEventListener("click", () => {
  if (progress < 1) { progress = 1; save(); }
  render(); $("#stage1").scrollIntoView({ behavior: "smooth" });
});

$("#btn-s1").addEventListener("click", async () => {
  const t = $("#s1-time").value.trim();
  if (!sel.q1) return feedback("#fb-s1", false, "先完成研判 1 的选择。");
  if (!t) return feedback("#fb-s1", false, "先填入 #445 的真实离场时刻。");
  const okQ1 = (await sha256(sel.q1)) === HASH.q1;
  const okT = (await sha256(digits4(t))) === HASH.time;
  if (okQ1 && okT) {
    feedback("#fb-s1", true, "研判成立：七分钟没有消失，它被重播了一次。证据袋 17 已解封送达——见阶段二。");
    if (progress < 2) { progress = 2; save(); }
    render(); $("#stage2").scrollIntoView({ behavior: "smooth" });
  } else if (!okQ1 && okT) {
    feedback("#fb-s1", false, "真实时刻算对了，但对异常性质的判断与证据不符——再想想水印时间为什么会倒退。");
  } else if (okQ1 && !okT) {
    feedback("#fb-s1", false, "异常性质判断正确，但 #445 的真实时刻不对。用入场时刻加票面时长再算一遍。");
  } else {
    feedback("#fb-s1", false, "两项都与证据不符。回到日志，先逐辆验算入场时刻＋票面时长。");
  }
});

$("#btn-s2").addEventListener("click", async () => {
  const v = $("#s2-code").value.trim();
  if (!v) return feedback("#fb-s2", false, "先输入四位解封码。");
  if ((await sha256(digits4(v))) === HASH.code) {
    feedback("#fb-s2", true, "校验通过。证据袋开启。");
    lockerOpen = true; render();
    $("#locker").scrollIntoView({ behavior: "smooth" });
  } else {
    feedback("#fb-s2", false, "校验失败。这只袋子的码只认一个时刻——回到阶段一的研判 2。");
  }
});

$("#btn-to3").addEventListener("click", () => {
  if (progress < 3) { progress = 3; save(); }
  render(); $("#stage3").scrollIntoView({ behavior: "smooth" });
});

$("#btn-s3").addEventListener("click", async () => {
  if (!sel.culprit || !sel.contra) return feedback("#fb-s3", false, "先完成研判 3 与研判 4 的选择。");
  const okC = (await sha256(sel.culprit)) === HASH.culprit;
  const okX = (await sha256(sel.contra)) === HASH.contra;
  if (okC && okX) {
    feedback("#fb-s3", true, "结论成立。证据链闭合——结案陈词已生成。");
    progress = 4; save(); render();
    $("#finale").scrollIntoView({ behavior: "smooth" });
  } else if (!okC && okX) {
    feedback("#fb-s3", false, "矛盾点找对了，但指认的人不对——击穿的是谁的陈述，触发者就是谁。再核对虹膜名单。");
  } else if (okC && !okX) {
    feedback("#fb-s3", false, "指认成立，但击穿其陈述的证据选错了。他的不在场证明建立在什么上面？");
  } else {
    feedback("#fb-s3", false, "结论与证据链不符。回到权限表与三份陈述，逐条核验时刻与权限。");
  }
});

$("#btn-reset").addEventListener("click", () => {
  localStorage.removeItem(KEY); location.reload();
});

render();
if (progress >= 1) $("#intro").querySelector("#btn-start").textContent = "继续调查";
