/**
 * 制御アルゴリズム（Step 0 〜 Step 4）
 */
class InvertedPendulumController {
  constructor() {
    this.currentStep = 0;

    // 各ステップの調整可能パラメータ
    this.params = {
      // Step 0: 自然落下（制御なし）
      step0: {},
      // Step 1: ON/OFF制御
      step1: {
        forceFixed: 10.0, // 一定の押し力 [N]
      },
      // Step 2: 比例制御 (P)
      step2: {
        kp: 18.0, // 比例ゲイン
      },
      // Step 3: PD制御
      step3: {
        kp: 25.0, // 比例ゲイン
        kd: 6.0,  // 微分ゲイン
      },
      // Step 4: 完全制御（PD + 台車位置・速度フィードバック）
      step4: {
        kp: 32.0, // 傘 比例ゲイン
        kd: 8.0,  // 傘 微分ゲイン
        lp: 4.0,  // 台車位置ゲイン
        ld: 5.5,  // 台車速度ゲイン
      },
    };
  }

  /**
   * 現在のステップ番号を設定
   * @param {number} step 0 〜 4
   */
  setStep(step) {
    this.currentStep = Math.max(0, Math.min(4, step));
  }

  /**
   * 指定ステップのパラメータを更新
   */
  updateParam(stepKey, paramName, value) {
    if (this.params[stepKey] && paramName in this.params[stepKey]) {
      this.params[stepKey][paramName] = Number(value);
    }
  }

  /**
   * 制御入力を計算
   * @param {number} x 台車位置 [m]
   * @param {number} v 台車速度 [m/s]
   * @param {number} theta 振子角度 [rad]
   * @param {number} omega 振子角速度 [rad/s]
   * @returns {number} 制御力 F [N]
   */
  computeControl(x, v, theta, omega) {
    // 振子が完全に倒れた（角度が ±90度 / ±1.57rad を超えた）場合は安全のため制御入力を停止
    if (Math.abs(theta) > Math.PI / 2) {
      return 0;
    }

    switch (this.currentStep) {
      case 0:
        // 自然落下: 力は常にゼロ
        return 0;

      case 1: {
        // ON/OFF制御: 傾いている方向に一定の力で押す
        const fFixed = this.params.step1.forceFixed;
        const deadzone = 0.005; // 微小な不感帯 [rad]
        if (theta > deadzone) {
          return fFixed;
        } else if (theta < -deadzone) {
          return -fFixed;
        }
        return 0;
      }

      case 2: {
        // 比例制御 (P): 角度に比例した力
        const kp = this.params.step2.kp;
        return kp * theta;
      }

      case 3: {
        // PD制御: 角度比例 + 倒れる速度へのブレーキ
        const kp = this.params.step3.kp;
        const kd = this.params.step3.kd;
        return kp * theta + kd * omega;
      }

      case 4: {
        // 完全制御: 振子安定化 (PD) + 台車位置復帰 (Lp*x + Ld*v)
        const kp = this.params.step4.kp;
        const kd = this.params.step4.kd;
        const lp = this.params.step4.lp;
        const ld = this.params.step4.ld;
        // 状態FB: F = kp*theta + kd*omega + lp*x + ld*v
        return kp * theta + kd * omega + lp * x + ld * v;
      }

      default:
        return 0;
    }
  }
}

window.InvertedPendulumController = InvertedPendulumController;

