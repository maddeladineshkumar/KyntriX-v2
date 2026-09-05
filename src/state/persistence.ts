import type { ViewOptions } from './robotStore';
import type { RobotDefinition } from '../data/schema/robotSchema';

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
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
