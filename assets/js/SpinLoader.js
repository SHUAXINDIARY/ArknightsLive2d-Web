class SpinLoader extends HTMLElement {
  static get observedAttributes() {
    return ["size", "color"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: inline-block;
          }
          .spinner {
            border: 4px solid rgba(0, 0, 0, 0.1);
            border-top-color: var(--color, #333);
            border-radius: 50%;
            width: var(--size, 24px);
            height: var(--size, 24px);
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        </style>
        <div class="spinner"></div>
      `;
  }

  connectedCallback() {
    this._updateStyle();
  }

  attributeChangedCallback() {
    this._updateStyle();
  }

  _updateStyle() {
    const size = this.getAttribute("size") || 24;
    const color = this.getAttribute("color") || "#333";

    this.shadowRoot
      .querySelector(".spinner")
      .style.setProperty("--size", `${size}px`);
    this.shadowRoot
      .querySelector(".spinner")
      .style.setProperty("--color", color);
  }
}

customElements.define("spin-loader", SpinLoader);
