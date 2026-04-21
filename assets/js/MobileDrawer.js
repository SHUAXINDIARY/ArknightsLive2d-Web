class MobileDrawer extends HTMLElement {
  static get observedAttributes() {
    return ["open", "side"];
  }

  constructor() {
    super();
    this._closeTimer = null;
    this._startX = 0;
    this._startY = 0;
    this._dragOffset = 0;
    this._isHorizontalDrag = false;
    this._restoreOverflow = "";
    this._isBodyLocked = false;
    this._previousActiveElement = null;
    this._panelAnimations = [];
    this._drawerCloseAnimation = null;
    this._overlayCloseAnimation = null;
    this._prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );
    this._boundEscHandler = (event) => {
      if (event.key === "Escape" && this.hasAttribute("open")) {
        this.close();
      }
    };

    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
        <style>
          :host {
            position: fixed;
            inset: 0;
            width: 100%;
            height: 100%;
            z-index: var(--drawer-z-index, 420);
            visibility: hidden;
            pointer-events: none;
            --drawer-ease-out: var(--drawer-ease-out, cubic-bezier(0.16, 1, 0.3, 1));
            --drawer-ease-in: var(--drawer-ease-in, cubic-bezier(0.7, 0, 0.84, 0));
            --drawer-overlay-bg: var(--drawer-overlay-bg, color-mix(in oklch, var(--surface-base, #0f1115) 68%, transparent));
            --drawer-bg: var(--drawer-bg, color-mix(in oklch, var(--surface-panel, #181c22) 94%, transparent));
            --drawer-border: var(--drawer-border, var(--surface-border, rgba(127, 127, 127, 0.3)));
            --drawer-shadow: var(--drawer-shadow, 0 18px 40px color-mix(in oklch, var(--surface-base, black) 20%, transparent));
            --drawer-text: var(--drawer-text, var(--text-primary, #e5e9f0));
            --drawer-open-duration: var(--drawer-open-duration, 340ms);
            --drawer-close-duration: var(--drawer-close-duration, 340ms);
          }

          :host(.visible) {
            visibility: visible;
            pointer-events: auto;
          }

          :host(.closing) {
            visibility: visible;
            pointer-events: none;
          }

          .overlay {
            position: absolute;
            inset: 0;
            background: var(--drawer-overlay-bg);
            opacity: 0;
            backdrop-filter: blur(2px);
            transition: opacity 0.26s var(--drawer-ease-out);
          }

          .overlay.active {
            opacity: 1;
          }

          .drawer {
            position: absolute;
            top: 0;
            bottom: 0;
            width: min(84vw, var(--drawer-max-width, 340px));
            background: var(--drawer-bg);
            color: var(--drawer-text);
            border-right: 1px solid var(--drawer-border);
            box-shadow: var(--drawer-shadow);
            padding: max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom));
            overflow: auto;
            -webkit-overflow-scrolling: touch;
            touch-action: pan-y;
            transform: translateX(-100%);
            transition: transform var(--drawer-open-duration) var(--drawer-ease-out);
          }

          .drawer.dragging,
          .overlay.dragging {
            transition: none !important;
          }

          .drawer::before {
            content: "";
            position: sticky;
            top: 0;
            display: block;
            inline-size: 100%;
            block-size: 0;
            border-top: 1px solid color-mix(in oklch, var(--drawer-border) 60%, transparent);
          }

          :host([side="right"]) .drawer {
            right: 0;
            left: auto;
            border-right: none;
            border-left: 1px solid var(--drawer-border);
            transform: translateX(100%);
          }

          :host(.visible[side="left"]) .drawer {
            transform: translateX(0);
            left: 0;
          }

          :host(.visible[side="right"]) .drawer {
            transform: translateX(0);
          }

          :host(.closing) .drawer {
            transition-duration: var(--drawer-close-duration);
            transition-timing-function: var(--drawer-ease-in);
          }

          :host(.closing) .overlay {
            transition-duration: 200ms;
            transition-timing-function: var(--drawer-ease-in);
          }

          .grabber {
            position: sticky;
            top: 0;
            z-index: 1;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 20px;
            margin-bottom: 8px;
            pointer-events: none;
          }

          .grabber::before {
            content: "";
            width: 44px;
            height: 4px;
            border-radius: 999px;
            background: color-mix(in oklch, var(--drawer-border) 75%, transparent);
          }

          ::slotted(*) {
            color: inherit;
          }

          @media (prefers-reduced-motion: reduce) {
            :host,
            .overlay,
            .drawer {
              transition-duration: 0.01ms !important;
            }
          }
        </style>

        <div class="overlay"></div>
        <div class="drawer" tabindex="-1" role="dialog" aria-modal="true">
          <div class="grabber" aria-hidden="true"></div>
          <slot></slot>
        </div>
      `;

    this.overlay = this.shadowRoot.querySelector(".overlay");
    this.drawer = this.shadowRoot.querySelector(".drawer");

    this.overlay.addEventListener("click", () => this.close());

    // 拖动关闭
    this.drawer.addEventListener("touchstart", (e) => this._onTouchStart(e), {
      passive: true,
    });
    this.drawer.addEventListener("touchmove", (e) => this._onTouchMove(e), {
      passive: false,
    });
    this.drawer.addEventListener("touchend", (e) => this._onTouchEnd(e), {
      passive: true,
    });
    this.drawer.addEventListener(
      "touchcancel",
      () => this._snapDrawerBack(),
      { passive: true }
    );
  }

  connectedCallback() {
    if (!this.hasAttribute("side")) {
      this.setAttribute("side", "left");
    }
    document.addEventListener("keydown", this._boundEscHandler);
    this.setAttribute("aria-hidden", this.hasAttribute("open") ? "false" : "true");
  }

  disconnectedCallback() {
    document.removeEventListener("keydown", this._boundEscHandler);
    if (this._closeTimer) {
      clearTimeout(this._closeTimer);
      this._closeTimer = null;
    }
    this._cancelPanelAnimations();
    this._cancelCloseAnimations();
    this._unlockBodyScroll();
  }

  open() {
    this.setAttribute("open", "");
  }

  close() {
    this.removeAttribute("open");
  }

  _lockBodyScroll() {
    if (this._isBodyLocked) return;
    this._restoreOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    this._isBodyLocked = true;
  }

  _unlockBodyScroll() {
    if (!this._isBodyLocked) return;
    document.body.style.overflow = this._restoreOverflow;
    this._isBodyLocked = false;
  }

  _isReducedMotion() {
    return this._prefersReducedMotion?.matches ?? false;
  }

  _getSide() {
    return this.getAttribute("side") || "left";
  }

  _getDrawerWidth() {
    return this.drawer.getBoundingClientRect().width || 1;
  }

  _onTouchStart(e) {
    if (!this.hasAttribute("open")) return;
    if (e.touches && e.touches.length > 1) return;
    const touch = e.changedTouches[0];
    this._startX = touch.screenX;
    this._startY = touch.screenY;
    this._dragOffset = 0;
    this._isHorizontalDrag = false;
  }

  _onTouchMove(e) {
    if (!this.hasAttribute("open")) return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    const diffX = touch.screenX - this._startX;
    const diffY = touch.screenY - this._startY;
    const absX = Math.abs(diffX);
    const absY = Math.abs(diffY);

    if (!this._isHorizontalDrag) {
      if (absX < 8 && absY < 8) return;
      if (absY > absX) return;
      this._isHorizontalDrag = true;
    }

    const side = this._getSide();
    let offset = side === "left" ? Math.min(0, diffX) : Math.max(0, diffX);
    if ((side === "left" && offset > 0) || (side === "right" && offset < 0)) {
      offset = 0;
    }

    this._dragOffset = offset;
    const width = this._getDrawerWidth();
    const progress = Math.min(1, Math.abs(offset) / width);
    this.drawer.classList.add("dragging");
    this.overlay.classList.add("dragging");
    this.drawer.style.transform = `translateX(${offset}px)`;
    this.overlay.style.opacity = String(Math.max(0.2, 1 - progress));
    e.preventDefault();
  }

  _onTouchEnd() {
    if (!this.hasAttribute("open") || !this._isHorizontalDrag) return;
    const width = this._getDrawerWidth();
    const shouldClose = Math.abs(this._dragOffset) > width * 0.28;
    if (shouldClose) {
      this._resetDragStyles();
      this.close();
      return;
    }
    this._snapDrawerBack();
  }

  _resetDragStyles() {
    this._isHorizontalDrag = false;
    this._dragOffset = 0;
    this.drawer.classList.remove("dragging");
    this.overlay.classList.remove("dragging");
    this.drawer.style.transform = "";
    this.overlay.style.opacity = "";
  }

  _snapDrawerBack() {
    this._resetDragStyles();
  }

  _restoreFocus() {
    if (
      this._previousActiveElement &&
      document.contains(this._previousActiveElement)
    ) {
      this._previousActiveElement.focus({ preventScroll: true });
    }
    this._previousActiveElement = null;
  }

  _cancelPanelAnimations() {
    if (!this._panelAnimations.length) return;
    this._panelAnimations.forEach((animation) => {
      try {
        animation.cancel();
      } catch (_err) {
        // ignore cancellation errors from finished animations
      }
    });
    this._panelAnimations = [];
  }

  _cancelCloseAnimations() {
    if (this._drawerCloseAnimation) {
      try {
        this._drawerCloseAnimation.cancel();
      } catch (_err) {
        // ignore cancellation errors from finished animations
      }
      this._drawerCloseAnimation = null;
    }
    if (this._overlayCloseAnimation) {
      try {
        this._overlayCloseAnimation.cancel();
      } catch (_err) {
        // ignore cancellation errors from finished animations
      }
      this._overlayCloseAnimation = null;
    }
  }

  _animateCloseMotion() {
    if (this._isReducedMotion()) return;
    this._cancelCloseAnimations();
    const duration = this._getCloseDurationMs();
    const side = this._getSide();
    const toX = side === "left" ? "-100%" : "100%";
    this._drawerCloseAnimation = this.drawer.animate(
      [
        { transform: "translateX(0)" },
        { transform: `translateX(${toX})` },
      ],
      {
        duration,
        easing: "cubic-bezier(0.7, 0, 0.84, 0)",
        fill: "forwards",
      }
    );
    this._overlayCloseAnimation = this.overlay.animate(
      [{ opacity: 1 }, { opacity: 0 }],
      {
        duration: Math.min(220, duration),
        easing: "cubic-bezier(0.7, 0, 0.84, 0)",
        fill: "forwards",
      }
    );
  }

  _animatePanelItems() {
    if (this._isReducedMotion()) return;
    const panel = this.querySelector("#panel");
    if (!panel) return;
    this._cancelPanelAnimations();
    const items = Array.from(panel.children);
    const fromX = this._getSide() === "left" ? -10 : 10;
    items.forEach((item, index) => {
      const animation = item.animate(
        [
          { opacity: 0, transform: `translateX(${fromX}px)` },
          { opacity: 1, transform: "translateX(0)" },
        ],
        {
          duration: 280,
          delay: Math.min(index, 10) * 34,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          fill: "both",
        }
      );
      this._panelAnimations.push(animation);
    });
  }

  _animatePanelItemsOut() {
    if (this._isReducedMotion()) return;
    const panel = this.querySelector("#panel");
    if (!panel) return;
    this._cancelPanelAnimations();
    const items = Array.from(panel.children);
    const toX = this._getSide() === "left" ? -8 : 8;
    items
      .slice()
      .reverse()
      .forEach((item, index) => {
        const animation = item.animate(
          [
            { opacity: 1, transform: "translateX(0)" },
            { opacity: 0, transform: `translateX(${toX}px)` },
          ],
          {
            duration: 170,
            delay: Math.min(index, 10) * 18,
            easing: "cubic-bezier(0.7, 0, 0.84, 0)",
            fill: "both",
          }
        );
        this._panelAnimations.push(animation);
      });
  }

  _getCloseDurationMs() {
    return this._isReducedMotion() ? 20 : 340;
  }

  _clearClosingState() {
    this.classList.remove("closing");
    this.classList.remove("visible");
    this._cancelPanelAnimations();
    this._cancelCloseAnimations();
    const panel = this.querySelector("#panel");
    if (!panel) return;
    Array.from(panel.children).forEach((item) => {
      item.style.opacity = "";
      item.style.transform = "";
    });
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal) return;
    if (name === "open") {
      if (this._closeTimer) {
        clearTimeout(this._closeTimer);
        this._closeTimer = null;
      }

      if (newVal !== null) {
        this.classList.remove("closing");
        this.classList.add("visible");
        this._cancelCloseAnimations();
        this.overlay.classList.add("active");
        this.setAttribute("aria-hidden", "false");
        this._previousActiveElement =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        this._lockBodyScroll();
        this._snapDrawerBack();
        this.drawer.focus({ preventScroll: true });
        this._animatePanelItems();
      } else {
        this.classList.add("closing");
        this.overlay.classList.remove("active");
        this.setAttribute("aria-hidden", "true");
        this._animateCloseMotion();
        this._animatePanelItemsOut();
        this._snapDrawerBack();
        this._closeTimer = setTimeout(() => {
          this._clearClosingState();
          this._unlockBodyScroll();
          this._restoreFocus();
          this._closeTimer = null;
        }, this._getCloseDurationMs());
      }
    }
  }
}

customElements.define("mobile-drawer", MobileDrawer);
