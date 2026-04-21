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
            font-family: var(--select-font, inherit);
            width: var(--select-width, 200px);
            --select-radius: var(--select-radius, 8px);
            --select-height: var(--select-height, 40px);
            --select-ease-out: var(--select-ease-out, cubic-bezier(0.16, 1, 0.3, 1));
            --select-ease-in: var(--select-ease-in, cubic-bezier(0.7, 0, 0.84, 0));
          }
          .input-wrapper {
            position: relative;
            min-height: var(--select-height);
          }
          input {
            width: 100%;
            min-height: var(--select-height);
            padding: 10px;
            padding-right: 34px;
            box-sizing: border-box;
            border: 1px solid var(--select-border, rgba(127, 127, 127, 0.28));
            background-color: var(--select-bg, rgba(211, 211, 211, 0.38));
            border-radius: var(--select-radius);
            outline: none;
            color: var(--select-text, inherit);
            font: inherit;
            line-height: 1.4;
            transition: border-color 180ms var(--select-ease-out),
              box-shadow 180ms var(--select-ease-out),
              background-color 180ms var(--select-ease-out);
          }
          input::placeholder {
            color: var(--select-placeholder, rgba(127, 127, 127, 0.8));
          }
          input:hover {
            border-color: color-mix(in oklch, var(--select-border, rgba(127, 127, 127, 0.3)) 62%, var(--select-text, black));
          }
          input:focus-visible {
            border-color: color-mix(in oklch, var(--select-border, rgba(127, 127, 127, 0.3)) 45%, var(--select-text, black));
            box-shadow: var(--select-focus-shadow, 0 0 0 2px rgba(102, 102, 255, 0.18));
          }
          .clear-btn {
            position: absolute;
            right: 8px;
            top: 50%;
            width: 18px;
            height: 18px;
            transform: translateY(-50%);
            border: none;
            border-radius: 999px;
            background: center / 14px 14px no-repeat url("/assets/svg/clear.svg");
            background-color: transparent;
            filter: var(--select-clear-filter, none);
            cursor: pointer;
            opacity: 0;
            pointer-events: none;
            transition: opacity 140ms var(--select-ease-out),
              background-color 140ms var(--select-ease-out);
          }
          .clear-btn.visible {
            opacity: 0.75;
            pointer-events: auto;
          }
          .clear-btn:hover {
            opacity: 1;
            background-color: var(--select-option-hover-bg, rgba(127, 127, 127, 0.16));
          }
          .clear-btn:focus-visible {
            outline: none;
            box-shadow: var(--select-focus-shadow, 0 0 0 2px rgba(102, 102, 255, 0.18));
          }
          .dropdown {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            margin-top: 6px;
            padding: 4px;
            border: 1px solid var(--select-border, rgba(127, 127, 127, 0.28));
            max-height: min(260px, 46vh);
            overflow-y: auto;
            background: var(--select-dropdown-bg, white);
            border-radius: var(--select-radius);
            box-shadow: 0 12px 24px color-mix(in oklch, var(--select-text, black) 10%, transparent);
            z-index: 1000;
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
            transform: translateY(-4px);
            transition: opacity 180ms var(--select-ease-out),
              transform 180ms var(--select-ease-out),
              visibility 180ms var(--select-ease-out);
          }
          .dropdown.active {
            opacity: 1;
            visibility: visible;
            pointer-events: auto;
            transform: translateY(0);
          }
          .option {
            min-height: 38px;
            display: flex;
            align-items: center;
            border-radius: calc(var(--select-radius) - 2px);
            padding: 8px 10px;
            cursor: pointer;
            color: var(--select-text, inherit);
            transition: background-color 140ms var(--select-ease-out),
              color 140ms var(--select-ease-out);
          }
          .option + .option {
            margin-top: 2px;
          }
          .option:hover,
          .highlighted {
            background-color: var(--select-option-hover-bg, #f0f0f0);
          }
          .empty {
            justify-content: center;
            color: var(--select-placeholder, rgba(127, 127, 127, 0.8));
            cursor: default;
            min-height: 44px;
            font-size: 0.9rem;
          }
          .empty:hover {
            background-color: transparent;
          }
          .dropdown::-webkit-scrollbar {
            width: 8px;
          }
          .dropdown::-webkit-scrollbar-thumb {
            background: color-mix(in oklch, var(--select-border, rgba(127, 127, 127, 0.28)) 85%, transparent);
            border-radius: 999px;
          }
          @media (pointer: coarse) {
            input {
              min-height: 44px;
            }
            .clear-btn {
              width: 22px;
              height: 22px;
              background-size: 15px 15px;
            }
            .option {
              min-height: 44px;
            }
          }
        </style>
        <div id="input-container"></div>
        <div class="dropdown"></div>
      `;
    }

    connectedCallback() {
        const placeholder = this.getAttribute("placeholder") || "选择干员";
        this.shadowRoot.getElementById("input-container").innerHTML =
            `<div class="input-wrapper">
                <input type="text" placeholder="${placeholder}">
                <button class="clear-btn" type="button" aria-label="清空已选中项"></button>
            </div>`;
        this.input = this.shadowRoot.querySelector("input");
        this.dropdown = this.shadowRoot.querySelector(".dropdown");
        this.clearBtn = this.shadowRoot.querySelector(".clear-btn");

        this.input.addEventListener("input", () => this._onInput());
        this.input.addEventListener("focus", () => this._showDropdown());
        this.input.addEventListener("blur", () => setTimeout(() => this._hideDropdown(), 100));
        this.input.addEventListener("keydown", (e) => this._handleKey(e));
        this.clearBtn.addEventListener("mousedown", (e) => e.preventDefault());
        this.clearBtn.addEventListener("click", () => this._clearSelection());
        this._updateClearButton();
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
        if (this.input) {
            this.input.value = match ? match.label : "";
        }
        this._updateClearButton();
    }

    _onInput() {
        const keyword = this.input.value.toLowerCase();
        this._filtered = this._options.filter((opt) => opt.label.toLowerCase().includes(keyword));
        this._highlight = -1;
        this._render();
        this._showDropdown();
        this._updateClearButton();
    }

    _render() {
        this.dropdown.innerHTML = "";
        if (this._filtered.length === 0) {
            const empty = document.createElement("div");
            empty.textContent = "未找到匹配项";
            empty.className = "option empty";
            this.dropdown.appendChild(empty);
            return;
        }
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

    _clearSelection() {
        this._value = null;
        this.input.value = "";
        this._filtered = [...this._options];
        this._highlight = -1;
        this._render();
        this._updateClearButton();
        this._showDropdown();
        this.input.focus();
        this.dispatchEvent(new Event("change"));
    }

    _showDropdown() {
        this.dropdown.classList.add("active");
    }

    _hideDropdown() {
        this.dropdown.classList.remove("active");
    }

    _updateClearButton() {
        if (!this.clearBtn) return;
        const hasText = Boolean(this.input?.value?.trim());
        this.clearBtn.classList.toggle("visible", Boolean(this._value) || hasText);
    }

    _handleKey(e) {
        if (this._filtered.length === 0) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            this._highlight = (this._highlight + 1) % this._filtered.length;
            this._showDropdown();
            this._render();
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            this._highlight = (this._highlight - 1 + this._filtered.length) % this._filtered.length;
            this._showDropdown();
            this._render();
        } else if (e.key === "Enter" && this._highlight >= 0) {
            this._selectOption(this._filtered[this._highlight]);
        }
    }
}

customElements.define("search-select", SearchSelect);
