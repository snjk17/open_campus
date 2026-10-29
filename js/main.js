/**
 * アプリケーションのエントリーポイント & イベント配線
 */
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('simulation-canvas');
  if (!canvas) return;

  // 1. 各種インスタンス生成
  const physics = new InvertedPendulumPhysics();
  const controller = new InvertedPendulumController();
  const renderer = new PendulumRenderer(canvas);

  let isRunning = true;
  let lastTime = performance.now();

  // 2. ステップ管理の初期化
  const stepManager = new StepManager(controller, physics, (newStepId) => {
    renderer.resetCamera();
  });

  // 初期ステップ設定 (Step 0)
  stepManager.setStep(0, true);

  // 3. アニメーションループ
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

  // 4. 状態モニター表示の更新（小数点以下桁数固定＆バッファ）
  const monitorAngle = document.getElementById('monitor-angle');
  const monitorPos = document.getElementById('monitor-pos');
  const monitorForce = document.getElementById('monitor-force');

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

  // 5. シミュレーション操作ボタン（再生/停止、リセット）
  const btnPlayPause = document.getElementById('btn-play-pause');
  const btnReset = document.getElementById('btn-reset');

  function updatePlayPauseButton() {
    if (!btnPlayPause) return;
    if (isRunning) {
      btnPlayPause.innerHTML = '<span class="mr-1">⏸</span> 一時停止';
      btnPlayPause.classList.remove('bg-slate-800', 'text-white');
      btnPlayPause.classList.add('bg-slate-200', 'text-slate-800');
    } else {
      btnPlayPause.innerHTML = '<span class="mr-1">▶</span> 再生';
      btnPlayPause.classList.remove('bg-slate-200', 'text-slate-800');
      btnPlayPause.classList.add('bg-slate-800', 'text-white');
    }
  }

  if (btnPlayPause) {
    btnPlayPause.addEventListener('click', () => {
      isRunning = !isRunning;
      updatePlayPauseButton();
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      const stepDef = stepManager.steps[stepManager.activeStepId];
      const curDeg = stepManager.getParamValue(stepManager.activeStepId, 'theta0Deg') ?? stepDef.defaultInitAngleDeg ?? 5;
      const initRad = (curDeg * Math.PI) / 180;
      physics.reset(initRad, 0);
      renderer.resetCamera();
    });
  }

  // 6. 外乱ボタン & 強さ設定
  let disturbanceStrength = 2.0;
  const sliderDisturb = document.getElementById('slider-disturb-strength');
  const valDisturb = document.getElementById('val-disturb-strength');
  const btnDisturbMinus = document.getElementById('btn-disturb-minus');
  const btnDisturbPlus = document.getElementById('btn-disturb-plus');

  function setDisturbanceStrength(val) {
    let num = Number(val);
    num = Math.max(0.5, Math.min(5.0, num));
    num = Number(num.toFixed(1));
    disturbanceStrength = num;
    if (sliderDisturb) sliderDisturb.value = num;
    if (valDisturb) valDisturb.textContent = `${num.toFixed(1)}N`;
  }

  if (sliderDisturb) {
    sliderDisturb.addEventListener('input', (e) => {
      setDisturbanceStrength(e.target.value);
    });
  }

  if (btnDisturbMinus) {
    btnDisturbMinus.addEventListener('click', () => {
      setDisturbanceStrength(disturbanceStrength - 0.5);
    });
  }

  if (btnDisturbPlus) {
    btnDisturbPlus.addEventListener('click', () => {
      setDisturbanceStrength(disturbanceStrength + 0.5);
    });
  }

  const btnDisturbLeft = document.getElementById('btn-disturb-left');
  const btnDisturbRight = document.getElementById('btn-disturb-right');

  // 左から押す: 左から右向きに突く -> 振子は右に倒れる (+omega), 台車は右へ (+v)
  if (btnDisturbLeft) {
    btnDisturbLeft.addEventListener('click', () => {
      physics.applyImpulse(disturbanceStrength, disturbanceStrength * 0.2);
    });
  }

  // 右から押す: 右から左向きに突く -> 振子は左に倒れる (-omega), 台車は左へ (-v)
  if (btnDisturbRight) {
    btnDisturbRight.addEventListener('click', () => {
      physics.applyImpulse(-disturbanceStrength, -disturbanceStrength * 0.2);
    });
  }

  // 7. ハンバーガーメニュー（サイドドロワー）開閉
  const btnMenuToggle = document.getElementById('btn-menu-toggle');
  const btnDrawerClose = document.getElementById('btn-drawer-close');
  const sideDrawer = document.getElementById('side-drawer');
  const drawerBackdrop = document.getElementById('drawer-backdrop');

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

  if (btnMenuToggle) btnMenuToggle.addEventListener('click', openDrawer);
  if (btnDrawerClose) btnDrawerClose.addEventListener('click', closeDrawer);
  if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);

  // 8. ステップ切り替えボタン（メイン画面 & ドロワー両対応）
  const setupStepNavButtons = () => {
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
  };
  setupStepNavButtons();

  // 9. 理論解説アコーディオン
  const accordionHeader = document.getElementById('accordion-header');
  const accordionBody = document.getElementById('accordion-body');
  const accordionArrow = document.getElementById('accordion-arrow');

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

  // 10. ウィンドウリサイズ
  window.addEventListener('resize', () => {
    renderer.resize();
  });
});
