/**
 * Canvas描画レンダラー（Retina対応・カメラ追従座標系・ただの長方形の台車＋先端黒丸振子）
 */
class PendulumRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // 描画パラメータ
    this.dpr = window.devicePixelRatio || 1;
    this.width = canvas.clientWidth || 400;
    this.height = canvas.clientHeight || 280;

    // カメラ位置（X方向の追従オフセット）
    this.cameraX = 0;

    // 物理座標系と画面座標系の変換
    this.pixelsPerMeter = 160;
    this.railY = 200;

    // 台車の物理寸法 [m]
    this.cartWidthM = 0.35;   // 台車の幅 [m]
    this.cartHeightM = 0.14;  // 台車の高さ [m]（ピボットの物理高さ）

    // スタイル定義
    this.colors = {
      bg: '#ffffff',
      rail: '#64748b',
      cartBody: '#1e293b',      // ただの長方形の台車
      cartBorder: '#0f172a',
      rod: '#0f172a',           // 振子ロッド
      tipBall: '#000000',       // 先端の黒い丸
      forceArrow: '#dc2626',    // 制御力矢印
      targetLine: '#cbd5e1',    // 原点 x=0 基準線
    };

    this.resize();
  }

  /**
   * キャンバスのリサイズ＆Retinaスケーリング（プレビュー環境でも絶対に0にならない安全設計）
   */
  resize() {
    const parent = this.canvas.parentElement;
    const parentRect = parent ? parent.getBoundingClientRect() : null;
    const rect = this.canvas.getBoundingClientRect();

    // 優先順位: rect -> parentRect -> clientWidth -> フォールバック
    const measuredW = rect.width || (parentRect ? parentRect.width : 0) || this.canvas.clientWidth || 400;
    const measuredH = rect.height || (parentRect ? parentRect.height : 0) || this.canvas.clientHeight || 280;

    this.width = Math.max(260, measuredW);
    this.height = Math.max(220, measuredH);
    this.dpr = window.devicePixelRatio || 1;

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(this.dpr, this.dpr);

    // レール位置はCanvas高さの約74%に配置
    this.railY = this.height * 0.74;

    // スケール計算の基準初期値
    const scaleX = (this.width * 0.85) / 2.4;
    const scaleY = (this.railY * 0.82) / 1.25;
    this.pixelsPerMeter = Math.max(60, Math.min(scaleX, scaleY));
  }

  /**
   * カメラ位置の初期化
   */
  resetCamera() {
    this.cameraX = 0;
  }

  /**
   * 物理座標 (x, y) をキャンバス座標 (px, py) に変換（カメラ追従反映）
   * レール面が y = 0
   */
  worldToCanvas(x, y) {
    const cx = this.width / 2 + (x - this.cameraX) * this.pixelsPerMeter;
    const cy = this.railY - y * this.pixelsPerMeter;
    return { x: cx, y: cy };
  }

  /**
   * キャンバス座標 (px, py) を物理座標 (x, y) に変換
   */
  canvasToWorld(px, py) {
    const x = this.cameraX + (px - this.width / 2) / this.pixelsPerMeter;
    const y = (this.railY - py) / this.pixelsPerMeter;
    return { x, y };
  }

  /**
   * 1フレームの描画
   * @param {InvertedPendulumPhysics} physics 
   */
  render(physics) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // 台車位置にカメラを滑らかに追従
    const cameraLag = 0.12;
    this.cameraX += (physics.x - this.cameraX) * cameraLag;

    // 振子の長さ（全長 2*l）に応じた動的スケール適応（設定変更時でも絶対に見切れない安全マージン）
    const pendulumLen = (physics && typeof physics.l === 'number') ? physics.l * 2 : 1.0;
    const requiredHeightM = this.cartHeightM + pendulumLen + 0.15;
    const targetScaleY = (this.railY * 0.88) / Math.max(0.5, requiredHeightM);
    const targetScaleX = (this.width * 0.85) / 2.4;
    const targetPPM = Math.max(50, Math.min(targetScaleX, targetScaleY));
    if (isFinite(targetPPM) && targetPPM > 0) {
      this.pixelsPerMeter += (targetPPM - this.pixelsPerMeter) * 0.15;
    }

    // 1. 背景クリア
    ctx.fillStyle = this.colors.bg;
    ctx.fillRect(0, 0, w, h);

    // 2. 原点 (x=0) 基準線の描画
    this.drawOriginLine();

    // 3. レールと目盛りの描画
    this.drawRail(physics.xLimit);

    // 4. 台車の物理位置と上面ピボット位置
    // レール面 y = 0、台車上面 y = cartHeightM
    const pivotWorldX = physics.x;
    const pivotWorldY = this.cartHeightM;

    // 5. 振子先端の物理座標計算（ピボットを中心に回転、全長 L = 2*l）
    const tipWorldX = pivotWorldX + pendulumLen * Math.sin(physics.theta);
    const tipWorldY = pivotWorldY + pendulumLen * Math.cos(physics.theta);

    // Canvas座標に変換
    const cartBaseCanvas = this.worldToCanvas(physics.x, 0);
    const pivotCanvas = this.worldToCanvas(pivotWorldX, pivotWorldY);
    const tipCanvas = this.worldToCanvas(tipWorldX, tipWorldY);

    // 6. 台車（ただの長方形）の描画
    this.drawCart(cartBaseCanvas.x, cartBaseCanvas.y, pivotCanvas.y);

    // 7. 倒立振子（ロッド＋先端黒丸）の描画（ピボットから先端へ）
    this.drawPendulum(pivotCanvas.x, pivotCanvas.y, tipCanvas.x, tipCanvas.y);

    // 8. 制御力ベクトルの描画 (F)
    if (Math.abs(physics.F) > 0.05) {
      this.drawForceArrow(pivotCanvas.x, pivotCanvas.y, physics.F);
    }
  }

  /**
   * 原点 x=0 の基準破線（世界座標系）
   */
  drawOriginLine() {
    const ctx = this.ctx;
    const origin = this.worldToCanvas(0, 0);

    if (origin.x >= -30 && origin.x <= this.width + 30) {
      ctx.save();
      ctx.strokeStyle = this.colors.targetLine;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(origin.x, 15);
      ctx.lineTo(origin.x, this.height - 10);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('x=0', origin.x, 26);
      ctx.restore();
    }
  }

  /**
   * レールと動的目盛りの描画
   */
  drawRail(xLimit) {
    const ctx = this.ctx;
    const y = this.railY;

    ctx.save();
    ctx.strokeStyle = this.colors.rail;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(this.width, y);
    ctx.stroke();

    const visibleHalfWidthMeters = (this.width / 2) / this.pixelsPerMeter + 0.6;
    const startM = Math.floor((this.cameraX - visibleHalfWidthMeters) / 0.5) * 0.5;
    const endM = Math.ceil((this.cameraX + visibleHalfWidthMeters) / 0.5) * 0.5;

    ctx.lineWidth = 1;
    ctx.strokeStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';

    for (let xm = startM; xm <= endM; xm += 0.5) {
      const pt = this.worldToCanvas(xm, 0);
      if (pt.x >= -30 && pt.x <= this.width + 30) {
        ctx.beginPath();
        ctx.moveTo(pt.x, y - 4);
        ctx.lineTo(pt.x, y + 4);
        ctx.stroke();
        const label = `${xm >= 0 ? '+' : ''}${xm.toFixed(1)}m`;
        ctx.fillText(label, pt.x, y + 16);
      }
    }

    ctx.restore();
  }

  /**
   * 台車の描画（車輪や装飾のない純粋な長方形）
   * @param {number} cx 台車中心X
   * @param {number} baseY レール接地Y
   * @param {number} topY 台車上面Y
   */
  drawCart(cx, baseY, topY) {
    const ctx = this.ctx;
    const cartWidthPx = this.cartWidthM * this.pixelsPerMeter;
    const cartHeightPx = baseY - topY;
    const leftX = cx - cartWidthPx / 2;

    ctx.save();
    ctx.fillStyle = this.colors.cartBody;
    ctx.strokeStyle = this.colors.cartBorder;
    ctx.lineWidth = 1.5;

    // ただの長方形
    ctx.fillRect(leftX, topY, cartWidthPx, cartHeightPx);
    ctx.strokeRect(leftX, topY, cartWidthPx, cartHeightPx);

    ctx.restore();
  }

  /**
   * 倒立振子（ロッド＋先端が黒い丸）の描画
   */
  drawPendulum(baseX, baseY, tipX, tipY) {
    const ctx = this.ctx;

    ctx.save();

    // 1. ロッド（棒）
    ctx.strokeStyle = this.colors.rod;
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    // 2. 先端が黒い丸（質点ボール）
    const tipRadius = 9;
    ctx.fillStyle = this.colors.tipBall;
    ctx.beginPath();
    ctx.arc(tipX, tipY, tipRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * 制御力矢印の描画
   */
  drawForceArrow(cx, cy, force) {
    const ctx = this.ctx;
    const maxArrowLen = 65;
    const arrowLen = Math.sign(force) * Math.min(Math.abs(force) * 2.2, maxArrowLen);

    if (Math.abs(arrowLen) < 4) return;

    const startX = cx;
    const startY = cy;
    const endX = cx + arrowLen;
    const arrowHeadSize = 5;
    const dir = Math.sign(arrowLen);

    ctx.save();
    ctx.strokeStyle = this.colors.forceArrow;
    ctx.fillStyle = this.colors.forceArrow;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, startY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(endX, startY);
    ctx.lineTo(endX - dir * arrowHeadSize, startY - arrowHeadSize);
    ctx.lineTo(endX - dir * arrowHeadSize, startY + arrowHeadSize);
    ctx.closePath();
    ctx.fill();

    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.abs(force).toFixed(1)}N`, cx + arrowLen / 2, startY - 7);

    ctx.restore();
  }
}

window.PendulumRenderer = PendulumRenderer;
