/**
 * ステップ定義 & UI連動管理クラス
 */
class StepManager {
  constructor(controller, physics, onStepChangeCallback) {
    this.controller = controller;
    this.physics = physics;
    this.onStepChangeCallback = onStepChangeCallback;

    // ステップ定義データ
    this.steps = [
      {
        id: 0,
        title: 'Step 0: 自然落下（制御なし）',
        shortTitle: 'Step 0',
        mission: '再生ボタンを押して、初期の傾きから傘がどのように倒れるか観察してみよう。',
        params: [],
      },
      {
        id: 1,
        title: 'Step 1: ON/OFF制御',
        shortTitle: 'Step 1',
        mission: '傾いた方向へ、一定の力で手を動かしてみよう。スライダーで押す力の大きさを変更できます。',
        params: [
          {
            key: 'forceFixed',
            label: '押す力 (F)',
            min: 2,
            max: 30,
            step: 1,
            unit: 'N',
            default: 10,
          },
        ],
      },
      {
        id: 2,
        title: 'Step 2: P 制御',
        shortTitle: 'Step 2',
        mission: '傘の傾きの大きさに比例した力で手を動かしてみよう。比例ゲイン Kp を変えると揺れ方はどう変わるかな？',
        params: [
          {
            key: 'kp',
            label: '比例ゲイン (Kp)',
            min: 0,
            max: 45,
            step: 1,
            unit: '',
            default: 18,
          },
        ],
      },
      {
        id: 3,
        title: 'Step 3: PD 制御',
        shortTitle: 'Step 3',
        mission: '倒れる速さにブレーキをかける微分ゲイン Kd を加えよう。傘が垂直にピタッと安定するか試してみよう。',
        params: [
          {
            key: 'kp',
            label: '比例ゲイン (Kp)',
            min: 10,
            max: 50,
            step: 1,
            unit: '',
            default: 25,
          },
          {
            key: 'kd',
            label: '微分ゲイン (Kd)',
            min: 0,
            max: 16,
            step: 0.5,
            unit: '',
            default: 6,
          },
        ],
      },
      {
        id: 4,
        title: 'Step 4: 同時制御',
        shortTitle: 'Step 4',
        mission: '手を元の位置（中央）に戻すゲインを加えよう。風が吹いても倒れずに元の位置に戻れるかな？',
        params: [
          {
            key: 'kp',
            label: '傘 比例ゲイン (Kp)',
            min: 15,
            max: 50,
            step: 1,
            unit: '',
            default: 32,
          },
          {
            key: 'kd',
            label: '傘 微分ゲイン (Kd)',
            min: 2,
            max: 16,
            step: 0.5,
            unit: '',
            default: 8,
          },
          {
            key: 'lp',
            label: '手 比例ゲイン (Lp)',
            min: 0,
            max: 10,
            step: 0.5,
            unit: '',
            default: 4.0,
          },
          {
            key: 'ld',
            label: '手 微分ゲイン (Ld)',
            min: 0,
            max: 12,
            step: 0.5,
            unit: '',
            default: 5.5,
          },
        ],
      },
    ];

    this.activeStepId = 0;
  }

  /**
   * ステップ切り替え
   */
  setStep(stepId, triggerReset = true) {
    if (stepId < 0 || stepId >= this.steps.length) return;
    this.activeStepId = stepId;
    this.controller.setStep(stepId);

    const stepDef = this.steps[stepId];

    // UIの描画更新
    this.renderStepNavigation();
    this.renderStepContent(stepDef);
    this.renderParamSliders(stepDef);
    this.renderPhysicsParams();

    if (triggerReset) {
      this.physics.reset(this.physics.theta0, 0);
    }

    if (typeof this.onStepChangeCallback === 'function') {
      this.onStepChangeCallback(stepId);
    }
  }

  getParamValue(stepId, key) {
    const stepKey = `step${stepId}`;
    return this.controller.params[stepKey]?.[key];
  }

