class SearchSelect extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._options = [];
    this._filtered = [];
    this._value = null;
    this._highlight = -1;

    this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: inline-block;
            position: relative;
            font-family: sans-serif;
            width: 200px;
          }
          input {
            width: 100%;
            padding: 10px;
            box-sizing: border-box;
            border: 1px solid transparent;
            background-color: #d3d3d361;
            border-radius: 5px;
            outline: none;
            color: black;
          }
          .dropdown {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            border: 1px solid #ccc;
            border-top: none;
            max-height: 150px;
            overflow-y: auto;
            background: white;
            z-index: 1000;
            display: none;
          }
          .dropdown.active {
            display: block;
          }
          .option {
            padding: 8px;
            cursor: pointer;
          }
          .option:hover,
          .highlighted {
            background-color: #f0f0f0;
          }
        </style>
        <input type="text" placeholder="${
          this.getAttribute("placeholder") || "选择干员"
        }">
        <div class="dropdown"></div>
      `;

    this.input = this.shadowRoot.querySelector("input");
    this.dropdown = this.shadowRoot.querySelector(".dropdown");

    this.input.addEventListener("input", () => this._onInput());
    this.input.addEventListener("focus", () => this._showDropdown());
    this.input.addEventListener("blur", () =>
      setTimeout(() => this._hideDropdown(), 100)
    );
    this.input.addEventListener("keydown", (e) => this._handleKey(e));
  }

  set options(list) {
    this._options = list || [];
    this._filtered = [...this._options];
    this._highlight = -1;
    this._render();
  }

  get value() {
    return this._value;
  }

  set value(val) {
    this._value = val;
    const match = this._options.find((opt) => opt.value === val);
    this.input.value = match ? match.label : "";
  }

  _onInput() {
    const keyword = this.input.value.toLowerCase();
    this._filtered = this._options.filter((opt) =>
      opt.label.toLowerCase().includes(keyword)
    );
    this._highlight = -1;
    this._render();
    this._showDropdown();
  }

  _render() {
    this.dropdown.innerHTML = "";
    this._filtered.forEach((opt, i) => {
      const div = document.createElement("div");
      div.textContent = opt.label;
      div.className = "option";
      if (i === this._highlight) div.classList.add("highlighted");
      div.addEventListener("mousedown", () => {
        this._selectOption(opt);
      });
      this.dropdown.appendChild(div);
    });
  }

  _selectOption(opt) {
    this.value = opt.value;
    this._hideDropdown();
    this.dispatchEvent(new Event("change"));
  }

  _showDropdown() {
    this.dropdown.classList.add("active");
  }

  _hideDropdown() {
    this.dropdown.classList.remove("active");
  }

  _handleKey(e) {
    if (e.key === "ArrowDown") {
      this._highlight = (this._highlight + 1) % this._filtered.length;
      this._render();
    } else if (e.key === "ArrowUp") {
      this._highlight =
        (this._highlight - 1 + this._filtered.length) % this._filtered.length;
      this._render();
    } else if (e.key === "Enter" && this._highlight >= 0) {
      this._selectOption(this._filtered[this._highlight]);
    }
  }
}

customElements.define("search-select", SearchSelect);
