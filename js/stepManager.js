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
        mission: '再生ボタンを押して、初期の傾きから傘がどのように倒れるか観察してみよう。傘の初期傾きや長さ・重さは左上のメニュー（≡）から自由に変更できます。',
        formulaKaTeX: 'F = 0',
        theoryHtml: `
          <p class="mb-2">台車（手）に力を一切加えない場合、振子の運動は重力トルクのみによって支配されます。</p>
          <p class="mb-1">微小角での近似方程式：</p>
          <div class="katex-block my-2" data-expr="\\ddot{\\theta} \\approx \\frac{g}{l} \\theta"></div>
          <p>この解は指数関数的に増大（$\\theta(t) \\propto e^{\\sqrt{g/l}\\,t}$）し、わずかな傾きからでも瞬時に転倒します。</p>
        `,
        params: [],
      },
      {
        id: 1,
        title: 'Step 1: ON/OFF制御',
        shortTitle: 'Step 1',
        mission: '傾いた方向へ、一定の力で手を動かしてみよう。スライダーで押す力の大きさを変更できます。',
        formulaKaTeX: 'F = \\begin{cases} +F_{\\mathrm{fixed}} & (\\theta > 0) \\\\ -F_{\\mathrm{fixed}} & (\\theta < 0) \\end{cases}',
        theoryHtml: `
          <p class="mb-2">傾き $\\theta > 0$ なら右へ、$\\theta < 0$ なら左へ、常に一定の大きさの力 $F_{\\mathrm{fixed}}$ を加える制御則です。</p>
          <p class="mb-1">不連続な切り替え面上で激しい振動（チャタリング）が生じ、システムが不安定化します。</p>
        `,
        params: [
          {
            key: 'forceFixed',
            label: '押し力 (F_fixed)',
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
        title: 'Step 2: P制御',
        shortTitle: 'Step 2',
        mission: '傾きの大きさに応じた力（F = Kp · θ）で手を動かしてみよう。比例ゲイン Kp を変えて挙動を確かめよう。',
        formulaKaTeX: 'F = K_p \\cdot \\theta',
        theoryHtml: `
          <p class="mb-2">傾き角 $\\theta$ に比例した力（ばねの復元力に相当）を加えます。</p>
          <p class="mb-1">線形化閉ループ方程式：</p>
          <div class="katex-block my-2" data-expr="\\ddot{\\theta} + \\left( \\frac{K_p - (M+m)g}{M l} \\right) \\theta \\approx 0"></div>
          <p>$K_p$ を大きくすると倒れなくなりますが、減衰要素（ダンパー）がないため左右に振動が持続します。</p>
        `,
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
        title: 'Step 3: PD制御',
        shortTitle: 'Step 3',
        mission: '倒れる速さにブレーキをかける微分ゲイン Kd を加えよう。傘が垂直に安定するか試してみよう。',
        formulaKaTeX: 'F = K_p \\cdot \\theta + K_d \\cdot \\dot{\\theta}',
        theoryHtml: `
          <p class="mb-2">角度比例項に加え、傾く速度 $\\dot{\\theta}$ に抵抗するダンピング項（$K_d \\dot{\\theta}$）を追加します。</p>
          <p class="mb-1">振子の振動は急速に減衰して垂直（$\\theta = 0$）に収束しますが、台車位置 $x$ のフィードバックがないため台車のドリフトが生じます。</p>
        `,
        params: [
          {
            key: 'kp',
            label: '傘 比例ゲイン (Kp)',
            min: 10,
            max: 50,
            step: 1,
            unit: '',
            default: 25,
          },
          {
            key: 'kd',
            label: '傘 微分ゲイン (Kd)',
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
        title: 'Step 4: 完全制御（台車位置保持）',
        shortTitle: 'Step 4',
        mission: '台車の位置と速度を原点に戻すゲイン（Lp, Ld）を加えよう。外乱ボタンで突いても元の位置に復帰できる？',
        formulaKaTeX: 'F = K_p \\cdot \\theta + K_d \\cdot \\dot{\\theta} + L_p \\cdot x + L_d \\cdot \\dot{x}',
        theoryHtml: `
          <p class="mb-2">全状態量 $X = [x, \\dot{x}, \\theta, \\dot{\\theta}]^T$ をフィードバックする状態フィードバック制御則です。</p>
          <div class="katex-block my-2" data-expr="u = -K X = [L_p, L_d, K_p, K_d] \\begin{bmatrix} x \\\\ \\dot{x} \\\\ \\theta \\\\ \\dot{\\theta} \\end{bmatrix}"></div>
          <p>振子の直立安定化と台車位置の原点復帰（$x \\to 0, \\theta \\to 0$）を同時に達成します。</p>
        `,
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
            label: '手 位置ゲイン (Lp)',
            min: 0,
            max: 10,
            step: 0.5,
            unit: '',
            default: 4.0,
          },
          {
            key: 'ld',
            label: '手 速度ゲイン (Ld)',
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
    this.renderKaTeX(stepDef);
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
        btn.textContent = `◀ 前のステップ (Step ${this.activeStepId - 1})`;
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
        btn.textContent = `次のステップ (Step ${this.activeStepId + 1}) ➔`;
      }
    });

    const headerStep = document.getElementById('header-step-indicator');
    if (headerStep) {
      headerStep.textContent = `Step ${this.activeStepId} / ${this.steps.length - 1}`;
    }
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
        <div class="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-500 leading-relaxed">
          傘の初期傾きや長さ・質量は左上「≡」メニューから変更できます。
        </div>
      `;
      return;
    }

    const stepKey = `step${stepDef.id}`;

    stepDef.params.forEach((param) => {
      const curVal = this.controller.params[stepKey][param.key] ?? param.default;

      const card = document.createElement('div');
      card.className = 'param-control-item bg-slate-50 border border-slate-200 rounded p-2.5 mb-2';

      card.innerHTML = `
        <div class="flex items-center justify-between text-xs text-slate-700 font-medium mb-1.5">
          <span>${param.label}</span>
          <span class="font-mono text-slate-900 bg-white border border-slate-200 px-1.5 py-0.5 rounded text-xs min-w-[48px] text-center" id="val-${param.key}">
            ${curVal}${param.unit}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" class="btn-param-step minus-btn text-slate-700 hover:bg-slate-200 active:bg-slate-300 bg-white border border-slate-300 w-8 h-8 rounded flex items-center justify-center font-bold text-sm touch-manipulation" data-key="${param.key}" data-step="-${param.step}">−</button>
          <input type="range" 
            class="slider-input flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-800"
            id="slider-${param.key}"
            min="${param.min}" 
            max="${param.max}" 
            step="${param.step}" 
            value="${curVal}" 
          />
          <button type="button" class="btn-param-step plus-btn text-slate-700 hover:bg-slate-200 active:bg-slate-300 bg-white border border-slate-300 w-8 h-8 rounded flex items-center justify-center font-bold text-sm touch-manipulation" data-key="${param.key}" data-step="${param.step}">＋</button>
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
        label: '初期傾き角 (θ₀)',
        note: 'シミュレーション開始時の姿勢',
        min: -45,
        max: 45,
        step: 1,
        unit: '°',
        default: 15,
        isAngle: true,
      },
      {
        key: 'l',
        label: '振子の重心長 (l)',
        note: '全長は 2·l',
        min: 0.2,
        max: 1.0,
        step: 0.05,
        unit: 'm',
        default: 0.5,
      },
      {
        key: 'm',
        label: '振子の質量 (m)',
        note: '傘の重さ',
        min: 0.05,
        max: 0.50,
        step: 0.05,
        unit: 'kg',
        default: 0.15,
      },
      {
        key: 'M',
        label: '台車の質量 (M)',
        note: '手の慣性質量',
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
      card.className = 'bg-white border border-slate-200 rounded p-2 mb-2 text-xs shadow-sm';

      const formattedVal = param.isAngle ? `${curVal}${param.unit}` : `${curVal.toFixed(2)}${param.unit}`;

      card.innerHTML = `
        <div class="flex items-center justify-between font-medium text-slate-700 mb-1">
          <div>
            <span>${param.label}</span>
            <span class="text-[10px] text-slate-400 block">${param.note}</span>
          </div>
          <span class="font-mono text-slate-900 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded min-w-[50px] text-center" id="val-phy-${param.key}">
            ${formattedVal}
          </span>
        </div>
        <div class="flex items-center gap-1.5">
          <button type="button" class="btn-phy-minus w-7 h-7 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-300 rounded font-bold text-xs flex items-center justify-center shrink-0 touch-manipulation">−</button>
          <input type="range"
            class="slider-input flex-1 h-2 bg-slate-200 rounded appearance-none cursor-pointer accent-slate-800"
            id="slider-phy-${param.key}"
            min="${param.min}"
            max="${param.max}"
            step="${param.step}"
            value="${curVal}"
          />
          <button type="button" class="btn-phy-plus w-7 h-7 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-300 rounded font-bold text-xs flex items-center justify-center shrink-0 touch-manipulation">＋</button>
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
    resetBtn.className = 'w-full mt-1 px-3 py-1.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-200 rounded transition';
    resetBtn.textContent = '物理パラメータを初期値に戻す';
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
