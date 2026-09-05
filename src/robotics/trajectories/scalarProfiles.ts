import type { TrajectoryProfile } from './types';

export interface ScalarEvaluation {
  s: number; // [0, 1]
  sDot: number; // 1/s
  sDdot: number; // 1/s^2
}

/**
 * Evaluate normalized scalar trajectory law s(t) in [0, 1] for t in [0, T].
 */
export function evaluateScalarProfile(
  t: number,
  T: number,
  profile: TrajectoryProfile = 'quintic'
): ScalarEvaluation {
  if (T <= 0) {
    return { s: 1, sDot: 0, sDdot: 0 };
  }

  const clampedT = Math.max(0, Math.min(T, t));
  const tau = clampedT / T;

  switch (profile) {
    case 'cubic': {
      // s(tau) = 3*tau^2 - 2*tau^3
      const tau2 = tau * tau;
      const tau3 = tau2 * tau;
      const s = 3 * tau2 - 2 * tau3;
      const sDot = (6 * tau - 6 * tau2) / T;
      const sDdot = (6 - 12 * tau) / (T * T);
      return { s, sDot, sDdot };
    }

    case 'trapezoidal': {
      // LSPB with blend time tb = T / 3
      const tb = T / 3;
      const vmax = 1.0 / (T - tb); // 1.5 / T
      const a = vmax / tb; // 4.5 / (T^2)

      if (clampedT <= tb) {
        // Accel phase
        const s = 0.5 * a * clampedT * clampedT;
        const sDot = a * clampedT;
        const sDdot = a;
        return { s, sDot, sDdot };
      } else if (clampedT <= T - tb) {
        // Constant velocity phase
        const s = 0.5 * a * tb * tb + vmax * (clampedT - tb);
        const sDot = vmax;
        const sDdot = 0;
        return { s, sDot, sDdot };
      } else {
        // Decel phase
        const tr = T - clampedT;
        const s = 1.0 - 0.5 * a * tr * tr;
        const sDot = a * tr;
        const sDdot = -a;
        return { s, sDot, sDdot };
      }
    }

    case 'quintic':
    default: {
      // s(tau) = 10*tau^3 - 15*tau^4 + 6*tau^5
      const tau2 = tau * tau;
      const tau3 = tau2 * tau;
      const tau4 = tau3 * tau;
      const tau5 = tau4 * tau;

      const s = 10 * tau3 - 15 * tau4 + 6 * tau5;
      const sDot = (30 * tau2 - 60 * tau3 + 30 * tau4) / T;
      const sDdot = (60 * tau - 180 * tau2 + 120 * tau3) / (T * T);
      return { s, sDot, sDdot };
    }
  }
}
