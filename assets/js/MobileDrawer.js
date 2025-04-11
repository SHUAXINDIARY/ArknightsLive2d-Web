class MobileDrawer extends HTMLElement {
  static get observedAttributes() {
    return ["open", "side"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
        <style>
          :host {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: 9999;
            visibility: hidden;
            pointer-events: none;
            transition: visibility 0s linear 0.3s, opacity 0.3s ease;
            opacity: 0;
          }

          :host(.visible) {
            visibility: visible;
            pointer-events: auto;
            opacity: 1;
            transition-delay: 0s;
          }

          .overlay {
            position: absolute;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.4);
            opacity: 0;
            transition: opacity 0.3s ease;
          }

          .overlay.active {
            opacity: 1;
          }

          .drawer {
            position: absolute;
            top: 0;
            bottom: 0;
            width: 80%;
            max-width: 300px;
            background: white;
            box-shadow: 2px 0 8px rgba(0, 0, 0, 0.2);
            transform: translateX(-100%);
            transition: transform 0.3s ease;
          }

          :host([side="right"]) .drawer {
            right: 0;
            left: auto;
            transform: translateX(100%);
          }

          :host(.visible[side="left"]) .drawer {
            transform: translateX(0);
            left: 0;
          }

          :host(.visible[side="right"]) .drawer {
            transform: translateX(0);
          }
        </style>

        <div class="overlay"></div>
        <div class="drawer"><slot></slot></div>
      `;

    this.overlay = this.shadowRoot.querySelector(".overlay");
    this.drawer = this.shadowRoot.querySelector(".drawer");

    this.overlay.addEventListener("click", () => this.close());

    // 拖动关闭
    this.drawer.addEventListener("touchstart", (e) => {
      this._startX = e.changedTouches[0].screenX;
    });

    this.drawer.addEventListener("touchend", (e) => {
      const diff = e.changedTouches[0].screenX - this._startX;
      const side = this.getAttribute("side") || "left";
      if ((side === "left" && diff < -50) || (side === "right" && diff > 50)) {
        this.close();
      }
    });
  }

  open() {
    this.setAttribute("open", "");

    // 🟢 修复点：强制恢复 display/visibility
    this.style.visibility = "visible";
    this.style.pointerEvents = "auto";
    this.style.opacity = 1;
  }

  close() {
    this.removeAttribute("open");
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === "open") {
      if (newVal !== null) {
        this.classList.add("visible");
        this.shadowRoot.querySelector(".overlay").classList.add("active");
      } else {
        this.classList.remove("visible");
        this.shadowRoot.querySelector(".overlay").classList.remove("active");

        // ⏱️ 延迟隐藏（允许动画完成）
        setTimeout(() => {
          if (!this.hasAttribute("open")) {
            this.style.visibility = "hidden";
            this.style.pointerEvents = "none";
            this.style.opacity = 0;
          }
        }, 300);
      }
    }
  }
}

customElements.define("mobile-drawer", MobileDrawer);
