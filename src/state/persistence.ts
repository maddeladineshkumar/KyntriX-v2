import type { ViewOptions } from './robotStore';
import type { RobotDefinition } from '../data/schema/robotSchema';
import { Matrix4 } from '../robotics/math/Matrix4';

const SETTINGS_KEY = 'roboanalyzer_user_settings';
const CUSTOM_ROBOTS_KEY = 'roboanalyzer_custom_robots';

export interface UserSettings {
  selectedRobotId?: string;
  viewOptions?: Partial<ViewOptions>;
}

export function saveSettings(settings: Partial<UserSettings>): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const current = loadSettings() || {};
    const merged = { ...current, ...settings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
  } catch (err) {
    console.warn('Failed to save settings to localStorage:', err);
  }
}

export function loadSettings(): Partial<UserSettings> | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCustomRobot(robot: RobotDefinition): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const existing = loadCustomRobots();
    existing[robot.id] = robot;
    localStorage.setItem(CUSTOM_ROBOTS_KEY, JSON.stringify(existing));
  } catch (err) {
    console.warn('Failed to save custom robot to localStorage:', err);
  }
}

export function loadCustomRobots(): Record<string, RobotDefinition> {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(CUSTOM_ROBOTS_KEY);
    if (!raw) return {};
    const parsed: Record<string, RobotDefinition> = JSON.parse(raw);
    for (const id of Object.keys(parsed)) {
      const r = parsed[id];
      if (r.baseTransform && !(r.baseTransform instanceof Matrix4)) {
        const elems = (r.baseTransform as any).elements ?? r.baseTransform;
        r.baseTransform = Matrix4.fromArray(Array.isArray(elems) ? elems : Array.from(elems));
      }
      if (r.endEffectorOffset && !(r.endEffectorOffset instanceof Matrix4)) {
        const elems = (r.endEffectorOffset as any).elements ?? r.endEffectorOffset;
        r.endEffectorOffset = Matrix4.fromArray(Array.isArray(elems) ? elems : Array.from(elems));
      }
    }
    return parsed;
  } catch {
    return {};
  }
}
