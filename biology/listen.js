/* Click-to-listen lesson reader. Browser SpeechSynthesis only.
   No paid TTS, no API, no hosted audio, no autoplay. */
(function () {
  "use strict";

  var NORMAL = 1;
  var SLOW = 0.9;
  var CHUNK = 240;
  var SKIP =
    ".practice,.sample,.homework,nav,footer,.pager,.ix-jumpbox,.ix-bar," +
    ".ix-practice,.ix-dots,.listen,.feedback,.actions,script,style," +
    "textarea,button,label,.wc,.sr-only,.choice,.tag-row,.ix-chiprow";

  var box, playBtn, pauseBtn, stopBtn, slowBox, msgEl;
  var queue = [];
  var qIndex = 0;
  var current = null;
  var active = false;
  var paused = false;
  var rate = NORMAL;

  function supported() {
    return typeof window.speechSynthesis === "object" &&
      window.speechSynthesis !== null &&
      typeof window.SpeechSynthesisUtterance === "function";
  }

  function paint() {
    if (!playBtn) return;
    playBtn.setAttribute("aria-pressed", active ? "true" : "false");
    if (pauseBtn) {
      pauseBtn.hidden = !active;
      pauseBtn.textContent = paused ? "Resume" : "Pause";
    }
    if (stopBtn) stopBtn.hidden = !active;
  }

  function hardStop() {
    active = false;
    paused = false;
    queue = [];
    qIndex = 0;
    current = null;
    try { window.speechSynthesis.cancel(); } catch (e) {}
    paint();
  }

  function chunkText(text) {
    var parts = [];
    var re = /[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g;
    var m, buf = "";
    while ((m = re.exec(text))) {
      var s = m[0].replace(/\s+/g, " ").trim();
      if (!s) continue;
      if (buf && buf.length + s.length + 1 > CHUNK) {
        parts.push(buf);
        buf = s;
      } else {
        buf = buf ? buf + " " + s : s;
      }
    }
    if (buf) parts.push(buf);
    return parts.length ? parts : [text];
  }

  function extractText(root) {
    if (!root) return "";
    var clone = root.cloneNode(true);
    try {
      clone.querySelectorAll(SKIP).forEach(function (el) { el.remove(); });
    } catch (e) {}
    var t = (clone.innerText || clone.textContent || "").replace(/\s+/g, " ").trim();
    return t;
  }

  function lessonRoot() {
    var article = document.querySelector("article#main, article.wrap, main, article");
    var marked = document.querySelector("[data-listen-source]");
    if (marked) {
      var pack = document.createElement("div");
      var h1 = article && article.querySelector("h1");
      var lede = article && article.querySelector(".lede");
      if (h1 && !marked.contains(h1)) pack.appendChild(h1.cloneNode(true));
      if (lede && !marked.contains(lede)) pack.appendChild(lede.cloneNode(true));
      pack.appendChild(marked.cloneNode(true));
      return pack;
    }

    var scope = article || document.body;
    var h2s = scope.querySelectorAll("h2");
    var lesson = null;
    for (var i = 0; i < h2s.length; i++) {
      if (/^\s*lesson\s*$/i.test(h2s[i].textContent || "")) {
        lesson = h2s[i];
        break;
      }
    }
    if (!lesson) return scope;

    var boxEl = document.createElement("div");
    var el = lesson;
    while (el) {
      if (el !== lesson) {
        if (el.matches && el.matches(
          ".practice,.homework,nav,footer,.pager,.ix-practice,.ix-jumpbox"
        )) break;
        if (el.tagName === "FOOTER" || el.tagName === "NAV") break;
        if (el.tagName === "H2" && /^\s*homework\s*$/i.test(el.textContent || "")) break;
      }
      boxEl.appendChild(el.cloneNode(true));
      el = el.nextElementSibling;
    }
    return boxEl;
  }

  function speakNext() {
    if (!active || paused) return;
    if (qIndex >= queue.length) {
      hardStop();
      return;
    }
    var u = new SpeechSynthesisUtterance(queue[qIndex]);
    u.rate = rate;
    u.pitch = 1;
    u.lang = document.documentElement.lang || "en";
    u.onend = function () {
      if (!active || paused) return;
      qIndex += 1;
      speakNext();
    };
    u.onerror = function () {
      if (!active) return;
      qIndex += 1;
      speakNext();
    };
    current = u;
    try { window.speechSynthesis.speak(u); } catch (e) { hardStop(); }
  }

  function start() {
    if (!supported()) return;
    hardStop();
    var text = extractText(lessonRoot());
    if (!text) return;
    queue = chunkText(text);
    qIndex = 0;
    active = true;
    paused = false;
    paint();
    window.setTimeout(speakNext, 60);
  }

  function togglePause() {
    if (!active || !supported()) return;
    if (paused) {
      paused = false;
      paint();
      try { window.speechSynthesis.resume(); } catch (e) {}
      if (window.speechSynthesis.paused === false && window.speechSynthesis.speaking === false) {
        speakNext();
      }
      return;
    }
    paused = true;
    paint();
    try { window.speechSynthesis.pause(); } catch (e) {}
  }

  function buildUI() {
    box = document.createElement("div");
    box.className = "listen";
    box.setAttribute("role", "group");
    box.setAttribute("aria-label", "Listen to the lesson");

    playBtn = document.createElement("button");
    playBtn.type = "button";
    playBtn.className = "listen-play";
    playBtn.setAttribute("aria-pressed", "false");
    playBtn.textContent = "Listen to the lesson";

    pauseBtn = document.createElement("button");
    pauseBtn.type = "button";
    pauseBtn.className = "listen-pause";
    pauseBtn.hidden = true;
    pauseBtn.textContent = "Pause";

    stopBtn = document.createElement("button");
    stopBtn.type = "button";
    stopBtn.className = "listen-stop";
    stopBtn.hidden = true;
    stopBtn.textContent = "Stop";

    var rateLabel = document.createElement("label");
    rateLabel.className = "listen-rate";
    slowBox = document.createElement("input");
    slowBox.type = "checkbox";
    slowBox.className = "listen-slow";
    rateLabel.appendChild(slowBox);
    rateLabel.appendChild(document.createTextNode(" Slow"));

    msgEl = document.createElement("p");
    msgEl.className = "listen-msg";
    msgEl.hidden = true;
    msgEl.textContent = "This browser can’t read aloud. Try Chrome or Safari.";

    box.appendChild(playBtn);
    box.appendChild(pauseBtn);
    box.appendChild(stopBtn);
    box.appendChild(rateLabel);
    box.appendChild(msgEl);

    if (!supported()) {
      playBtn.hidden = true;
      pauseBtn.hidden = true;
      stopBtn.hidden = true;
      rateLabel.hidden = true;
      msgEl.hidden = false;
      return box;
    }

    playBtn.addEventListener("click", function () {
      if (active && !paused) return;
      if (active && paused) { togglePause(); return; }
      start();
    });
    pauseBtn.addEventListener("click", togglePause);
    stopBtn.addEventListener("click", hardStop);
    slowBox.addEventListener("change", function () {
      rate = slowBox.checked ? SLOW : NORMAL;
    });
    return box;
  }

  function mount() {
    if (document.querySelector(".listen")) return;
    var article = document.querySelector("article#main, article.wrap, main") || document.body;
    var ui = buildUI();
    var jump = article.querySelector(".ix-jumpbox");
    if (jump) { jump.before(ui); return; }
    var meta = article.querySelector(".meta");
    if (meta) { meta.after(ui); return; }
    var lede = article.querySelector(".lede");
    if (lede) { lede.after(ui); return; }
    var h1 = article.querySelector("h1");
    if (h1) { h1.after(ui); return; }
    article.insertBefore(ui, article.firstChild);
  }

  function bindLeave() {
    window.addEventListener("pagehide", hardStop);
    window.addEventListener("beforeunload", hardStop);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { mount(); bindLeave(); });
  } else {
    mount();
    bindLeave();
  }
})();
