import React, { useState, useRef } from 'react';
import { useRobotStore } from '../../state/robotStore';
import type { JointDefinition, JointType, LinkDefinition, RobotDefinition } from '../../data/schema/robotSchema';
import { Info, Copy, Check, FileSpreadsheet, Code, Plus, Trash2, ArrowUpDown } from 'lucide-react';
import { RAD_TO_DEG, DEG_TO_RAD } from '../../robotics/math/constants';

type EditableField = 'theta' | 'd' | 'a' | 'alpha' | 'offset' | 'min' | 'max';

export const DHTableStudio: React.FC = () => {
  const { robot, q, setRobot } = useRobotStore();
  const [useSI, setUseSI] = useState(false); // Default to RoboAnalyzer deg/mm display
  const [copiedType, setCopiedType] = useState<'csv' | 'latex' | 'json' | null>(null);

  // Draft inputs and error tracking: key is `${jointIndex}_${field}`
  const [cellDrafts, setCellDrafts] = useState<Record<string, string>>({});
  const [cellErrors, setCellErrors] = useState<Record<string, boolean>>({});
  const cancelledKeysRef = useRef<Set<string>>(new Set());

  const isStandard = robot.dhConvention === 'standard';

  const copyFeedback = (type: 'csv' | 'latex' | 'json') => {
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 1800);
  };

  // 1. Export Handlers
  const handleCopyCSV = () => {
    const headers = ['Joint', 'Type', 'theta', 'd', 'a', 'alpha', 'offset', 'min_limit', 'max_limit'];
    const rows = robot.joints.map((j, idx) => {
      const isRevolute = j.type === 'revolute';
      const curQ = q[idx] ?? 0;
      const th = isRevolute ? (useSI ? curQ : curQ * RAD_TO_DEG) : (useSI ? j.theta : j.theta * RAD_TO_DEG);
      const d = !isRevolute ? (useSI ? curQ : curQ * 1000) : (useSI ? j.d : j.d * 1000);
      const a = useSI ? j.a : j.a * 1000;
      const al = useSI ? j.alpha : j.alpha * RAD_TO_DEG;
      const off = isRevolute ? (useSI ? j.offset : j.offset * RAD_TO_DEG) : (useSI ? j.offset : j.offset * 1000);
      const min = useSI ? j.min : isRevolute ? j.min * RAD_TO_DEG : j.min * 1000;
      const max = useSI ? j.max : isRevolute ? j.max * RAD_TO_DEG : j.max * 1000;
      return [
        j.name,
        j.type,
        th.toFixed(3),
        d.toFixed(3),
        a.toFixed(3),
        al.toFixed(3),
        off.toFixed(3),
        min.toFixed(1),
        max.toFixed(1),
      ].join(',');
    });
    navigator.clipboard.writeText([headers.join(','), ...rows].join('\n'));
    copyFeedback('csv');
  };

  const handleCopyLaTeX = () => {
    const rows = robot.joints.map((j, idx) => {
      const isRevolute = j.type === 'revolute';
      const curQ = q[idx] ?? 0;
      const th = isRevolute ? (useSI ? curQ : curQ * RAD_TO_DEG) : (useSI ? j.theta : j.theta * RAD_TO_DEG);
      const d = !isRevolute ? (useSI ? curQ : curQ * 1000) : (useSI ? j.d : j.d * 1000);
      const a = useSI ? j.a : j.a * 1000;
      const al = useSI ? j.alpha : j.alpha * RAD_TO_DEG;
      return `${idx + 1} & ${th.toFixed(2)} & ${d.toFixed(2)} & ${a.toFixed(2)} & ${al.toFixed(2)} \\\\`;
    });
    const latex = `\\begin{table}[h]\n\\centering\n\\begin{tabular}{c c c c c}\n\\hline\nJoint & $\\theta_i$ & $d_i$ & $a_i$ & $\\alpha_i$ \\\\\n\\hline\n${rows.join('\n')}\n\\hline\n\\end{tabular}\n\\caption{DH Parameters for ${robot.name}}\n\\end{table}`;
    navigator.clipboard.writeText(latex);
    copyFeedback('latex');
  };

  const handleCopyJSON = () => {
    const data = robot.joints.map((j, idx) => ({
      index: idx + 1,
      name: j.name,
      type: j.type,
      theta: j.theta,
      d: j.d,
      a: j.a,
      alpha: j.alpha,
      offset: j.offset,
      min: j.min,
      max: j.max,
      q_current: q[idx] ?? 0,
    }));
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    copyFeedback('json');
  };

  // 2. Unit display conversions
  const getDisplayValue = (joint: JointDefinition, field: EditableField): string => {
    const isRev = joint.type === 'revolute';
    switch (field) {
      case 'theta':
        return useSI ? joint.theta.toFixed(4) : (joint.theta * RAD_TO_DEG).toFixed(2);
      case 'd':
        return useSI ? joint.d.toFixed(4) : (joint.d * 1000).toFixed(1);
      case 'a':
        return useSI ? joint.a.toFixed(4) : (joint.a * 1000).toFixed(1);
      case 'alpha':
        return useSI ? joint.alpha.toFixed(4) : (joint.alpha * RAD_TO_DEG).toFixed(2);
      case 'offset':
        return isRev
          ? (useSI ? joint.offset.toFixed(4) : (joint.offset * RAD_TO_DEG).toFixed(2))
          : (useSI ? joint.offset.toFixed(4) : (joint.offset * 1000).toFixed(1));
      case 'min':
        return isRev
          ? (useSI ? joint.min.toFixed(4) : (joint.min * RAD_TO_DEG).toFixed(1))
          : (useSI ? joint.min.toFixed(4) : (joint.min * 1000).toFixed(1));
      case 'max':
        return isRev
          ? (useSI ? joint.max.toFixed(4) : (joint.max * RAD_TO_DEG).toFixed(1))
          : (useSI ? joint.max.toFixed(4) : (joint.max * 1000).toFixed(1));
    }
  };

  const convertDisplayToSI = (val: number, joint: JointDefinition, field: EditableField): number => {
    const isRev = joint.type === 'revolute';
    if (useSI) return val;

    switch (field) {
      case 'theta':
      case 'alpha':
        return val * DEG_TO_RAD;
      case 'd':
      case 'a':
        return val / 1000;
      case 'offset':
      case 'min':
      case 'max':
        return isRev ? val * DEG_TO_RAD : val / 1000;
    }
  };

  // 3. Validation Logic (reject NaN, reject alpha outside ±2π, reject limits where min > max)
  const validateField = (
    valStr: string,
    joint: JointDefinition,
    field: EditableField
  ): { isValid: boolean; siValue: number } => {
    if (valStr.trim() === '') {
      return { isValid: false, siValue: 0 };
    }
    const num = parseFloat(valStr);
    if (!Number.isFinite(num)) {
      return { isValid: false, siValue: 0 };
    }

    const siVal = convertDisplayToSI(num, joint, field);

    // Alpha check: outside ±2π
    if (field === 'alpha') {
      const limit = 2 * Math.PI + 1e-6;
      if (siVal < -limit || siVal > limit) {
        return { isValid: false, siValue: siVal };
      }
    }

    // Limit check: min > max
    if (field === 'min') {
      if (siVal > joint.max) {
        return { isValid: false, siValue: siVal };
      }
    }
    if (field === 'max') {
      if (siVal < joint.min) {
        return { isValid: false, siValue: siVal };
      }
    }

    return { isValid: true, siValue: siVal };
  };

  // 4. Commit cell value to store
  const commitCell = (jointIdx: number, field: EditableField) => {
    const key = `${jointIdx}_${field}`;
    if (cancelledKeysRef.current.has(key)) {
      cancelledKeysRef.current.delete(key);
      return;
    }

    const draftVal = cellDrafts[key];
    if (draftVal === undefined) return;

    const joint = robot.joints[jointIdx];
    if (!joint) return;

    const { isValid, siValue } = validateField(draftVal, joint, field);

    if (!isValid) {
      setCellErrors((prev) => ({ ...prev, [key]: true }));
      return;
    }

    // Clear draft and error
    setCellDrafts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setCellErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    // Update joint definition and propagate through setRobot
    const updatedJoints = robot.joints.map((j, idx) => {
      if (idx !== jointIdx) return j;
      const updated = { ...j, [field]: siValue };
      // Keep home within min/max
      if (field === 'min' || field === 'max') {
        updated.home = Math.max(updated.min, Math.min(updated.max, updated.home));
      }
      return updated;
    });

    const updatedRobot: RobotDefinition = {
      ...robot,
      joints: updatedJoints,
    };

    setRobot(updatedRobot);
  };

  const handleCellChange = (jointIdx: number, field: EditableField, value: string) => {
    const key = `${jointIdx}_${field}`;
    cancelledKeysRef.current.delete(key);
    setCellDrafts((prev) => ({ ...prev, [key]: value }));

    const joint = robot.joints[jointIdx];
    if (joint) {
      const { isValid } = validateField(value, joint, field);
      setCellErrors((prev) => ({ ...prev, [key]: !isValid }));
    }
  };

  const handleCellKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, jointIdx: number, field: EditableField) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      const key = `${jointIdx}_${field}`;
      cancelledKeysRef.current.add(key);
      const joint = robot.joints[jointIdx];
      if (joint) {
        e.currentTarget.value = getDisplayValue(joint, field);
      }
      setCellDrafts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setCellErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      e.currentTarget.blur();
    }
  };

  // 5. Joint Type Selection
  const handleTypeChange = (jointIdx: number, newType: JointType) => {
    const updatedJoints = robot.joints.map((j, idx) => {
      if (idx !== jointIdx) return j;
      // When switching to prismatic, assign typical default limits in meters
      const isPrismatic = newType === 'prismatic';
      return {
        ...j,
        type: newType,
        min: isPrismatic ? 0 : -Math.PI,
        max: isPrismatic ? 0.5 : Math.PI,
        home: isPrismatic ? 0.1 : 0,
      };
    });

    const updatedRobot: RobotDefinition = {
      ...robot,
      joints: updatedJoints,
    };
    setRobot(updatedRobot);
  };

  // 6. Add / Remove Joints
  const handleAddJoint = () => {
    const newIdx = robot.joints.length;
    const newJoint: JointDefinition = {
      id: `${robot.id}_joint${newIdx + 1}`,
      name: `Joint ${newIdx + 1}`,
      index: newIdx,
      type: 'revolute',
      theta: 0,
      d: 0,
      a: 0.1,
      alpha: 0,
      offset: 0,
      min: -Math.PI,
      max: Math.PI,
      home: 0,
    };

    const newLink: LinkDefinition = {
      id: `${robot.id}_link${newIdx + 1}`,
      name: `Link ${newIdx + 1}`,
      index: newIdx + 1,
    };

    const updatedRobot: RobotDefinition = {
      ...robot,
      dof: robot.joints.length + 1,
      joints: [...robot.joints, newJoint],
      links: [...robot.links, newLink],
    };

    setRobot(updatedRobot);
  };

  const handleRemoveLastJoint = () => {
    if (robot.joints.length <= 1) return;

    const updatedJoints = robot.joints.slice(0, -1);
    const keepLinksCount = robot.links.length > robot.joints.length ? updatedJoints.length + 1 : updatedJoints.length;
    const updatedLinks = robot.links.slice(0, Math.max(1, keepLinksCount));

    const updatedRobot: RobotDefinition = {
      ...robot,
      dof: updatedJoints.length,
      joints: updatedJoints,
      links: updatedLinks,
    };

    setRobot(updatedRobot);
  };

  // 7. Toggle DH Convention (Standard <-> Modified)
  const handleToggleConvention = () => {
    const nextConvention = robot.dhConvention === 'standard' ? 'modified' : 'standard';
    const updatedRobot: RobotDefinition = {
      ...robot,
      dhConvention: nextConvention,
    };
    setRobot(updatedRobot);
  };

  return (
    <div className="flex flex-col h-full bg-[#faf8f5] text-black p-5 overflow-y-auto select-none space-y-4">
      {/* Studio Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-stone-200">
        {/* Convention & Units & Add/Remove Joint Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Clickable Convention Badge */}
          <button
            onClick={handleToggleConvention}
            title="Click to toggle between Standard and Modified (Craig) DH conventions"
            aria-label="Toggle DH Convention"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-xl bg-amber-100 hover:bg-amber-200 text-black border border-amber-300 shadow-2xs transition-all cursor-pointer active:scale-95"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-800" />
            <span>{isStandard ? 'Standard DH' : 'Modified DH (Craig)'}</span>
          </button>

          {/* Unit Toggle */}
          <div className="flex items-center bg-white p-1 rounded-xl border border-stone-300 text-xs">
            <button
              onClick={() => {
                setUseSI(false);
                setCellDrafts({});
                setCellErrors({});
              }}
              aria-label="Display units in degrees and millimeters"
              className={`px-3 py-1 rounded-lg font-black transition-all cursor-pointer ${
                !useSI ? 'bg-amber-400 text-black shadow-xs' : 'text-black hover:bg-stone-100'
              }`}
            >
              deg / mm
            </button>
            <button
              onClick={() => {
                setUseSI(true);
                setCellDrafts({});
                setCellErrors({});
              }}
              aria-label="Display units in radians and meters"
              className={`px-3 py-1 rounded-lg font-black transition-all cursor-pointer ${
                useSI ? 'bg-amber-400 text-black shadow-xs' : 'text-black hover:bg-stone-100'
              }`}
            >
              rad / m
            </button>
          </div>

          {/* Add Joint Button */}
          <button
            onClick={handleAddJoint}
            title="Add a new joint to the kinematic chain"
            aria-label="Add Joint"
            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border border-emerald-300 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-800" />
            <span>Add Joint</span>
          </button>

          {/* Remove Last Joint Button */}
          <button
            onClick={handleRemoveLastJoint}
            disabled={robot.joints.length <= 1}
            title="Remove the last joint from the kinematic chain"
            aria-label="Remove Last Joint"
            className="flex items-center gap-1 px-3 py-1.5 bg-rose-100 hover:bg-rose-200 disabled:opacity-40 disabled:pointer-events-none text-rose-950 border border-rose-300 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-800" />
            <span>Remove Last Joint</span>
          </button>
        </div>

        {/* Export Toolbar Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyCSV}
            aria-label="Copy DH parameters table as CSV"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-stone-100 border-2 border-stone-300 rounded-xl text-xs font-black text-black transition-all cursor-pointer shadow-xs active:scale-95"
          >
            {copiedType === 'csv' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <FileSpreadsheet className="w-3.5 h-3.5 text-black" />}
            <span>{copiedType === 'csv' ? 'Copied!' : 'Copy CSV'}</span>
          </button>
          <button
            onClick={handleCopyLaTeX}
            aria-label="Copy DH parameters table as LaTeX"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-stone-100 border-2 border-stone-300 rounded-xl text-xs font-black text-black transition-all cursor-pointer shadow-xs active:scale-95"
          >
            {copiedType === 'latex' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Code className="w-3.5 h-3.5 text-black" />}
            <span>{copiedType === 'latex' ? 'Copied!' : 'Copy LaTeX'}</span>
          </button>
          <button
            onClick={handleCopyJSON}
            aria-label="Copy DH parameters table as JSON"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-stone-100 border-2 border-stone-300 rounded-xl text-xs font-black text-black transition-all cursor-pointer shadow-xs active:scale-95"
          >
            {copiedType === 'json' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-black" />}
            <span>{copiedType === 'json' ? 'Copied!' : 'Copy JSON'}</span>
          </button>
        </div>
      </div>

      {/* Formula Explanation Alert */}
      <div className="flex items-start gap-3 p-4 bg-white border-2 border-stone-200 rounded-2xl text-xs text-black shadow-sm">
        <Info className="w-4 h-4 text-black shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-black uppercase tracking-wide">Transformation Formulation:</span>
            {isStandard ? (
              <code className="text-black font-mono font-bold bg-stone-100 px-2.5 py-0.5 rounded-lg border border-stone-300">
                A_i = Rot_Z(θ_i) · Trans_Z(d_i) · Trans_X(a_i) · Rot_X(α_i)
              </code>
            ) : (
              <code className="text-black font-mono font-bold bg-stone-100 px-2.5 py-0.5 rounded-lg border border-stone-300">
                A_i = Rot_X(α_(i-1)) · Trans_X(a_(i-1)) · Rot_Z(θ_i) · Trans_Z(d_i)
              </code>
            )}
          </div>
          <div className="text-stone-700 text-[11px] mt-1.5 font-medium">
            Edit any cell value and press <kbd className="px-1 py-0.5 font-mono bg-stone-200 rounded text-[10px]">Enter</kbd> or blur to update. Gold cells indicate active generalized coordinates (q_i) driven by sliders/IK.
          </div>
        </div>
      </div>

      {/* DH Parameter Table */}
      <div className="overflow-x-auto rounded-2xl border-2 border-stone-200 bg-white shadow-sm">
        <table className="w-full text-left text-xs border-collapse font-mono">
          <thead>
            <tr className="bg-stone-100 border-b-2 border-stone-200 text-black font-sans">
              <th className="py-3 px-3.5 font-black whitespace-nowrap">Joint</th>
              <th className="py-3 px-3.5 font-black whitespace-nowrap">Type</th>
              <th className="py-3 px-3.5 font-black text-right whitespace-nowrap bg-amber-50 border-x border-amber-200">
                q_i (Active)
              </th>
              <th className="py-3 px-3.5 font-black text-right whitespace-nowrap">
                θ_i ({useSI ? 'rad' : '°'})
              </th>
              <th className="py-3 px-3.5 font-black text-right whitespace-nowrap">
                d_i ({useSI ? 'm' : 'mm'})
              </th>
              <th className="py-3 px-3.5 font-black text-right whitespace-nowrap">
                a_i ({useSI ? 'm' : 'mm'})
              </th>
              <th className="py-3 px-3.5 font-black text-right whitespace-nowrap">
                α_i ({useSI ? 'rad' : '°'})
              </th>
              <th className="py-3 px-3.5 font-black text-right whitespace-nowrap">
                Offset ({useSI ? 'rad/m' : '°/mm'})
              </th>
              <th className="py-3 px-3.5 font-black text-right whitespace-nowrap">
                Min ({useSI ? 'rad/m' : '°/mm'})
              </th>
              <th className="py-3 px-3.5 font-black text-right whitespace-nowrap">
                Max ({useSI ? 'rad/m' : '°/mm'})
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {robot.joints.map((joint, idx) => {
              const isRevolute = joint.type === 'revolute';
              const currentQ = q[idx] ?? 0;

              // Read-only active generalized coordinate q_i
              const activeQDisp = isRevolute
                ? (useSI ? currentQ.toFixed(4) + ' rad' : (currentQ * RAD_TO_DEG).toFixed(2) + '°')
                : (useSI ? currentQ.toFixed(4) + ' m' : (currentQ * 1000).toFixed(1) + ' mm');

              const renderEditableCell = (field: EditableField, step: string = 'any') => {
                const key = `${idx}_${field}`;
                const val = cellDrafts[key] ?? getDisplayValue(joint, field);
                const isError = !!cellErrors[key];

                return (
                  <td key={field} className="py-2 px-2 text-right">
                    <input
                      type="number"
                      step={step}
                      value={val}
                      onChange={(e) => handleCellChange(idx, field, e.target.value)}
                      onBlur={() => commitCell(idx, field)}
                      onKeyDown={(e) => handleCellKeyDown(e, idx, field)}
                      aria-label={`Joint ${idx + 1} ${field}`}
                      className={`w-20 px-2 py-1 text-right font-mono text-xs font-bold rounded-lg border transition-all ${
                        isError
                          ? 'border-red-500 bg-red-50 text-red-900 ring-1 ring-red-500'
                          : 'border-stone-300 bg-stone-50 text-black focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-400'
                      }`}
                    />
                  </td>
                );
              };

              return (
                <tr key={joint.id} className="hover:bg-stone-50 transition-colors">
                  {/* Joint Name */}
                  <td className="py-3 px-3.5 font-black text-black font-sans whitespace-nowrap">
                    {joint.name}
                  </td>

                  {/* Joint Type Dropdown */}
                  <td className="py-2 px-3">
                    <select
                      value={joint.type}
                      onChange={(e) => handleTypeChange(idx, e.target.value as JointType)}
                      aria-label={`Joint ${idx + 1} type`}
                      className={`text-xs font-black px-2 py-1 rounded-lg border cursor-pointer font-sans transition-colors ${
                        isRevolute
                          ? 'bg-amber-100 text-black border-amber-300 hover:bg-amber-200'
                          : 'bg-emerald-100 text-black border-emerald-300 hover:bg-emerald-200'
                      }`}
                    >
                      <option value="revolute">Revolute (R)</option>
                      <option value="prismatic">Prismatic (P)</option>
                    </select>
                  </td>

                  {/* q_i (Read-Only Highlighted Column) */}
                  <td className="py-2 px-3 text-right font-black text-amber-950 bg-amber-100/70 border-x border-amber-200 whitespace-nowrap font-mono">
                    {activeQDisp}
                  </td>

                  {/* Editable DH Parameters */}
                  {renderEditableCell('theta')}
                  {renderEditableCell('d')}
                  {renderEditableCell('a')}
                  {renderEditableCell('alpha')}
                  {renderEditableCell('offset')}
                  {renderEditableCell('min')}
                  {renderEditableCell('max')}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
