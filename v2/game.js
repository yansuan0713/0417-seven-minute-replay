"use strict";
/* 《04:17 · 七分钟重播》自由探索版
   结构：自由探索（无阶段门）+ 三类锁（数字码 / 语义口令 / 时序拼图）+ 关键词检索 + 结案一次性核对。
   所有判定仅以 SHA-256 哈希校验，不以明文比对。 */
const HASH = {
  code:    "e4782cfc2b471cd4e24686f692188416d8a313cccb62679dc08c348447c2507b", // 解封码与研判二共用（四位数字）
  pass:    "7116ee77844e2dadaa1d70ca054feca88e4c8fb8f2f437499f40c1ccd5d3fc5f", // 备忘口令
  seq:     "9e41806aa4399769c6d3c5acb78ce796596780d8ff361f883bad37f66952df79", // 时序拼图正确顺序
  q1:      "7691320f6a991d3ec7aa264cbdf12ae49e19b5d68f0d855b4b162f9a009fe713",
  culprit: "740387eac428a02387eec17bf42f4d886df55b65e3ac26189764f15925950c0d",
  contra:  "11c69a840e03f2e7c40f29874551ebc5de0ffbed4dd7a405790970dacaa2e035",
  where:   "30c9d39c81b563050729c03d81c7c0b3002b7751cced2a417189b078e33b890a",
  motive:  "ceae101aaa078e14d8b14724ccecae16a54931f776808bed8f05f16330266259"
};
const HINTS = {
  locker: ["码不在柜子上，在停车场日志里。",
           "#445 的入场时刻＋票面时长，等于它的真实离场时刻。把那个时刻去掉冒号，就是四位码。"],
  memo:   ["去「苏晏的终端残片」里搜一搜“口令”。",
           "从不读墙钟、只管自己往前走的东西——停车场日志的说明里，第一行就写了它的名字，五个字。"],
  seq:    ["先排死时刻：03:58 入场一定最早；第一遍的 04:20 在 04:24 之前。",
           "只剩离场卡的位置是活的：它的水印是假的。用停车场日志把真实时刻算出来——它落在回滚之后。"]
};
const FRAGS = [
  { id: "M-02", keys: ["审计片", "原件", "副本"], text: "例行巡检时我数过，冷档案库的审计片一共三块，原件编号 A-01。谁要是动它，保全规程要求我先保副本——我一直照做。" },
  { id: "M-05", keys: ["顾衡", "主管"], text: "主管今晚第三次路过保全室，问的都是回滚演练的权限。他说只是例行确认。可那道命令，三年没人动过了。" },
  { id: "M-07", keys: ["克隆卡", "第二张", "卡"], text: "我的卡尾号是 03，只发过一张。可门禁报警跳出来的，也是 03。这个世界上，不该有第二张 03。" },
  { id: "M-09", keys: ["墙钟", "挂钟", "时钟", "时间"], text: "别信墙钟。它是全城最听话的东西——谁都能让它改口。" },
  { id: "M-11", keys: ["口令", "密码", "备忘"], text: "备忘的口令，我设成了那个从不读墙钟、只管自己往前走的东西的名字。五个字。它今晚也在停车场值班。" },
  { id: "M-13", keys: ["陈默", "便利舱", "后门", "后间"], text: "陈默的后间有一张行军床，她说那是给值夜的人留的。我希望永远用不上它。" },
  { id: "M-15", keys: ["电梯", "货运", "货运梯"], text: "货运梯的计数器是机械的。它响一次，就是一次，不会因为谁改了墙钟，就变成零次。" },
  { id: "M-17", keys: ["回滚", "演练"], text: "回滚演练的命令只能在 OPS-03 上按，虹膜加卡，缺一不可。当晚的虹膜名单——人事表上写着呢。" },
  { id: "M-19", keys: ["防洪闸", "滨江", "汛期"], text: "A-01 里存的是滨江防洪闸的维护原始记录。去年汛期那次险情之后，有人很希望这份记录“不存在”。" }
];
const KEY = "arg0417-v2";
let S = { u: { locker: false, memo: false, raw: false }, found: [], notes: "", best: 0 };
try { Object.assign(S, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) {}
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}
const digits4 = (v) => (String(v).replace(/\D/g, "").padStart(4, "0")).slice(-4);
function save() { localStorage.setItem(KEY, JSON.stringify(S)); }
function feedback(id, ok, msg) {
  const el = $(id); if (!el) return;
  el.textContent = msg; el.className = "feedback " + (ok ? "ok" : "err");
}
function matCount() { return Object.values(S.u).filter(Boolean).length; }
function render() {
  $("#mat-count").textContent = "关键材料 " + matCount() + " / 3";
  $("#home-status").textContent = "关键材料解封进度：" + matCount() + " / 3" +
    (S.best ? " · 结案报告历史最佳：" + S.best + " / 6" : "");
  $("#locker-lock").classList.toggle("hidden", S.u.locker);
  $("#locker-open").classList.toggle("hidden", !S.u.locker);
  $("#memo-lock").classList.toggle("hidden", S.u.memo);
  $("#memo-open").classList.toggle("hidden", !S.u.memo);
  $("#seq-lock").classList.toggle("hidden", S.u.raw);
  $("#seq-open").classList.toggle("hidden", !S.u.raw);
  renderFrags();
}
function goto(view) {
  $$(".view").forEach(v => v.classList.add("hidden"));
  $("#view-" + view).classList.remove("hidden");
  $$(".nav").forEach(n => n.classList.toggle("on", n.dataset.goto === view));
  window.scrollTo({ top: 0, behavior: "smooth" });
}
document.addEventListener("click", (e) => {
  const g = e.target.closest("[data-goto]");
  if (g) goto(g.dataset.goto);
});

