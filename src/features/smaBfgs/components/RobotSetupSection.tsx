import type { RobotDefinition } from '../../../data/schema/robotSchema';
import { RAD_TO_DEG } from '../../../robotics/math/constants';
import { Bot } from 'lucide-react';

interface RobotSetupSectionProps {
  robot: RobotDefinition;
  onSelectRobot?: (robotId: string) => void;
  availableRobots?: { id: string; name: string }[];
}

export const RobotSetupSection: React.FC<RobotSetupSectionProps> = ({
  robot,
  onSelectRobot,
  availableRobots = [],
}) => {
  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider">
              1. Active Robot Architecture
            </h3>
            <p className="text-xs text-stone-500 font-medium">
              {robot.name} ({robot.dof}-DOF serial chain, {robot.dhConvention.toUpperCase()} DH)
            </p>
          </div>
        </div>

        {availableRobots.length > 0 && onSelectRobot && (
          <div className="flex items-center gap-2">
            <label htmlFor="robot-select" className="text-xs font-bold text-stone-600 shrink-0">
              Switch Model:
            </label>
            <select
              id="robot-select"
              value={robot.id}
              onChange={(e) => onSelectRobot(e.target.value)}
              className="text-xs font-bold bg-stone-50 border border-stone-300 rounded-xl px-2.5 py-1.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              {availableRobots.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Model summary badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200/80">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">DOF</span>
          <span className="text-sm font-black text-stone-900">{robot.dof} Degrees of Freedom</span>
        </div>
        <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200/80">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">DH Convention</span>
          <span className="text-sm font-black text-amber-800 capitalize">{robot.dhConvention} DH</span>
        </div>
        <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200/80">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Joint Types</span>
          <span className="text-sm font-black text-stone-900">
            {robot.joints.every((j) => j.type === 'revolute')
              ? 'All Revolute (R)'
              : robot.joints.map((j) => (j.type === 'revolute' ? 'R' : 'P')).join('')}
          </span>
        </div>
        <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200/80">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Wrist Topology</span>
          <span className="text-sm font-black text-stone-900">
            {robot.dof >= 6 ? 'Spherical Wrist 6R' : 'Planar / Articulated'}
          </span>
        </div>
      </div>

      {/* DH Kinematic Table */}
      <div className="overflow-x-auto rounded-xl border border-stone-200">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-stone-100 text-stone-700 uppercase tracking-wider text-[10px] border-b border-stone-200">
            <tr>
              <th className="px-3 py-2 font-black">Joint</th>
              <th className="px-3 py-2 font-black">Type</th>
              <th className="px-3 py-2 font-black">θ (rad / °)</th>
              <th className="px-3 py-2 font-black">d (m)</th>
              <th className="px-3 py-2 font-black">a (m)</th>
              <th className="px-3 py-2 font-black">α (rad / °)</th>
              <th className="px-3 py-2 font-black">Lower Bound</th>
              <th className="px-3 py-2 font-black">Upper Bound</th>
              <th className="px-3 py-2 font-black">Home</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 bg-white">
            {robot.joints.map((joint, idx) => {
              const isRev = joint.type === 'revolute';
              return (
                <tr key={joint.id || idx} className="hover:bg-amber-50/40 transition-colors">
                  <td className="px-3 py-2 font-bold text-stone-900 whitespace-nowrap">
                    J{idx + 1} ({joint.name})
                  </td>
                  <td className="px-3 py-2 uppercase font-bold text-[11px] text-amber-700">
                    {joint.type}
                  </td>
                  <td className="px-3 py-2 text-stone-700">
                    {joint.theta.toFixed(3)} ({((joint.theta * RAD_TO_DEG) % 360).toFixed(1)}°)
                  </td>
                  <td className="px-3 py-2 text-stone-700">{joint.d.toFixed(3)}</td>
                  <td className="px-3 py-2 text-stone-700">{joint.a.toFixed(3)}</td>
                  <td className="px-3 py-2 text-stone-700">
                    {joint.alpha.toFixed(3)} ({((joint.alpha * RAD_TO_DEG) % 360).toFixed(1)}°)
                  </td>
                  <td className="px-3 py-2 text-stone-600 font-bold">
                    {isRev ? `${(joint.min * RAD_TO_DEG).toFixed(1)}°` : `${joint.min.toFixed(3)} m`}
                  </td>
                  <td className="px-3 py-2 text-stone-600 font-bold">
                    {isRev ? `${(joint.max * RAD_TO_DEG).toFixed(1)}°` : `${joint.max.toFixed(3)} m`}
                  </td>
                  <td className="px-3 py-2 text-emerald-700 font-black">
                    {isRev ? `${((joint.home ?? 0) * RAD_TO_DEG).toFixed(1)}°` : `${(joint.home ?? 0).toFixed(3)} m`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
