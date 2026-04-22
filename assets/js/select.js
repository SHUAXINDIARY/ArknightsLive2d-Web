class SearchSelect extends HTMLElement {
    static get observedAttributes() {
        return ["disabled", "placeholder"];
    }

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._options = [];
        this._filtered = [];
        this._value = null;
        this._highlight = -1;
        this._open = false;
        this._blurTimer = null;
        this._isComposing = false;
        this._uid = Math.random().toString(36).slice(2, 9);
        this._commitAnimation = null;
        this._prefersReducedMotion = false;
        this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: inline-block;
            position: relative;
            font-family: var(--select-font, inherit);
            width: var(--select-width, 200px);
            --select-radius: var(--select-radius, var(--radius-sm, 8px));
            --select-height: var(--select-height, 40px);
            --select-ease-out: var(--select-ease-out, var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1)));
            --select-ease-in: var(--select-ease-in, var(--ease-in-standard, cubic-bezier(0.7, 0, 0.84, 0)));
            --select-duration-fast: var(--select-duration-fast, 140ms);
            --select-duration-medium: var(--select-duration-medium, 220ms);
          }
          .input-wrapper {
            position: relative;
            min-height: var(--select-height);
            isolation: isolate;
          }
          .input-wrapper::after {
            content: "";
            position: absolute;
            left: 8px;
            right: 8px;
            bottom: 4px;
            height: 2px;
            border-radius: 999px;
            background: color-mix(in oklch, var(--select-text, white) 22%, var(--select-option-hover-bg, rgba(102, 102, 255, 0.35)));
            opacity: 0;
            transform: scaleX(0.2);
            transform-origin: center;
            transition: transform var(--select-duration-medium) var(--select-ease-out),
              opacity var(--select-duration-fast) var(--select-ease-out);
            pointer-events: none;
          }
          .input-wrapper:focus-within::after {
            opacity: 0.9;
            transform: scaleX(1);
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
            transition: border-color var(--select-duration-fast) var(--select-ease-out),
              box-shadow var(--select-duration-fast) var(--select-ease-out),
              background-color var(--select-duration-fast) var(--select-ease-out),
              transform var(--select-duration-fast) var(--select-ease-out);
          }
          input::placeholder {
            color: var(--select-placeholder, rgba(127, 127, 127, 0.8));
          }
          input:disabled {
            cursor: not-allowed;
            opacity: 0.72;
          }
          input:hover {
            border-color: color-mix(in oklch, var(--select-border, rgba(127, 127, 127, 0.3)) 62%, var(--select-text, black));
            background-color: color-mix(in oklch, var(--select-bg, rgba(211, 211, 211, 0.38)) 86%, var(--select-option-hover-bg, rgba(127, 127, 127, 0.1)));
          }
          input:disabled:hover {
            border-color: var(--select-border, rgba(127, 127, 127, 0.3));
            background-color: var(--select-bg, rgba(211, 211, 211, 0.38));
          }
          input:focus-visible {
            border-color: color-mix(in oklch, var(--select-border, rgba(127, 127, 127, 0.3)) 45%, var(--select-text, black));
            box-shadow: var(--select-focus-shadow, 0 0 0 2px rgba(102, 102, 255, 0.18));
            transform: translateY(-1px);
            background-color: color-mix(in oklch, var(--select-bg, rgba(211, 211, 211, 0.38)) 84%, var(--select-dropdown-bg, white));
          }
          .clear-btn {
            position: absolute;
            right: 8px;
            top: 50%;
            width: 18px;
            height: 18px;
            transform: translateY(-50%) scale(0.86) rotate(-8deg);
            border: none;
            border-radius: 999px;
            background: center / 14px 14px no-repeat url("/assets/svg/clear.svg");
            background-color: transparent;
            filter: var(--select-clear-filter, none);
            cursor: pointer;
            opacity: 0;
            pointer-events: none;
            transition: opacity var(--select-duration-fast) var(--select-ease-out),
              background-color var(--select-duration-fast) var(--select-ease-out),
              transform var(--select-duration-fast) var(--select-ease-out);
          }
          .clear-btn.visible {
            opacity: 0.75;
            pointer-events: auto;
            transform: translateY(-50%) scale(1) rotate(0deg);
          }
          .clear-btn:hover {
            opacity: 1;
            background-color: var(--select-option-hover-bg, rgba(127, 127, 127, 0.16));
            transform: translateY(-50%) scale(1.08) rotate(8deg);
          }
          .clear-btn:active {
            transform: translateY(-50%) scale(0.94) rotate(0deg);
          }
          .clear-btn:focus-visible {
            outline: none;
            box-shadow: var(--select-focus-shadow, 0 0 0 2px rgba(102, 102, 255, 0.18));
          }
          .clear-btn:disabled {
            cursor: not-allowed;
            opacity: 0.34;
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
            transform: translateY(-4px) scale(0.98);
            transform-origin: top center;
            transition: opacity var(--select-duration-fast) var(--select-ease-out),
              transform var(--select-duration-fast) var(--select-ease-out),
              visibility var(--select-duration-fast) var(--select-ease-out);
          }
          .dropdown.active {
            opacity: 1;
            visibility: visible;
            pointer-events: auto;
            transform: translateY(0) scale(1);
          }
          .option {
            min-height: 38px;
            display: flex;
            align-items: center;
            border-radius: calc(var(--select-radius) - 2px);
            padding: 8px 10px;
            cursor: pointer;
            color: var(--select-text, inherit);
            transform: translateX(0);
            transition: background-color var(--select-duration-fast) var(--select-ease-out),
              color var(--select-duration-fast) var(--select-ease-out),
              transform var(--select-duration-fast) var(--select-ease-out);
          }
          .option-label {
            width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .dropdown.active .option {
            animation: option-enter var(--select-duration-medium) var(--select-ease-out) both;
            animation-delay: calc(var(--option-index, 0) * 18ms);
          }
          .option + .option {
            margin-top: 2px;
          }
          .option:hover,
          .highlighted {
            background-color: var(--select-option-hover-bg, #f0f0f0);
            transform: translateX(2px);
          }
          .option.selected {
            box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--select-text, black) 14%, transparent);
          }
          .option:active {
            transform: translateX(1px) scale(0.99);
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
            transform: none;
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
          @keyframes option-enter {
            from {
              opacity: 0;
              transform: translateY(6px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @media (prefers-reduced-motion: reduce) {
            input,
            .clear-btn,
            .dropdown,
            .option,
            .input-wrapper::after {
              transition-duration: 0.01ms !important;
            }
            .dropdown.active .option {
              animation: none !important;
            }
          }
        </style>
        <div id="input-container"></div>
        <div class="dropdown"></div>
      `;
    }

    connectedCallback() {
        const placeholder = this.getAttribute("placeholder") || "选择干员";
        const inputContainer = this.shadowRoot.getElementById("input-container");
        const wrapper = document.createElement("div");
        wrapper.className = "input-wrapper";

        const input = document.createElement("input");
        input.type = "text";
        input.placeholder = placeholder;
        input.setAttribute("role", "combobox");
        input.setAttribute("aria-autocomplete", "list");
        input.setAttribute("autocomplete", "off");
        input.setAttribute("spellcheck", "false");

        const clearBtn = document.createElement("button");
        clearBtn.className = "clear-btn";
        clearBtn.type = "button";
        clearBtn.setAttribute("aria-label", "清空已选中项");
        clearBtn.title = "清空";

        wrapper.appendChild(input);
        wrapper.appendChild(clearBtn);
        inputContainer.innerHTML = "";
        inputContainer.appendChild(wrapper);

        this.input = this.shadowRoot.querySelector("input");
        this.dropdown = this.shadowRoot.querySelector(".dropdown");
        this.clearBtn = this.shadowRoot.querySelector(".clear-btn");
        this._listboxId = `search-select-listbox-${this._uid}`;
        this.dropdown.id = this._listboxId;
        this.dropdown.setAttribute("role", "listbox");
        this.input.setAttribute("aria-controls", this._listboxId);
        this.input.setAttribute("aria-expanded", "false");
        this._prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        this._onInputHandler = () => this._onInput();
        this._onFocusHandler = () => this._showDropdown();
        this._onBlurHandler = () => {
            this._clearBlurTimer();
            this._blurTimer = window.setTimeout(() => this._hideDropdown(), 120);
        };
        this._onKeyDownHandler = (e) => this._handleKey(e);
        this._onClearMouseDownHandler = (e) => {
            e.preventDefault();
            this._clearBlurTimer();
        };
        this._onClearClickHandler = () => this._clearSelection();
        this._onCompositionStartHandler = () => {
            this._isComposing = true;
        };
        this._onCompositionEndHandler = () => {
            this._isComposing = false;
            this._onInput();
        };

        this.input.addEventListener("input", this._onInputHandler);
        this.input.addEventListener("focus", this._onFocusHandler);
        this.input.addEventListener("blur", this._onBlurHandler);
        this.input.addEventListener("keydown", this._onKeyDownHandler);
        this.input.addEventListener("compositionstart", this._onCompositionStartHandler);
        this.input.addEventListener("compositionend", this._onCompositionEndHandler);
        this.clearBtn.addEventListener("mousedown", this._onClearMouseDownHandler);
        this.clearBtn.addEventListener("click", this._onClearClickHandler);
        this._filtered = [...this._options];
        this._render();
        this._syncInputFromValue();
        this._syncComboboxState();
        this._applyDisabledState();
        this._updateClearButton();
    }

    disconnectedCallback() {
        this._clearBlurTimer();
        if (this._commitAnimation) {
            this._commitAnimation.cancel();
            this._commitAnimation = null;
        }
        if (!this.input || !this.clearBtn) return;
        this.input.removeEventListener("input", this._onInputHandler);
        this.input.removeEventListener("focus", this._onFocusHandler);
        this.input.removeEventListener("blur", this._onBlurHandler);
        this.input.removeEventListener("keydown", this._onKeyDownHandler);
        this.input.removeEventListener("compositionstart", this._onCompositionStartHandler);
        this.input.removeEventListener("compositionend", this._onCompositionEndHandler);
        this.clearBtn.removeEventListener("mousedown", this._onClearMouseDownHandler);
        this.clearBtn.removeEventListener("click", this._onClearClickHandler);
    }

    attributeChangedCallback(name, _, newValue) {
        if (name === "placeholder" && this.input) {
            this.input.placeholder = newValue || "选择干员";
            return;
        }
        if (name === "disabled") {
            this._applyDisabledState();
        }
    }

    set options(list) {
        this._options = Array.isArray(list)
            ? list
                  .filter((item) => item && Object.prototype.hasOwnProperty.call(item, "label") && Object.prototype.hasOwnProperty.call(item, "value"))
                  .map((item) => ({ label: String(item.label), value: item.value }))
            : [];
        this._filtered = [...this._options];
        this._highlight = -1;
        if (!this._options.some((item) => item.value === this._value)) {
            this._value = null;
        }
        this._render();
        this._syncInputFromValue();
        this._syncComboboxState();
        this._updateClearButton();
    }

    get value() {
        return this._value;
    }

    set value(val) {
        this._value = val;
        this._syncInputFromValue();
        this._render();
        this._syncComboboxState();
        this._updateClearButton();
    }

    _onInput() {
        if (this._isComposing) return;
        if (this.hasAttribute("disabled")) return;
        const keyword = this.input.value.toLowerCase();
        this._filtered = this._options.filter((opt) => opt.label.toLowerCase().includes(keyword));
        this._highlight = -1;
        this._render();
        this._showDropdown();
        this._updateClearButton();
    }

    _render() {
        if (!this.dropdown) return;
        this.dropdown.innerHTML = "";
        if (this._filtered.length === 0) {
            const empty = document.createElement("div");
            const keyword = this.input?.value?.trim();
            empty.textContent = keyword ? `未找到“${keyword}”` : "暂无可选项";
            empty.className = "option empty";
            empty.setAttribute("aria-disabled", "true");
            this.dropdown.appendChild(empty);
            this._syncComboboxState();
            return;
        }
        const fragment = document.createDocumentFragment();
        this._filtered.forEach((opt, i) => {
            const div = document.createElement("div");
            const optionId = this._getOptionId(i);
            const label = document.createElement("span");
            label.className = "option-label";
            label.textContent = opt.label;
            div.className = "option";
            div.id = optionId;
            div.setAttribute("role", "option");
            div.setAttribute("aria-selected", String(opt.value === this._value));
            div.title = opt.label;
            if (i === this._highlight) div.classList.add("highlighted");
            if (opt.value === this._value) div.classList.add("selected");
            div.style.setProperty("--option-index", String(Math.min(i, 7)));
            div.appendChild(label);
            div.addEventListener("mousedown", (event) => {
                event.preventDefault();
                this._clearBlurTimer();
                this._selectOption(opt);
            });
            div.addEventListener("mouseenter", () => {
                this._highlight = i;
                this._syncComboboxState();
            });
            fragment.appendChild(div);
        });
        this.dropdown.appendChild(fragment);
        this._syncComboboxState();
    }

    _selectOption(opt) {
        if (!opt) return;
        this.value = opt.value;
        this._animateCommit();
        this._hideDropdown();
        this._emitChange();
    }

    _clearSelection() {
        if (this.hasAttribute("disabled")) return;
        this._clearBlurTimer();
        this._value = null;
        this.input.value = "";
        this._filtered = [...this._options];
        this._highlight = -1;
        this._render();
        this._updateClearButton();
        this._showDropdown();
        this.input.focus();
        this._emitChange();
    }

    _showDropdown() {
        if (!this.dropdown || this.hasAttribute("disabled")) return;
        this._open = true;
        this.dropdown.classList.add("active");
        this._syncComboboxState();
    }

    _hideDropdown() {
        if (!this.dropdown) return;
        this._open = false;
        this._highlight = -1;
        this.dropdown.classList.remove("active");
        this._syncComboboxState();
    }

    _updateClearButton() {
        if (!this.clearBtn) return;
        const hasText = Boolean(this.input?.value?.trim());
        const canClear = !this.hasAttribute("disabled");
        this.clearBtn.classList.toggle("visible", canClear && (Boolean(this._value) || hasText));
    }

    _handleKey(e) {
        if (this.hasAttribute("disabled")) return;
        if (e.key === "Escape") {
            this._hideDropdown();
            return;
        }
        if (e.key === "Tab") {
            this._hideDropdown();
            return;
        }
        if (this._filtered.length === 0) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            this._showDropdown();
            this._highlight = (this._highlight + 1) % this._filtered.length;
            this._render();
            this._scrollHighlightIntoView();
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            this._showDropdown();
            this._highlight = (this._highlight - 1 + this._filtered.length) % this._filtered.length;
            this._render();
            this._scrollHighlightIntoView();
        } else if (e.key === "Enter" && this._highlight >= 0) {
            e.preventDefault();
            this._selectOption(this._filtered[this._highlight]);
        } else if (e.key === "Enter") {
            this._showDropdown();
        }
    }

    _scrollHighlightIntoView() {
        const highlighted = this.dropdown.querySelector(".option.highlighted");
        if (!highlighted) return;
        highlighted.scrollIntoView({
            block: "nearest",
            behavior: this._prefersReducedMotion ? "auto" : "smooth",
        });
    }

    _animateCommit() {
        if (!this.input || this._prefersReducedMotion || typeof this.input.animate !== "function") return;
        if (this._commitAnimation) {
            this._commitAnimation.cancel();
        }
        this._commitAnimation = this.input.animate(
            [
                { transform: "translateY(0)" },
                { transform: "translateY(-1px)" },
                { transform: "translateY(0)" },
            ],
            {
                duration: 220,
                easing: "cubic-bezier(0.16, 1, 0.3, 1)",
            }
        );
    }

    _syncInputFromValue() {
        if (!this.input) return;
        const match = this._options.find((opt) => opt.value === this._value);
        this.input.value = match ? match.label : "";
    }

    _syncComboboxState() {
        if (!this.input) return;
        this.input.setAttribute("aria-expanded", String(this._open));
        if (this._open && this._highlight >= 0) {
            this.input.setAttribute("aria-activedescendant", this._getOptionId(this._highlight));
        } else {
            this.input.removeAttribute("aria-activedescendant");
        }
    }

    _emitChange() {
        this.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    }

    _applyDisabledState() {
        const disabled = this.hasAttribute("disabled");
        if (!this.input || !this.clearBtn) return;
        this.input.disabled = disabled;
        this.input.setAttribute("aria-disabled", String(disabled));
        this.clearBtn.disabled = disabled;
        if (disabled) {
            this._hideDropdown();
        }
        this._updateClearButton();
    }

    _clearBlurTimer() {
        if (!this._blurTimer) return;
        clearTimeout(this._blurTimer);
        this._blurTimer = null;
    }

    _getOptionId(index) {
        return `${this._listboxId}-option-${index}`;
    }
}

customElements.define("search-select", SearchSelect);
