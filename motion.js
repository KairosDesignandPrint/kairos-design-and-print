/* ==========================================================================
   KAIROS DESIGN AND PRINT — MOTION ENGINE  (motion.js)
   --------------------------------------------------------------------------
   Adds the animation to every page. Loaded with `defer` at the end of the
   <head>, so it never blocks the page from painting.

   ==========================================================================
   FAIL-SAFE CONTRACT  (please keep these if you edit this file)
   ==========================================================================
   * Nothing here is required for the page to work. If this file is missing,
     blocked, or errors out, every page still renders complete and readable.
   * No content is ever left at opacity:0. The only things that fade are the
     hero headline words and the lightbox image — and each of those has a
     hard timer that forces the finished, fully-visible state.
   * Every injected element is decorative: aria-hidden="true" and
     pointer-events:none, so screen readers and keyboard users are unaffected.
   * prefers-reduced-motion is checked first. If the visitor asks for less
     motion, this script does almost nothing at all.
   * All motion is transform/opacity only, driven by requestAnimationFrame,
     so scrolling stays smooth and never re-flows the page.
   ========================================================================== */
(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;

  /* ---------- 0. Respect the visitor's motion preference ---------- */
  var mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var CALM = !!(mq && mq.matches);

  /* Mark the document so the CSS knows the engine is alive. */
  root.className += " k-motion";

  /* Small helpers ------------------------------------------------------- */
  function el(tag, cls, attrs) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) { for (var k in attrs) { if (attrs.hasOwnProperty(k)) n.setAttribute(k, attrs[k]); } }
    return n;
  }
  function deco(n) { n.setAttribute("aria-hidden", "true"); return n; }
  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  /* ======================================================================
     1. HERO HEADLINE — WORD-BY-WORD ENTRANCE
     The words are wrapped in <span class="w">. Without JavaScript there are
     no spans, so the headline is simply ordinary visible text.
     ====================================================================== */
  function splitWords(node) {
    Array.prototype.slice.call(node.childNodes).forEach(function (child) {
      if (child.nodeType === 3) {
        var parts = child.nodeValue.split(/(\s+)/);
        var frag = doc.createDocumentFragment();
        parts.forEach(function (p) {
          if (p === "") return;
          if (/^\s+$/.test(p)) { frag.appendChild(doc.createTextNode(p)); return; }
          var s = el("span", "w");
          s.textContent = p;
          frag.appendChild(s);
        });
        node.replaceChild(frag, child);
      } else if (child.nodeType === 1) {
        splitWords(child);
      }
    });
  }

  function heroHeadline() {
    var h1 = $(".hero-copy h1") || $(".sp-hero h1");
    if (!h1 || CALM) return;

    splitWords(h1);
    var words = $$(".w", h1);
    if (!words.length) return;

    words.forEach(function (w, i) {
      w.style.animationDelay = (i * 0.055).toFixed(3) + "s";
    });
    h1.classList.add("k-split");

    /* Hard safety net: once the words have landed, drop the animation
       entirely so the headline can never be left mid-fade. */
    var total = (words.length * 55) + 900;
    setTimeout(function () {
      h1.classList.add("k-done");
      words.forEach(function (w) { w.style.animationDelay = ""; });
    }, total);
  }

  /* ======================================================================
     2. HERO DECORATION — FLOATING BLOBS, SHIMMER, SCROLL CUE
     ====================================================================== */
  function heroDecor() {
    var hero = $(".hero");
    if (!hero || CALM) return;

    var blobs = deco(el("div", "k-blobs"));
    blobs.appendChild(el("span", "k-blob k-blob-1"));
    blobs.appendChild(el("span", "k-blob k-blob-2"));
    blobs.appendChild(el("span", "k-blob k-blob-3"));
    hero.insertBefore(blobs, hero.firstChild);

    hero.insertBefore(deco(el("div", "k-shimmer")), hero.children[1] || null);

    var cue = deco(el("div", "k-cue"));
    cue.appendChild(el("span", "k-cue-rail")).appendChild(el("span", "k-cue-dot"));
    cue.appendChild(el("span", null)).textContent = "Scroll";
    hero.appendChild(cue);
  }

  /* ======================================================================
     3. SCROLL PROGRESS BAR
     ====================================================================== */
  function progressBar() {
    if (CALM) return;
    var bar = deco(el("div", "k-prog"));
    doc.body.appendChild(bar);
    return bar;
  }

  /* ======================================================================
     4. AMBIENT SHAPES INSIDE SECTIONS
     ====================================================================== */
  function ambient() {
    if (CALM) return;
    $$(".sec").forEach(function (sec) {
      if ($(".k-amb", sec)) return;
      var a = deco(el("div", "k-amb"));
      a.appendChild(el("i"));
      a.appendChild(el("i"));
      a.appendChild(el("i"));
      sec.insertBefore(a, sec.firstChild);
    });
  }

  /* ======================================================================
     5. MARQUEE — the accent band becomes a seamless ticker
     ====================================================================== */
  function marquee() {
    if (CALM) return;
    var band = $(".accent-band");
    if (!band) return;
    var inner = $(".accent-band-in", band);
    if (!inner) return;

    var track = el("div", "k-marquee-track");
    band.insertBefore(track, inner);
    track.appendChild(inner);
    /* A second copy makes the -50% loop seamless. */
    var clone = inner.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    track.appendChild(clone);
    band.classList.add("k-marquee");

    /* Soft fades at both ends. Real elements, not pseudo-elements - the band
       already uses its own ::before and ::after. */
    band.appendChild(deco(el("span", "k-fade k-fade-l")));
    band.appendChild(deco(el("span", "k-fade k-fade-r")));
  }

  /* ======================================================================
     6. PARALLAX — hero blobs + section ambient shapes
     Driven by one rAF loop, transform only.
     ====================================================================== */
  function parallax(bar) {
    if (CALM) return;
    var layers = $$(".k-blobs, .k-amb");
    if (!layers.length && !bar) return;

    var ticking = false;
    var vh = window.innerHeight;

    function frame() {
      ticking = false;
      var y = window.pageYOffset || root.scrollTop;

      if (bar) {
        var max = (root.scrollHeight - vh) || 1;
        var p = Math.min(1, Math.max(0, y / max));
        bar.style.transform = "scaleX(" + p.toFixed(4) + ")";
      }

      layers.forEach(function (layer) {
        var r = layer.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;   /* offscreen: skip */
        var mid = r.top + r.height / 2 - vh / 2;
        var shift = Math.max(-46, Math.min(46, -mid * 0.055));
        layer.style.transform = "translate3d(0," + shift.toFixed(2) + "px,0)";
      });
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(frame);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", function () { vh = window.innerHeight; onScroll(); }, { passive: true });
    frame();
  }

  /* ======================================================================
     7. MAGNETIC BUTTONS — a small pull toward the cursor
     ====================================================================== */
  function magnetic() {
    if (CALM) return;
    if (!window.matchMedia || !window.matchMedia("(hover:hover) and (pointer:fine)").matches) return;

    $$(".btn").forEach(function (b) {
      b.addEventListener("mousemove", function (e) {
        var r = b.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        var dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        b.style.transform = "translate3d(" + (dx * 5).toFixed(2) + "px," +
                            (dy * 4 - 2).toFixed(2) + "px,0)";
      });
      b.addEventListener("mouseleave", function () { b.style.transform = ""; });
    });
  }

  /* ======================================================================
     8. PROCESS STEPS — light each step up as it scrolls into view
     ====================================================================== */
  function stepProgress() {
    var list = $(".proc-list");
    if (!list) return;
    var steps = $$(".step", list);
    if (!steps.length) return;

    /* Draw the connector line in once the section is on screen. */
    function drawIn() { list.classList.add("k-in"); }
    if (CALM || !("IntersectionObserver" in window)) {
      drawIn();
    } else {
      var lio = new IntersectionObserver(function (en, obs) {
        en.forEach(function (e) { if (e.isIntersecting) { drawIn(); obs.disconnect(); } });
      }, { threshold: 0.15 });
      lio.observe(list);
      setTimeout(drawIn, 2500);   /* fail-safe */
    }

    if (CALM || !("IntersectionObserver" in window)) {
      steps.forEach(function (s) { s.classList.add("k-on"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) en.target.classList.add("k-on");
      });
    }, { threshold: 0.4, rootMargin: "0px 0px -12% 0px" });
    steps.forEach(function (s) { io.observe(s); });

    /* Safety net: never leave a step un-lit. */
    setTimeout(function () { steps.forEach(function (s) { s.classList.add("k-on"); }); }, 3000);
  }

  /* ======================================================================
     9. COUNTERS — a small pop when the number lands
     ====================================================================== */
  function counterPop() {
    if (CALM) return;
    var strip = $(".strip");
    if (!strip || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        obs.disconnect();
        setTimeout(function () {
          $$(".cnt", strip).forEach(function (n) {
            n.style.transition = "transform .45s cubic-bezier(.22,1,.36,1)";
            n.style.transform = "scale(1.14)";
            setTimeout(function () { n.style.transform = ""; }, 260);
          });
        }, 1000);
      });
    }, { threshold: 0.3 });
    io.observe(strip);
  }

  /* ======================================================================
     10. SMOOTH ANCHOR SCROLLING (with the sticky header offset)
     ====================================================================== */
  function smoothAnchors() {
    if (CALM) return;
    doc.addEventListener("click", function (e) {
      var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a) return;
      var id = a.getAttribute("href");
      if (!id || id === "#") return;
      var target = doc.getElementById(id.slice(1));
      if (!target) return;
      e.preventDefault();
      var hdr = $(".hdr");
      var off = hdr ? hdr.offsetHeight + 12 : 0;
      var top = target.getBoundingClientRect().top + window.pageYOffset - off;
      window.scrollTo({ top: top, behavior: "smooth" });
      if (history.replaceState) history.replaceState(null, "", id);
    });
  }

  /* ======================================================================
     11. FINAL SAFETY SWEEP
     Whatever happens above, after a few seconds every animated element is
     forced into its finished, fully-visible state.
     ====================================================================== */
  function safetySweep() {
    setTimeout(function () {
      $$(".hero-copy h1, .sp-hero h1").forEach(function (h) {
        h.classList.add("k-done");
        $$(".w", h).forEach(function (w) { w.style.animationDelay = ""; });
      });
      $$(".step").forEach(function (s) { s.classList.add("k-on"); });
      $$(".btn").forEach(function (b) { b.style.transform = ""; });
    }, 4000);
  }

  /* ======================================================================
     BOOT
     ====================================================================== */
  function boot() {
    try {
      var bar = progressBar();
      heroHeadline();
      heroDecor();
      ambient();
      marquee();
      parallax(bar);
      magnetic();
      stepProgress();
      counterPop();
      smoothAnchors();
      safetySweep();
    } catch (err) {
      /* Never let a motion error break the page. */
      if (window.console && console.warn) console.warn("Kairos motion layer skipped:", err);
    }
  }

  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
