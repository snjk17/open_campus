/**
 * 倒立振子の物理モデル（非線形運動方程式 + RK4数値積分）
 */
class InvertedPendulumPhysics {
  constructor(options = {}) {
    // 物理パラメータ
    this.M = options.M ?? 1.0;          // 台車質量 [kg]
    this.m = options.m ?? 0.15;         // 振子質量 [kg]
    this.l = options.l ?? 0.5;          // 振子重心長 [m]（全長 L = 2*l = 1.0m）
    this.g = options.g ?? 9.81;         // 重力加速度 [m/s^2]
    this.bc = options.bc ?? 0.1;        // 台車摩擦係数 [N*s/m]
    this.bp = options.bp ?? 0.005;      // 振子軸摩擦係数 [N*m*s/rad]
    this.xLimit = options.xLimit ?? 8.0;// 台車の可動半幅 [m]
    this.theta0 = options.theta0 ?? (15 * Math.PI) / 180; // 初期傾き角 [rad]（初期値15°）

    // 状態変数
    this.x = 0;                         // 台車位置 [m]
    this.v = 0;                         // 台車速度 [m/s]
    this.theta = this.theta0;           // 振子角度 [rad]（鉛直上向き0、時計回り正）
    this.omega = 0;                     // 振子角速度 [rad/s]

    // 制御入力
    this.F = 0;                         // 台車に加える制御力 [N]
    this.maxForce = options.maxForce ?? 40.0; // 力の飽和上限 [N]
  }

  /**
   * 振子の全長 L [m]（重心長 l = L / 2 と連動）
   */
  get L() {
    return this.l * 2;
  }

  set L(value) {
    this.l = value / 2;
  }

  /**
   * 状態を初期化
   * @param {number} theta0 初期角度 [rad]
   * @param {number} x0 初期台車位置 [m]
   */
  reset(theta0 = this.theta0, x0 = 0) {
    this.x = x0;
    this.v = 0;
    this.theta = theta0;
    this.omega = 0;
    this.F = 0;
  }

  /**
   * 倒立振子の非線形運動方程式から加速度 [ddot(x), ddot(theta)] を計算
   */
  derivatives(x, v, theta, omega, F) {
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);
    const sin2T = sinT * sinT;

    const M = this.M;
    const m = this.m;
    const l = this.l;
    const g = this.g;

    const denom = M + m * sin2T;

    const frictionCart = this.bc * v;
    const frictionPend = this.bp * omega;

    const numeratorX = (F - frictionCart)
      + m * l * omega * omega * sinT
      - m * g * sinT * cosT
      + (frictionPend * cosT) / l;
    const ax = numeratorX / denom;

    const numeratorTheta = (M + m) * g * sinT
      - (F - frictionCart) * cosT
      - m * l * omega * omega * sinT * cosT
      - ((M + m) * frictionPend) / (m * l);
    const alpha = numeratorTheta / (l * denom);

    return { ax, alpha };
  }

  /**
   * ルンゲ＝クッタ4次法（RK4）による数値積分
   */
  integrateRK4(dt, controlForce) {
    let F = Math.max(-this.maxForce, Math.min(this.maxForce, controlForce));
    this.F = F;

    const x0 = this.x;
    const v0 = this.v;
    const t0 = this.theta;
    const w0 = this.omega;

    // k1
    const d1 = this.derivatives(x0, v0, t0, w0, F);
    const k1_x = v0;
    const k1_v = d1.ax;
    const k1_theta = w0;
    const k1_omega = d1.alpha;

    // k2
    const x1 = x0 + 0.5 * dt * k1_x;
    const v1 = v0 + 0.5 * dt * k1_v;
    const t1 = t0 + 0.5 * dt * k1_theta;
    const w1 = w0 + 0.5 * dt * k1_omega;
    const d2 = this.derivatives(x1, v1, t1, w1, F);
    const k2_x = v1;
    const k2_v = d2.ax;
    const k2_theta = w1;
    const k2_omega = d2.alpha;

    // k3
    const x2 = x0 + 0.5 * dt * k2_x;
    const v2 = v0 + 0.5 * dt * k2_v;
    const t2 = t0 + 0.5 * dt * k2_theta;
    const w2 = w0 + 0.5 * dt * k2_omega;
    const d3 = this.derivatives(x2, v2, t2, w2, F);
    const k3_x = v2;
    const k3_v = d3.ax;
    const k3_theta = w2;
    const k3_omega = d3.alpha;

    // k4
    const x3 = x0 + dt * k3_x;
    const v3 = v0 + dt * k3_v;
    const t3 = t0 + dt * k3_theta;
    const w3 = w0 + dt * k3_omega;
    const d4 = this.derivatives(x3, v3, t3, w3, F);
    const k4_x = v3;
    const k4_v = d4.ax;
    const k4_theta = w3;
    const k4_omega = d4.alpha;

    this.x += (dt / 6) * (k1_x + 2 * k2_x + 2 * k3_x + k4_x);
    this.v += (dt / 6) * (k1_v + 2 * k2_v + 2 * k3_v + k4_v);
    this.theta += (dt / 6) * (k1_theta + 2 * k2_theta + 2 * k3_theta + k4_theta);
    this.omega += (dt / 6) * (k1_omega + 2 * k2_omega + 2 * k3_omega + k4_omega);

    this.normalizeAngle();

    if (Math.abs(this.x) > this.xLimit) {
      this.x = Math.sign(this.x) * this.xLimit;
      this.v = -this.v * 0.2;
    }
  }

  normalizeAngle() {
    while (this.theta > Math.PI) this.theta -= 2 * Math.PI;
    while (this.theta < -Math.PI) this.theta += 2 * Math.PI;
  }

  update(totalDt, controllerFn) {
    const subSteps = 4;
    const dt = totalDt / subSteps;
    for (let i = 0; i < subSteps; i++) {
      const u = controllerFn(this.x, this.v, this.theta, this.omega);
      this.integrateRK4(dt, u);
    }
  }

  applyImpulse(deltaOmega = 0, deltaV = 0) {
    this.omega += deltaOmega;
    this.v += deltaV;
  }
}

window.InvertedPendulumPhysics = InvertedPendulumPhysics;