  /**
   * ステップナビゲーションボタンの描画
   */
  renderStepNavigation() {
    const navContainer = document.getElementById('step-nav-container');
    if (!navContainer) return;

    navContainer.innerHTML = '';
    this.steps.forEach((s) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `step-nav-btn ${
        s.id === this.activeStepId ? 'step-nav-btn-active' : 'step-nav-btn-inactive'
      }`;
      btn.textContent = s.shortTitle;
      btn.addEventListener('click', () => {
        this.setStep(s.id, true);
        if (window.closeDrawer) window.closeDrawer();
      });
      navContainer.appendChild(btn);
    });

    // 次へ / 前へ ボタンの状態制御（クラス指定で全要素を同期更新）
    const prevButtons = document.querySelectorAll('.btn-prev-step-action');
    const nextButtons = document.querySelectorAll('.btn-next-step-action');

    const isFirst = this.activeStepId === 0;
    const isLast = this.activeStepId === this.steps.length - 1;

    prevButtons.forEach((btn) => {
      if (isFirst) {
        btn.classList.add('hidden');
        btn.classList.remove('flex-1');
      } else {
        btn.classList.remove('hidden');
        if (isLast) {
          btn.classList.remove('flex-1');
          btn.classList.add('w-full');
        } else {
          btn.classList.remove('w-full');
          btn.classList.add('flex-1');
        }
        btn.innerHTML = `
          <svg class="w-3.5 h-3.5 mr-1 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
          </svg>
          <span>前のステップ (Step ${this.activeStepId - 1})</span>
        `;
      }
    });

