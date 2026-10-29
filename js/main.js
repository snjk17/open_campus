/**
 * アプリケーションのエントリーポイント & イベント配線
 */
document.addEventListener('DOMContentLoaded', () => {
  // ==================== 1. DOM要素の取得（最上部で一括取得） ====================
  const canvas = document.getElementById('simulation-canvas');
  if (!canvas) return;

  const btnPlayPause = document.getElementById('btn-play-pause');
  const btnReset = document.getElementById('btn-reset');
  const monitorAngle = document.getElementById('monitor-angle');
  const monitorPos = document.getElementById('monitor-pos');
  const monitorForce = document.getElementById('monitor-force');

  const sliderDisturb = document.getElementById('slider-disturb-strength');
  const valDisturb = document.getElementById('val-disturb-strength');
  const btnDisturbMinus = document.getElementById('btn-disturb-minus');
  const btnDisturbPlus = document.getElementById('btn-disturb-plus');
  const btnDisturbLeft = document.getElementById('btn-disturb-left');
  const btnDisturbRight = document.getElementById('btn-disturb-right');

  const btnMenuToggle = document.getElementById('btn-menu-toggle');
  const btnDrawerClose = document.getElementById('btn-drawer-close');
  const sideDrawer = document.getElementById('side-drawer');
  const drawerBackdrop = document.getElementById('drawer-backdrop');

  const accordionHeader = document.getElementById('accordion-header');
  const accordionBody = document.getElementById('accordion-body');
  const accordionArrow = document.getElementById('accordion-arrow');

  // ==================== 2. アプリ状態 ====================
  let isRunning = false; // デフォルトは停止状態
  let disturbanceStrength = 2.0;
  let lastTime = performance.now();

  // ==================== 3. コントロール関数定義 ====================
  function updatePlayPauseButton() {
    if (!btnPlayPause) return;
    if (isRunning) {
      btnPlayPause.innerHTML = '<span class="mr-1">⏸</span> 停止';
      btnPlayPause.className = 'px-2.5 sm:px-3 py-1.5 text-xs font-medium bg-slate-200 text-slate-800 border border-slate-300 rounded hover:bg-slate-300 active:bg-slate-400 transition flex items-center touch-target-min';
    } else {
      btnPlayPause.innerHTML = '<span class="mr-1">▶</span> 再生';
      btnPlayPause.className = 'px-2.5 sm:px-3 py-1.5 text-xs font-medium bg-slate-900 text-white border border-slate-800 rounded hover:bg-slate-800 active:bg-slate-950 transition flex items-center touch-target-min';
    }
  }

  function setDisturbanceStrength(val) {
    let num = Number(val);
    num = Math.max(0.5, Math.min(5.0, num));
    num = Number(num.toFixed(1));
    disturbanceStrength = num;
    if (sliderDisturb) sliderDisturb.value = num;
    if (valDisturb) valDisturb.textContent = `${num.toFixed(1)}N`;
  }

  function updateStateMonitor(p) {
    const deg = (p.theta * 180) / Math.PI;
    const signDeg = deg >= 0 ? '+' : '−';
    const absDeg = Math.abs(deg).toFixed(1);
    const formattedDeg = `${signDeg}${absDeg.padStart(5, ' ')}°`;

    const signX = p.x >= 0 ? '+' : '−';
    const absX = Math.abs(p.x).toFixed(2);
    const formattedX = `${signX}${absX.padStart(5, ' ')}m`;

    const signF = p.F >= 0 ? '+' : '−';
    const absF = Math.abs(p.F).toFixed(1);
    const formattedF = `${signF}${absF.padStart(4, ' ')}N`;

    if (monitorAngle) monitorAngle.textContent = formattedDeg;
    if (monitorPos) monitorPos.textContent = formattedX;
    if (monitorForce) monitorForce.textContent = formattedF;
  }

  const openDrawer = () => {
    if (!sideDrawer || !drawerBackdrop) return;
    drawerBackdrop.classList.remove('hidden');
    requestAnimationFrame(() => {
      drawerBackdrop.classList.remove('opacity-0');
      drawerBackdrop.classList.add('opacity-100');
      sideDrawer.classList.remove('-translate-x-full');
      sideDrawer.classList.add('translate-x-0');
    });
  };

  const closeDrawer = () => {
    if (!sideDrawer || !drawerBackdrop) return;
    drawerBackdrop.classList.remove('opacity-100');
    drawerBackdrop.classList.add('opacity-0');
    sideDrawer.classList.remove('translate-x-0');
    sideDrawer.classList.add('-translate-x-full');
    setTimeout(() => {
      drawerBackdrop.classList.add('hidden');
    }, 200);
  };
  window.closeDrawer = closeDrawer;

  // ==================== 4. 物理・描画・ステップ管理インスタンス生成 ====================
  const physics = new InvertedPendulumPhysics();
  const controller = new InvertedPendulumController();
  const renderer = new PendulumRenderer(canvas);

  const stepManager = new StepManager(controller, physics, (newStepId) => {
    renderer.resetCamera();
    isRunning = false;
    updatePlayPauseButton();
  });

  // 初期ステップ設定 (Step 0)
  stepManager.setStep(0, true);
  updatePlayPauseButton();

  // 初回即時描画（プレビュー・遅延レンダリング対策）
  renderer.resize();
  renderer.render(physics);
  updateStateMonitor(physics);
  [50, 150, 300, 600].forEach(delay => {
    setTimeout(() => {
      renderer.resize();
      renderer.render(physics);
    }, delay);
  });

  // ==================== 5. アニメーションループ ====================
  function loop(currentTime) {
    const elapsed = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    const dt = Math.min(elapsed, 0.05);

    if (isRunning && dt > 0) {
      physics.update(dt, (x, v, theta, omega) => {
        return controller.computeControl(x, v, theta, omega);
      });
    }

    renderer.render(physics);
    updateStateMonitor(physics);

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // ==================== 6. イベントリスナー配線 ====================

  // 再生/停止
  if (btnPlayPause) {
    btnPlayPause.addEventListener('click', () => {
      isRunning = !isRunning;
      updatePlayPauseButton();
    });
  }

  // リセット
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      physics.reset(physics.theta0, 0);
      renderer.resetCamera();
      isRunning = false;
      updatePlayPauseButton();
    });
  }

  // 外乱スライダー & ステッパー
  if (sliderDisturb) {
    sliderDisturb.addEventListener('input', (e) => setDisturbanceStrength(e.target.value));
  }
  if (btnDisturbMinus) {
    btnDisturbMinus.addEventListener('click', () => setDisturbanceStrength(disturbanceStrength - 0.5));
  }
  if (btnDisturbPlus) {
    btnDisturbPlus.addEventListener('click', () => setDisturbanceStrength(disturbanceStrength + 0.5));
  }

  // 外乱押しボタン（左から押す: 正のインパルス、右から押す: 負のインパルス）
  if (btnDisturbLeft) {
    btnDisturbLeft.addEventListener('click', () => {
      physics.applyImpulse(disturbanceStrength, disturbanceStrength * 0.2);
    });
  }
  if (btnDisturbRight) {
    btnDisturbRight.addEventListener('click', () => {
      physics.applyImpulse(-disturbanceStrength, -disturbanceStrength * 0.2);
    });
  }

  // ドロワー開閉
  if (btnMenuToggle) {
    btnMenuToggle.addEventListener('click', () => {
      stepManager.renderPhysicsParams();
      openDrawer();
    });
  }
  if (btnDrawerClose) btnDrawerClose.addEventListener('click', closeDrawer);
  if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);

  // ステップ前へ / 次へ ボタン
  document.querySelectorAll('.btn-prev-step-action').forEach(btn => {
    btn.addEventListener('click', () => {
      stepManager.prevStep();
      closeDrawer();
    });
  });
  document.querySelectorAll('.btn-next-step-action').forEach(btn => {
    btn.addEventListener('click', () => {
      stepManager.nextStep();
      closeDrawer();
    });
  });

  // 数式アコーディオン
  if (accordionHeader && accordionBody) {
    accordionHeader.addEventListener('click', () => {
      const isHidden = accordionBody.classList.contains('hidden');
      if (isHidden) {
        accordionBody.classList.remove('hidden');
        if (accordionArrow) accordionArrow.style.transform = 'rotate(180deg)';
        stepManager.renderKaTeX(stepManager.steps[stepManager.activeStepId]);
      } else {
        accordionBody.classList.add('hidden');
        if (accordionArrow) accordionArrow.style.transform = 'rotate(0deg)';
      }
    });
  }

  // ==================== 7. リサイズ監視 ====================
  window.addEventListener('resize', () => renderer.resize());
  window.addEventListener('load', () => renderer.resize());

  if (window.ResizeObserver && canvas.parentElement) {
    const ro = new ResizeObserver(() => renderer.resize());
    ro.observe(canvas.parentElement);
  }
});