/* 笔记 */
const notesEl = $("#notes");
notesEl.value = S.notes || "";
notesEl.addEventListener("input", () => { S.notes = notesEl.value; save(); });

/* 锁 1：数字码 */
$("#btn-locker").addEventListener("click", async () => {
  const v = $("#locker-code").value.trim();
  if (!v) return feedback("#fb-locker", false, "先输入四位解封码。");
  if ((await sha256(digits4(v))) === HASH.code) {
    S.u.locker = true; save(); render();
  } else feedback("#fb-locker", false, "解封失败。封条纹丝不动——这个码只认一个时刻。");
});

/* 锁 2：语义口令 */
$("#btn-memo").addEventListener("click", async () => {
  const v = $("#memo-pass").value.trim();
  if (!v) return feedback("#fb-memo", false, "先输入口令。");
  if ((await sha256(v)) === HASH.pass) {
    S.u.memo = true; save(); render();
  } else feedback("#fb-memo", false, "口令不对。文件保持沉默。");
});

/* 锁 3：时序拼图 */
let picked = [];
function renderSeq() {
  $$(".seq-card").forEach(c => {
    const i = picked.indexOf(c.dataset.ev);
    c.classList.toggle("picked", i >= 0);
    let ord = c.querySelector(".ord");
    if (i >= 0) {
      if (!ord) { ord = document.createElement("span"); ord.className = "ord"; c.appendChild(ord); }
      ord.textContent = i + 1;
    } else if (ord) ord.remove();
  });
}
$("#seq-grid").addEventListener("click", (e) => {
  const card = e.target.closest(".seq-card"); if (!card || S.u.raw) return;
  const ev = card.dataset.ev;
  picked = picked.includes(ev) ? picked.filter(x => x !== ev) : [...picked, ev];
  renderSeq();
});
$("#btn-seq-reset").addEventListener("click", () => { picked = []; renderSeq(); feedback("#fb-seq", false, ""); });
$("#btn-seq").addEventListener("click", async () => {
  if (picked.length !== 4) return feedback("#fb-seq", false, "先把四张事件卡全部排好顺序。");
  if ((await sha256(picked.join(","))) === HASH.seq) {
    S.u.raw = true; save(); render();
  } else feedback("#fb-seq", false, "顺序不成立，日志索引拒绝展开。再对一遍每张卡背后的时刻——有一张卡的时间是假的。");
});

