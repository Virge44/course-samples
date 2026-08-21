/* Shared course player. No live LLM. Progress stays in this origin's localStorage. */
(function () {
  "use strict";

  var COURSES = {
    cw101: {
      name: "Critical Writing 101",
      units: 8,
      titles: ["Audience", "Reading", "Claim", "Evidence", "Paragraphs", "Draft", "Revise", "Sources"]
    },
    ar101: {
      name: "Analytical Reasoning 101",
      units: 8,
      titles: ["Reasons", "Assumptions", "Valid/sound", "Numbers", "Analogies", "Fallacies", "Short case", "Close"]
    }
  };

  var root = document.documentElement;
  var courseId = root.getAttribute("data-course");
  var page = root.getAttribute("data-page") || "";
  var unitAttr = root.getAttribute("data-unit");
  var unitNum = unitAttr ? parseInt(unitAttr, 10) : 0;
  var course = COURSES[courseId];
  if (!course || !courseId) return;

  var STORE = "college101." + courseId;

  function load() {
    try {
      var raw = localStorage.getItem(STORE);
      if (!raw) return { done: {}, practiceFirst: false };
      var o = JSON.parse(raw);
      return {
        done: o.done && typeof o.done === "object" ? o.done : {},
        practiceFirst: !!o.practiceFirst
      };
    } catch (e) {
      return { done: {}, practiceFirst: false };
    }
  }

  function save(state) {
    try {
      localStorage.setItem(STORE, JSON.stringify({
        done: state.done,
        practiceFirst: !!state.practiceFirst
      }));
    } catch (e) {}
  }

  function taKey(id) {
    return STORE + ".ta." + id;
  }

  function countDone(state) {
    var n = 0;
    for (var i = 1; i <= course.units; i++) {
      if (state.done[String(i)]) n++;
    }
    return n;
  }

  function nextOpen(state) {
    for (var i = 1; i <= course.units; i++) {
      if (!state.done[String(i)]) return i;
    }
    return 1;
  }

  var state = load();

  function markDone(n) {
    if (!n) return;
    var key = String(n);
    if (state.done[key]) {
      paintProgress();
      return;
    }
    state.done[key] = true;
    save(state);
    paintProgress();
    announce(course.units === countDone(state)
      ? "All eight units marked done in this browser."
      : "Unit " + n + " marked done. " + countDone(state) + " of " + course.units + ".");
  }

  var liveRegion = null;
  function announce(msg) {
    if (!liveRegion) return;
    liveRegion.textContent = msg;
  }

  function unitHref(n) {
    return "unit-" + n + ".html";
  }

  function makeDots(current) {
    var wrap = document.createElement("div");
    wrap.className = "ix-dots";
    wrap.setAttribute("role", "navigation");
    wrap.setAttribute("aria-label", "Units");
    for (var i = 1; i <= course.units; i++) {
      var a = document.createElement("a");
      a.className = "ix-dot";
      a.href = unitHref(i);
      a.textContent = String(i);
      a.title = "Unit " + i + " · " + course.titles[i - 1];
      a.setAttribute("aria-label", "Unit " + i + ", " + course.titles[i - 1] + (state.done[String(i)] ? ", done" : ""));
      if (state.done[String(i)]) a.classList.add("is-done");
      if (i === current) {
        a.classList.add("is-now");
        a.setAttribute("aria-current", "page");
      }
      wrap.appendChild(a);
    }
    return wrap;
  }

  function paintProgress() {
    var n = countDone(state);
    document.querySelectorAll("[data-ix-count]").forEach(function (el) {
      el.textContent = n + " / " + course.units + " done";
    });
    document.querySelectorAll(".ix-dot").forEach(function (el) {
      var href = el.getAttribute("href") || "";
      var m = href.match(/unit-(\d+)/);
      if (!m) return;
      var i = m[1];
      el.classList.toggle("is-done", !!state.done[i]);
    });
    document.querySelectorAll("[data-ix-home-count]").forEach(function (el) {
      el.innerHTML = "<strong>" + n + " of " + course.units + "</strong> units done";
    });
    document.querySelectorAll("[data-ix-start]").forEach(function (el) {
      var next = nextOpen(state);
      if (n === 0) {
        el.textContent = "Start Unit 1";
        el.setAttribute("href", "unit-1.html");
      } else if (n >= course.units) {
        el.textContent = "Review Unit 1";
        el.setAttribute("href", "unit-1.html");
      } else {
        el.textContent = "Continue Unit " + next;
        el.setAttribute("href", unitHref(next));
      }
    });
  }

  function buildBar() {
    var bar = document.createElement("div");
    bar.className = "ix-bar";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Course progress");

    var home = document.createElement("a");
    home.href = "index.html";
    home.textContent = "Course home";
    if (page === "home") home.setAttribute("aria-current", "page");

    var who = document.createElement("div");
    who.className = "ix-who";
    var title = document.createElement("strong");
    title.textContent = course.name;
    var sub = document.createElement("span");
    sub.textContent = unitNum
      ? "Unit " + unitNum + " of " + course.units + " · " + (course.titles[unitNum - 1] || "")
      : "Course home";
    who.appendChild(title);
    who.appendChild(sub);

    var prog = document.createElement("div");
    prog.className = "ix-prog";
    var count = document.createElement("span");
    count.className = "ix-count";
    count.setAttribute("data-ix-count", "");
    count.textContent = countDone(state) + " / " + course.units + " done";
    prog.appendChild(count);
    prog.appendChild(makeDots(unitNum));

    if (unitNum) {
      var jump = document.createElement("button");
      jump.type = "button";
      jump.className = "ix-jump primary";
      jump.textContent = "Practice";
      jump.setAttribute("data-ix-practice", "");
      prog.appendChild(jump);
    }

    bar.appendChild(home);
    bar.appendChild(who);
    bar.appendChild(prog);

    var sample = document.querySelector(".sample");
    if (sample) sample.after(bar);
    else document.body.prepend(bar);

    liveRegion = document.createElement("p");
    liveRegion.className = "sr-only";
    liveRegion.setAttribute("role", "status");
    liveRegion.setAttribute("aria-live", "polite");
    bar.appendChild(liveRegion);
  }

  function firstPractice() {
    return document.querySelector(".ix-practice .practice, .practice");
  }

  function goPractice() {
    var target = document.getElementById("practice") || firstPractice();
    if (!target) return;
    target.classList.remove("ix-pulse");
    void target.offsetWidth;
    target.classList.add("ix-pulse");
    if (typeof target.focus === "function") {
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      try { target.focus({ preventScroll: true }); } catch (e) { target.focus(); }
    }
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    var inner = target.querySelector("button, textarea, input, [tabindex='0']");
    if (inner) {
      window.setTimeout(function () {
        try { inner.focus(); } catch (e) {}
      }, 350);
    }
  }

  function setPracticeFirst(on) {
    state.practiceFirst = !!on;
    save(state);
    document.body.classList.toggle("ix-practice-first", state.practiceFirst);
    document.querySelectorAll("[data-ix-toggle]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", state.practiceFirst ? "true" : "false");
      btn.textContent = state.practiceFirst ? "Read the lesson first" : "Practice first";
    });
  }

  function wrapUnit() {
    var article = document.querySelector("article.wrap");
    if (!article) return;
    var kids = Array.prototype.slice.call(article.children);
    var headerEls = [];
    var lessonEls = [];
    var practiceEls = [];
    var phase = "header";
    kids.forEach(function (el) {
      var isPractice = el.classList.contains("practice") || el.classList.contains("homework");
      var isEnd = el.classList.contains("pager") || el.tagName === "FOOTER" || el.tagName === "NAV";
      if (phase === "header") {
        if (el.tagName === "H2" || isPractice) {
          phase = isPractice ? "practice" : "lesson";
        } else {
          headerEls.push(el);
          return;
        }
      }
      if (phase === "lesson") {
        if (isPractice || isEnd) {
          phase = isPractice ? "practice" : "end";
        } else {
          lessonEls.push(el);
          return;
        }
      }
      if (phase === "practice") {
        if (isEnd) {
          phase = "end";
        } else {
          practiceEls.push(el);
          return;
        }
      }
    });

    if (!practiceEls.length && !article.querySelector(".practice")) return;

    var jump = document.createElement("div");
    jump.className = "ix-jumpbox";
    jump.innerHTML =
      '<p class="ix-hint">Practice is in this page. Jump to it, or put it first. The lesson stays.</p>' +
      '<button type="button" class="primary" data-ix-practice>Try the practice</button>' +
      '<button type="button" data-ix-toggle aria-pressed="false">Practice first</button>';

    var flow = document.createElement("div");
    flow.className = "ix-flow";

    var lesson = document.createElement("section");
    lesson.className = "ix-lesson";
    lesson.id = "lesson";
    lesson.setAttribute("aria-label", "Lesson");

    var prac = document.createElement("div");
    prac.className = "ix-practice";
    prac.id = "practice";

    lessonEls.forEach(function (el) { lesson.appendChild(el); });
    practiceEls.forEach(function (el) { prac.appendChild(el); });

    var lastHeader = headerEls[headerEls.length - 1];
    if (lastHeader) lastHeader.after(jump);
    else article.insertBefore(jump, article.firstChild);
    jump.after(flow);
    flow.appendChild(lesson);
    flow.appendChild(prac);

    setPracticeFirst(state.practiceFirst);
  }

  function bindJumps() {
    document.addEventListener("click", function (e) {
      var t = e.target.closest("[data-ix-practice]");
      if (t) {
        e.preventDefault();
        goPractice();
        return;
      }
      var tog = e.target.closest("[data-ix-toggle]");
      if (tog) {
        e.preventDefault();
        setPracticeFirst(!state.practiceFirst);
        if (state.practiceFirst) goPractice();
      }
    });
  }

  function persistTextareas() {
    var nodes = document.querySelectorAll("textarea[id]");
    Array.prototype.forEach.call(nodes, function (ta) {
      var id = ta.id;
      if (!id) return;
      try {
        var saved = localStorage.getItem(taKey(id));
        if (saved !== null && !ta.value) ta.value = saved;
      } catch (e) {}
      var persist = function () {
        try { localStorage.setItem(taKey(id), ta.value); } catch (err) {}
      };
      ta.addEventListener("input", persist);
      persist();
      var lab = document.querySelector('label[for="' + id + '"]');
      if (lab && /not stored/i.test(lab.textContent)) {
        lab.textContent = "Draft here — saved in this browser only. Nothing is uploaded.";
      }
      if (id.indexOf("hw") === 0) {
        ensureWordCount(ta);
        var note = document.createElement("p");
        note.className = "ix-saved";
        note.textContent = "Saved in this browser. Come back in the same tab and it will still be here.";
        if (ta.nextElementSibling && ta.nextElementSibling.classList.contains("wc")) {
          ta.nextElementSibling.after(note);
        } else {
          ta.after(note);
        }
      }
    });
  }

  function ensureWordCount(ta) {
    var existing = document.getElementById(ta.id + "wc");
    if (!existing) {
      existing = document.createElement("p");
      existing.className = "wc";
      existing.id = ta.id + "wc";
      ta.after(existing);
    }
    var upd = function () {
      var n = ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0;
      existing.textContent = n + " word" + (n === 1 ? "" : "s");
    };
    ta.addEventListener("input", upd);
    upd();
  }

  function watchPracticeDone() {
    if (!unitNum) return;
    var seen = false;
    function consider(el) {
      if (seen) return;
      if (!el || !el.classList) return;
      if (!el.classList.contains("feedback")) return;
      if (!el.classList.contains("ok") || !el.classList.contains("show")) return;
      if (el.id === "rw-strong" || el.hasAttribute("data-ix-example")) return;
      if (!el.closest(".practice")) return;
      seen = true;
      markDone(unitNum);
    }
    document.querySelectorAll(".practice .feedback").forEach(consider);
    var mo = new MutationObserver(function (recs) {
      recs.forEach(function (r) {
        if (r.type === "attributes" && r.target) consider(r.target);
        if (r.addedNodes) {
          r.addedNodes.forEach(function (n) {
            if (n.nodeType === 1) {
              consider(n);
              n.querySelectorAll && n.querySelectorAll(".feedback").forEach(consider);
            }
          });
        }
      });
    });
    mo.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
      childList: true
    });
  }

  function enhanceCwThesis() {
    if (courseId !== "cw101") return;
    var ta = document.getElementById("rewrite");
    if (!ta) return;
    var box = document.createElement("div");
    box.className = "ix-live";
    box.id = "ix-thesis-live";
    box.setAttribute("role", "status");
    ta.after(box);
    function flags(text) {
      var hits = [];
      var low = text.toLowerCase();
      if (!text.trim()) return hits;
      if (/\bi think\b|\bi believe\b|\bi feel\b/.test(low)) hits.push("“I think / I believe / I feel” is a mood, not a claim.");
      if (/\bimportant\b|\binteresting\b/.test(low)) hits.push("“Important” / “interesting” is a shrug.");
      if (/today'?s world|in this day and age|throughout history/.test(low)) hits.push("“Today’s world” is filler.");
      if (text.indexOf("?") !== -1) hits.push("A question is a prompt, not a thesis.");
      if (/both sides|pros and cons/.test(low)) hits.push("A both-sides promise refuses to stand somewhere.");
      if (text.trim().split(/\s+/).length < 8) hits.push("Too short to be a position a classmate could disagree with.");
      return hits;
    }
    function paint() {
      var t = ta.value;
      var hits = flags(t);
      if (!t.trim()) {
        box.className = "ix-live";
        box.textContent = "";
        return;
      }
      if (hits.length) {
        box.className = "ix-live show bad";
        box.innerHTML = "<strong>Dead-thesis flags</strong><ul>" +
          hits.map(function (h) { return "<li>" + h + "</li>"; }).join("") +
          "</ul>";
      } else {
        box.className = "ix-live show ok";
        box.textContent = "No empty “I think / important / both sides” phrases in the wording. Last test: could a classmate start “No, because…” and still be talking about your claim?";
      }
    }
    ta.addEventListener("input", paint);
    paint();
  }

  function enhanceBecauseAssembler() {
    var rootEl = document.getElementById("because-assembler");
    if (!rootEl) return;
    var open = null;
    var closer = null;
    var preview = document.getElementById("ba-preview");
    var fb = document.getElementById("ba-fb");
    var claim = "The dining hall should stay open until 9";

    function selected(part) {
      return rootEl.querySelector('.ix-pick[data-part="' + part + '"].picked');
    }

    function renderPreview() {
      var o = selected("open");
      var c = selected("close");
      var bits = [claim];
      if (o) bits.push(o.textContent.trim());
      if (c) bits.push(c.textContent.trim());
      preview.textContent = bits.join(" ");
    }

    rootEl.addEventListener("click", function (e) {
      var btn = e.target.closest(".ix-pick");
      if (!btn) return;
      var part = btn.getAttribute("data-part");
      rootEl.querySelectorAll('.ix-pick[data-part="' + part + '"]').forEach(function (b) {
        b.classList.remove("picked");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("picked");
      btn.setAttribute("aria-pressed", "true");
      if (part === "open") open = btn;
      if (part === "close") closer = btn;
      renderPreview();
    });

    rootEl.querySelectorAll(".ix-pick").forEach(function (b) {
      b.setAttribute("aria-pressed", "false");
    });

    var check = document.getElementById("ba-check");
    if (check) {
      check.addEventListener("click", function () {
        var o = selected("open");
        var c = selected("close");
        if (!o || !c) {
          fb.className = "feedback show bad";
          fb.textContent = "Pick an opening and a closer. Then check.";
          return;
        }
        var oOk = o.getAttribute("data-ok") === "1";
        var cOk = c.getAttribute("data-ok") === "1";
        var msg;
        var cls = "bad";
        if (oOk && cOk) {
          cls = "ok";
          msg = "That because does work. Times and a count. A skeptic can dispute the line. They cannot say you hid the step.";
        } else if (o.getAttribute("data-id") === "o2") {
          msg = "“Deserve” restates the should-claim. Warm, and not yet a reason. What time does class end? What is open now?";
        } else if (o.getAttribute("data-id") === "o3") {
          msg = "“Everyone knows” is a crowd, not a because. No one can check a crowd.";
        } else if (c.getAttribute("data-id") === "c2") {
          msg = "Feelings name a stake. They do not check. Pair the 8:10 opening with a count someone could look at.";
        } else if (c.getAttribute("data-id") === "c3") {
          msg = "“Obviously matters” asks the skeptic to join the choir. Swap the closer for a line or a time.";
        } else {
          msg = "One half is something a classmate could check. The other half still circles. You need a time or a count in both halves, or the sentence slides back into mood.";
        }
        fb.className = "feedback show " + cls;
        fb.textContent = msg;
      });
    }
    renderPreview();
  }

  function buildHome() {
    var article = document.querySelector("article.wrap");
    if (!article) return;
    var box = document.createElement("div");
    box.className = "ix-homebox";
    box.id = "ix-home";
    var n = countDone(state);
    var next = nextOpen(state);
    var startLabel = n === 0 ? "Start Unit 1" : (n >= course.units ? "Review Unit 1" : "Continue Unit " + next);
    var startHref = n === 0 || n >= course.units ? "unit-1.html" : unitHref(next);
    box.innerHTML =
      '<p class="ix-home-count" data-ix-home-count><strong>' + n + " of " + course.units + "</strong> units done</p>" +
      '<p class="ix-privacy">Practice runs in this browser. Nothing is uploaded. Progress stays in this tab’s storage.</p>';
    box.appendChild(makeDots(0));
    var actions = document.createElement("p");
    actions.style.margin = "0.75rem 0 0";
    var start = document.createElement("a");
    start.className = "btn primary";
    start.setAttribute("data-ix-start", "");
    start.href = startHref;
    start.textContent = startLabel;
    actions.appendChild(start);
    box.appendChild(actions);

    var meta = article.querySelector(".meta");
    var blurb = article.querySelector(".blurb");
    var lede = article.querySelector(".lede");
    var after = blurb || meta || lede;
    if (after) after.after(box);
    else article.insertBefore(box, article.querySelector("h2"));

    article.querySelectorAll('a.primary[href="unit-1.html"], a.btn.primary[href^="unit-"]').forEach(function (a) {
      if (a.hasAttribute("data-ix-start")) return;
      a.setAttribute("data-ix-start", "");
    });
  }

  function hashPractice() {
    if (location.hash === "#practice" || location.hash === "#p-annote" || /practice/i.test(location.hash)) {
      window.setTimeout(goPractice, 50);
    }
  }

  buildBar();
  if (page === "home") {
    buildHome();
  } else if (unitNum) {
    wrapUnit();
    persistTextareas();
    enhanceCwThesis();
    enhanceBecauseAssembler();
    watchPracticeDone();
    hashPractice();
  }
  bindJumps();
  paintProgress();

  window.Interact = {
    markDone: function (n) { markDone(n || unitNum); },
    state: function () { return { done: Object.assign({}, state.done), count: countDone(state) }; }
  };
})();