    nextButtons.forEach((btn) => {
      if (isLast) {
        btn.classList.add('hidden');
        btn.classList.remove('flex-1');
      } else {
        btn.classList.remove('hidden');
        if (isFirst) {
          btn.classList.remove('flex-1');
          btn.classList.add('w-full');
        } else {
          btn.classList.remove('w-full');
          btn.classList.add('flex-1');
        }
        btn.innerHTML = `
          <span>次のステップ (Step ${this.activeStepId + 1})</span>
          <svg class="w-3.5 h-3.5 ml-1 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
          </svg>
        `;
      }
    });
  }

  /**
   * ミッションテキストの差し替え（観察のポイントは削除）
   */
  renderStepContent(stepDef) {
    const titleEl = document.getElementById('step-title');
    const missionEl = document.getElementById('step-mission');

    if (titleEl) titleEl.textContent = stepDef.title;
    if (missionEl) missionEl.textContent = stepDef.mission;
  }

  /**
   * パラメータスライダーの動的構築
   */
  renderParamSliders(stepDef) {
    const container = document.getElementById('params-container');
    if (!container) return;

    container.innerHTML = '';

    if (!stepDef.params || stepDef.params.length === 0) {
      container.innerHTML = `
        <p class="text-xs text-slate-400 leading-relaxed py-1">
          ※ 傘の初期傾きや長さ・質量は左上「≡」メニューから変更できます。
        </p>
      `;
      return;
    }

    const stepKey = `step${stepDef.id}`;

    stepDef.params.forEach((param) => {
      const curVal = this.controller.params[stepKey][param.key] ?? param.default;

      const card = document.createElement('div');
      card.className = 'py-2.5 border-b border-slate-100 last:border-b-0';

      card.innerHTML = `
        <div class="flex items-center justify-between text-xs font-medium text-slate-700 mb-1.5">
          <span>${param.label}</span>
          <span class="font-mono font-semibold text-slate-900 text-xs" id="val-${param.key}">
            ${curVal}${param.unit}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" class="btn-param-step minus-btn w-7 h-7 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-md font-bold text-xs flex items-center justify-center shrink-0 transition touch-manipulation" data-key="${param.key}" data-step="-${param.step}">−</button>
          <input type="range" 
            class="clean-slider flex-1 h-1.5 bg-slate-200 rounded appearance-none cursor-pointer accent-slate-900"
            id="slider-${param.key}"
            min="${param.min}" 
            max="${param.max}" 
            step="${param.step}" 
            value="${curVal}" 
          />
          <button type="button" class="btn-param-step plus-btn w-7 h-7 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-md font-bold text-xs flex items-center justify-center shrink-0 transition touch-manipulation" data-key="${param.key}" data-step="${param.step}">＋</button>
        </div>
      `;

      container.appendChild(card);

      const slider = card.querySelector(`#slider-${param.key}`);
      const valDisplay = card.querySelector(`#val-${param.key}`);

      const updateValue = (newVal) => {
        let val = Number(newVal);
        val = Math.max(param.min, Math.min(param.max, val));
        const decimals = (String(param.step).split('.')[1] || '').length;
        val = Number(val.toFixed(decimals));

        slider.value = val;
        valDisplay.textContent = `${val}${param.unit}`;
        this.controller.updateParam(stepKey, param.key, val);

        if (param.isInitialAngle && this.physics) {
          const rad = (val * Math.PI) / 180;
          this.physics.theta = rad;
          this.physics.omega = 0;
        }
      };

      slider.addEventListener('input', (e) => {
        updateValue(e.target.value);
      });

      const minusBtn = card.querySelector('.minus-btn');
      const plusBtn = card.querySelector('.plus-btn');

      minusBtn.addEventListener('click', () => {
        const next = Number(slider.value) - param.step;
        updateValue(next);
      });

      plusBtn.addEventListener('click', () => {
        const next = Number(slider.value) + param.step;
        updateValue(next);
      });
    });
  }

  /**
   * KaTeXによる数式描画
   */
  renderKaTeX(stepDef) {
    const formulaContainer = document.getElementById('formula-display');
    const theoryBody = document.getElementById('theory-content');

    const render = () => {
      if (formulaContainer) {
        if (window.katex) {
          try {
            katex.render(stepDef.formulaKaTeX, formulaContainer, {
              throwOnError: false,
              displayMode: true,
            });
          } catch (e) {
            formulaContainer.textContent = stepDef.formulaKaTeX;
          }
        } else {
          formulaContainer.textContent = stepDef.formulaKaTeX;
        }
      }

      if (theoryBody) {
        theoryBody.innerHTML = stepDef.theoryHtml;
        if (window.renderMathInElement) {
          try {
            window.renderMathInElement(theoryBody, {
              delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false },
              ],
              throwOnError: false,
            });
          } catch (_) {}
        }
        const blocks = theoryBody.querySelectorAll('.katex-block');
        blocks.forEach((el) => {
          const expr = el.getAttribute ? el.getAttribute('data-expr') : null;
          if (expr && window.katex) {
            try {
              katex.render(expr, el, { displayMode: true, throwOnError: false });
            } catch (_) {}
          }
        });
      }
    };

    if (window.katex) {
      render();
    } else {
      window.addEventListener('load', render, { once: true });
    }
  }

  nextStep() {
    if (this.activeStepId < this.steps.length - 1) {
      this.setStep(this.activeStepId + 1, true);
    }
  }

  prevStep() {
    if (this.activeStepId > 0) {
      this.setStep(this.activeStepId - 1, true);
    }
  }

  /**
   * ドロワー内の物理モデル設定（質量・長さ）スライダーを生成
   */
  renderPhysicsParams() {
    const container = document.getElementById('physics-params-container');
    if (!container || !this.physics) return;

    container.innerHTML = '';

    const params = [
      {
        key: 'theta0Deg',
        label: 'シミュレーション開始時の姿勢',
        min: -45,
        max: 45,
        step: 1,
        unit: '°',
        default: 15,
        isAngle: true,
      },
      {
        key: 'L',
        label: '傘の長さ',
        min: 0.4,
        max: 2.0,
        step: 0.05,
        unit: 'm',
        default: 1.0,
      },
      {
        key: 'm',
        label: '傘の重さ',
        min: 0.05,
        max: 0.50,
        step: 0.05,
        unit: 'kg',
        default: 0.15,
      },
      {
        key: 'M',
        label: '手の質量',
        min: 0.5,
        max: 3.0,
        step: 0.1,
        unit: 'kg',
        default: 1.0,
      },
    ];

    params.forEach((param) => {
      let curVal;
      if (param.isAngle) {
        curVal = Math.round((this.physics.theta0 * 180) / Math.PI);
      } else {
        curVal = this.physics[param.key] ?? param.default;
      }
      const card = document.createElement('div');
      card.className = 'py-2.5 border-b border-slate-100 last:border-b-0';

      const formattedVal = param.isAngle ? `${curVal}${param.unit}` : `${curVal.toFixed(2)}${param.unit}`;

      card.innerHTML = `
        <div class="flex items-center justify-between text-xs font-medium text-slate-700 mb-1">
          <div>
            <span>${param.label}</span>
          </div>
          <span class="font-mono font-semibold text-slate-900 text-xs" id="val-phy-${param.key}">
            ${formattedVal}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" class="btn-phy-minus w-7 h-7 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-md font-bold text-xs flex items-center justify-center shrink-0 transition">−</button>
          <input type="range"
            class="clean-slider flex-1 h-1.5 bg-slate-200 rounded appearance-none cursor-pointer accent-slate-900"
            id="slider-phy-${param.key}"
            min="${param.min}"
            max="${param.max}"
            step="${param.step}"
            value="${curVal}"
          />
          <button type="button" class="btn-phy-plus w-7 h-7 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-md font-bold text-xs flex items-center justify-center shrink-0 transition">＋</button>
        </div>
      `;

      container.appendChild(card);

      const slider = card.querySelector(`#slider-phy-${param.key}`);
      const valDisplay = card.querySelector(`#val-phy-${param.key}`);

      const updateValue = (newVal) => {
        let val = Number(newVal);
        val = Math.max(param.min, Math.min(param.max, val));

        if (param.isAngle) {
          val = Math.round(val);
          slider.value = val;
          valDisplay.textContent = `${val}${param.unit}`;
          this.physics.theta0 = (val * Math.PI) / 180;
          this.physics.theta = this.physics.theta0;
          this.physics.omega = 0;
        } else {
          val = Number(val.toFixed(2));
          slider.value = val;
          valDisplay.textContent = `${val.toFixed(2)}${param.unit}`;
          this.physics[param.key] = val;
        }
      };

      slider.addEventListener('input', (e) => updateValue(e.target.value));

      card.querySelector('.btn-phy-minus').addEventListener('click', () => {
        const next = Number(slider.value) - param.step;
        updateValue(next);
      });

      card.querySelector('.btn-phy-plus').addEventListener('click', () => {
        const next = Number(slider.value) + param.step;
        updateValue(next);
      });
    });

    // デフォルト値に戻すボタン
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'w-full mt-3 px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-lg transition';
    resetBtn.textContent = 'パラメータを初期値に戻す';
    resetBtn.addEventListener('click', () => {
      params.forEach(param => {
        const slider = document.getElementById(`slider-phy-${param.key}`);
        const valDisplay = document.getElementById(`val-phy-${param.key}`);
        if (param.isAngle) {
          this.physics.theta0 = (param.default * Math.PI) / 180;
          this.physics.theta = this.physics.theta0;
          this.physics.omega = 0;
          if (slider) slider.value = param.default;
          if (valDisplay) valDisplay.textContent = `${param.default}${param.unit}`;
        } else {
          this.physics[param.key] = param.default;
          if (slider) slider.value = param.default;
          if (valDisplay) valDisplay.textContent = `${param.default.toFixed(2)}${param.unit}`;
        }
      });
    });
    container.appendChild(resetBtn);
  }
}

window.StepManager = StepManager;