/* 关键词检索 */
function renderFrags() {
  const box = $("#frag-list");
  box.innerHTML = "";
  FRAGS.filter(f => S.found.includes(f.id)).forEach(f => {
    const d = document.createElement("div");
    d.className = "doc frag";
    d.innerHTML = '<p class="doc-title">碎片 ' + f.id + "</p><p></p>";
    d.querySelector("p:last-child").textContent = "“" + f.text + "”";
    box.appendChild(d);
  });
}
$("#btn-search").addEventListener("click", () => {
  const q = $("#search-word").value.trim();
  if (!q) return feedback("#fb-search", false, "先输入一个关键词。");
  const hits = FRAGS.filter(f => !S.found.includes(f.id) &&
    f.keys.some(k => q.includes(k) || k.includes(q)));
  if (hits.length) {
    hits.forEach(f => S.found.push(f.id));
    save(); render();
    feedback("#fb-search", true, "调出新碎片 " + hits.length + " 条（累计已调出 " + S.found.length + " / " + FRAGS.length + " 条）。");
  } else {
    const any = FRAGS.some(f => f.keys.some(k => q.includes(k) || k.includes(q)));
    feedback("#fb-search", false, any ? "这个词命中的碎片都已经调出来了。" :
      "没有命中。换个词——人名、物品、地点，或者她会在意的东西。");
  }
});
$("#search-word").addEventListener("keydown", (e) => { if (e.key === "Enter") $("#btn-search").click(); });

/* 提示 */
const hintLevel = {};
$$("[data-hint]").forEach(btn => btn.addEventListener("click", () => {
  const k = btn.dataset.hint;
  hintLevel[k] = Math.min((hintLevel[k] || 0) + 1, HINTS[k].length);
  const box = document.querySelector('[data-hint-text="' + k + '"]');
  box.textContent = "提示 " + hintLevel[k] + "：" + HINTS[k][hintLevel[k] - 1];
  box.classList.remove("hidden");
}));

/* 结案报告 */
const sel = {};
$$(".options").forEach(group => group.addEventListener("click", (e) => {
  const btn = e.target.closest(".opt"); if (!btn) return;
  group.querySelectorAll(".opt").forEach(b => b.classList.remove("sel"));
  btn.classList.add("sel");
  sel[group.dataset.group] = btn.dataset.t;
}));
$("#btn-report").addEventListener("click", async () => {
  const t = $("#r-time").value.trim();
  if (!sel.q1 || !sel.culprit || !sel.contra || !sel.where || !sel.motive || !t) {
    $("#report-result").innerHTML = '<p class="feedback err">报告还没填完——六项研判一项都不能空着。</p>';
    return;
  }
  const checks = [
    ["研判一 · 异常的性质", (await sha256(sel.q1)) === HASH.q1],
    ["研判二 · #445 的真实离场时刻", (await sha256(digits4(t))) === HASH.code],
    ["研判三 · 触发回滚的人", (await sha256(sel.culprit)) === HASH.culprit],
    ["研判四 · 击穿顾衡陈述的证据", (await sha256(sel.contra)) === HASH.contra],
    ["研判五 · 苏晏的下落", (await sha256(sel.where)) === HASH.where],
    ["研判六 · 被取走的原件", (await sha256(sel.motive)) === HASH.motive]
  ];
  const score = checks.filter(c => c[1]).length;
  S.best = Math.max(S.best, score); save(); render();
  $("#report-result").innerHTML =
    '<p class="feedback ' + (score === 6 ? "ok" : "err") + '">核对完毕：' + score + " / 6 项成立。" +
    "调查完整度：关键材料 " + matCount() + " / 3，终端碎片 " + S.found.length + " / " + FRAGS.length + "。</p>" +
    checks.map(c => '<div class="result-item ' + (c[1] ? "ok" : "no") + '">' +
      (c[1] ? "✓ 成立 —— " : "✗ 不成立 —— ") + c[0] + "</div>").join("") +
    (score === 6 ? "" : '<p class="note">不成立的项已经标出。回到材料里再对一遍，改完可以重新提交——终端不记仇。</p>');
  $("#finale").classList.toggle("hidden", score !== 6);
  if (score === 6) $("#finale").scrollIntoView({ behavior: "smooth" });
});

$("#btn-reset").addEventListener("click", () => { localStorage.removeItem(KEY); location.reload(); });

/* 标题时钟故障动画 */
(function () {
  const el = $("#title-clock"); if (!el) return;
  setInterval(() => {
    el.textContent = "04:24"; el.classList.add("glitching");
    setTimeout(() => { el.textContent = "04:17"; el.classList.remove("glitching"); }, 340);
  }, 5200);
})();

render();
