(() => {
  const cabinets = Array.from(document.querySelectorAll(".cabinet"));
  let active = 0;

  function setActive(index) {
    if (!cabinets.length) return;
    active = (index + cabinets.length) % cabinets.length;
    cabinets.forEach((el, i) => {
      el.classList.toggle("is-active", i === active);
    });
  }

  cabinets.forEach((el, i) => {
    el.addEventListener("mouseenter", () => setActive(i));
    el.addEventListener("focus", () => setActive(i));
  });

  document.addEventListener("keydown", (e) => {
    if (!cabinets.length) return;

    if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
      e.preventDefault();
      setActive(active + 1);
      cabinets[active].focus({ preventScroll: false });
    } else if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
      e.preventDefault();
      setActive(active - 1);
      cabinets[active].focus({ preventScroll: false });
    } else if (e.key === "Enter") {
      e.preventDefault();
      cabinets[active].click();
    }
  });

  cabinets.forEach((el) => {
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "0");
  });

  setActive(0);

  // Starfield
  const canvas = document.getElementById("starfield");
  if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const ctx = canvas.getContext("2d");
  let stars = [];
  let w = 0;
  let h = 0;
  let raf = 0;

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    const count = Math.min(120, Math.floor((w * h) / 14000));
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      z: Math.random() * 0.8 + 0.2,
      s: Math.random() * 1.4 + 0.4,
    }));
  }

  function tick() {
    ctx.clearRect(0, 0, w, h);
    for (const star of stars) {
      star.y += star.z * 0.35;
      if (star.y > h) {
        star.y = 0;
        star.x = Math.random() * w;
      }
      const alpha = 0.25 + star.z * 0.55;
      ctx.fillStyle = `rgba(244, 247, 255, ${alpha})`;
      ctx.fillRect(star.x, star.y, star.s, star.s);
    }
    raf = requestAnimationFrame(tick);
  }

  window.addEventListener("resize", resize);
  resize();
  tick();

  window.addEventListener("beforeunload", () => cancelAnimationFrame(raf));
})();
