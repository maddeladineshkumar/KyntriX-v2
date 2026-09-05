import React, { useState, useRef } from 'react';
import { useRobotStore } from '../../state/robotStore';
import type { RobotDefinition, JointDefinition, DHConvention } from '../../data/schema/robotSchema';
import { DEG_TO_RAD, RAD_TO_DEG } from '../../robotics/math/constants';
import {
  Plus,
  Trash2,
  CheckCircle,
  Download,
  Upload,
  AlertCircle,
  Check,
  Sparkles,
  Layers,
} from 'lucide-react';

const ARM_TEMPLATES = [
  {
    name: '2R Planar Manipulator',
    convention: 'standard' as DHConvention,
    joints: [
      {
        id: 'j1',
        name: 'Joint 1',
        index: 0,
        type: 'revolute' as const,
        theta: 0,
        d: 0,
        a: 0.4,
        alpha: 0,
        offset: 0,
        min: -Math.PI,
        max: Math.PI,
        home: 0,
      },
      {
        id: 'j2',
        name: 'Joint 2',
        index: 1,
        type: 'revolute' as const,
        theta: 0,
        d: 0,
        a: 0.3,
        alpha: 0,
        offset: 0,
        min: -Math.PI,
        max: Math.PI,
        home: 0,
      },
    ],
  },
  {
    name: '3-DOF Articulated Arm (RRR)',
    convention: 'standard' as DHConvention,
    joints: [
      {
        id: 'j1',
        name: 'Joint 1 (Waist)',
        index: 0,
        type: 'revolute' as const,
        theta: 0,
        d: 0.3,
        a: 0,
        alpha: Math.PI / 2,
        offset: 0,
        min: -Math.PI,
        max: Math.PI,
        home: 0,
      },
      {
        id: 'j2',
        name: 'Joint 2 (Shoulder)',
        index: 1,
        type: 'revolute' as const,
        theta: 0,
        d: 0,
        a: 0.35,
        alpha: 0,
        offset: 0,
        min: -Math.PI / 2,
        max: Math.PI / 2,
        home: 0,
      },
      {
        id: 'j3',
        name: 'Joint 3 (Elbow)',
        index: 2,
        type: 'revolute' as const,
        theta: 0,
        d: 0,
        a: 0.25,
        alpha: 0,
        offset: 0,
        min: -Math.PI,
        max: Math.PI,
        home: 0,
      },
    ],
  },
  {
    name: '4-DOF SCARA (RRPR)',
    convention: 'standard' as DHConvention,
    joints: [
      {
        id: 'j1',
        name: 'Joint 1',
        index: 0,
        type: 'revolute' as const,
        theta: 0,
        d: 0.35,
        a: 0.3,
        alpha: 0,
        offset: 0,
        min: -Math.PI,
        max: Math.PI,
        home: 0,
      },
      {
        id: 'j2',
        name: 'Joint 2',
        index: 1,
        type: 'revolute' as const,
        theta: 0,
        d: 0,
        a: 0.25,
        alpha: Math.PI,
        offset: 0,
        min: -Math.PI,
        max: Math.PI,
        home: 0,
      },
      {
        id: 'j3',
        name: 'Joint 3 (Z-Slide)',
        index: 2,
        type: 'prismatic' as const,
        theta: 0,
        d: 0.1,
        a: 0,
        alpha: 0,
        offset: 0,
        min: 0,
        max: 0.3,
        home: 0.1,
      },
      {
        id: 'j4',
        name: 'Joint 4 (Wrist)',
        index: 3,
        type: 'revolute' as const,
        theta: 0,
        d: 0,
        a: 0,
        alpha: 0,
        offset: 0,
        min: -Math.PI,
        max: Math.PI,
        home: 0,
      },
    ],
  },
  {
    name: '6-DOF Anthropomorphic (6R)',
    convention: 'standard' as DHConvention,
    joints: [
      {
        id: 'j1',
        name: 'Joint 1',
        index: 0,
        type: 'revolute' as const,
        theta: 0,
        d: 0.4,
        a: 0.05,
        alpha: -Math.PI / 2,
        offset: 0,
        min: -Math.PI,
        max: Math.PI,
        home: 0,
      },
      {
        id: 'j2',
        name: 'Joint 2',
        index: 1,
        type: 'revolute' as const,
        theta: 0,
        d: 0,
        a: 0.4,
        alpha: 0,
        offset: 0,
        min: -Math.PI,
        max: Math.PI,
        home: 0,
      },
      {
        id: 'j3',
        name: 'Joint 3',
        index: 2,
        type: 'revolute' as const,
        theta: 0,
        d: 0,
        a: 0.05,
        alpha: -Math.PI / 2,
        offset: 0,
        min: -Math.PI,
        max: Math.PI,
        home: 0,
      },
      {
        id: 'j4',
        name: 'Joint 4',
        index: 3,
        type: 'revolute' as const,
        theta: 0,
        d: 0.35,
        a: 0,
        alpha: Math.PI / 2,
        offset: 0,
        min: -Math.PI,
        max: Math.PI,
        home: 0,
      },
      {
        id: 'j5',
        name: 'Joint 5',
        index: 4,
        type: 'revolute' as const,
        theta: 0,
        d: 0,
        a: 0,
        alpha: -Math.PI / 2,
        offset: 0,
        min: -Math.PI,
        max: Math.PI,
        home: 0,
      },
      {
        id: 'j6',
        name: 'Joint 6',
        index: 5,
        type: 'revolute' as const,
        theta: 0,
        d: 0.1,
        a: 0,
        alpha: 0,
        offset: 0,
        min: -Math.PI,
        max: Math.PI,
        home: 0,
      },
    ],
  },
];

export const CustomRobotCreator: React.FC = () => {
  const { setRobot, setActiveTab } = useRobotStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('Custom Serial Arm');
  const [dhConvention, setDhConvention] = useState<DHConvention>('standard');
  const [joints, setJoints] = useState<JointDefinition[]>([
    {
      id: 'custom_j1',
      name: 'Joint 1',
      index: 0,
      type: 'revolute',
      theta: 0,
      d: 0.3,
      a: 0,
      alpha: Math.PI / 2,
      offset: 0,
      min: -Math.PI,
      max: Math.PI,
      home: 0,
    },
    {
      id: 'custom_j2',
      name: 'Joint 2',
      index: 1,
      type: 'revolute',
      theta: 0,
      d: 0,
      a: 0.35,
      alpha: 0,
      offset: 0,
      min: -Math.PI,
      max: Math.PI,
      home: 0,
    },
    {
      id: 'custom_j3',
      name: 'Joint 3',
      index: 2,
      type: 'revolute',
      theta: 0,
      d: 0,
      a: 0.25,
      alpha: 0,
      offset: 0,
      min: -Math.PI,
      max: Math.PI,
      home: 0,
    },
  ]);

  const [importStatus, setImportStatus] = useState<{ type: 'error' | 'success'; message: string } | null>(
    null
  );

  const handleApplyTemplate = (template: typeof ARM_TEMPLATES[0]) => {
    setName(template.name);
    setDhConvention(template.convention);
    setJoints(
      template.joints.map((j, i) => ({
        ...j,
        id: `custom_j${i + 1}`,
      }))
    );
    setImportStatus({
      type: 'success',
      message: `Loaded template "${template.name}" with ${template.joints.length} joints!`,
    });
  };

  const handleAddJoint = () => {
    if (joints.length >= 8) return;
    const nextIdx = joints.length;
    const newJoint: JointDefinition = {
      id: `custom_j${nextIdx + 1}`,
      name: `Joint ${nextIdx + 1}`,
      index: nextIdx,
      type: 'revolute',
      theta: 0,
      d: 0,
      a: 0.2,
      alpha: 0,
      offset: 0,
      min: -Math.PI,
      max: Math.PI,
      home: 0,
    };
    setJoints([...joints, newJoint]);
  };

  const handleRemoveJoint = (idx: number) => {
    if (joints.length <= 1) return;
    const filtered = joints
      .filter((_, i) => i !== idx)
      .map((j, i) => ({
        ...j,
        index: i,
        name: `Joint ${i + 1}`,
        id: `custom_j${i + 1}`,
      }));
    setJoints(filtered);
  };

  const handleUpdateJoint = <K extends keyof JointDefinition>(
    idx: number,
    field: K,
    val: JointDefinition[K]
  ) => {
    const next = [...joints];
    next[idx] = { ...next[idx], [field]: val };
    setJoints(next);
  };

  const buildDefinition = (): RobotDefinition => {
    return {
      id: `custom_${Date.now()}`,
      name,
      manufacturer: 'Custom Arm Builder',
      model: `${joints.length}-DOF Custom Serial Manipulator`,
      dof: joints.length,
      dhConvention,
      joints,
      links: [
        { id: 'custom_link0', name: 'Base Link', index: 0, color: '#0284c7' },
        ...joints.map((_, idx) => ({
          id: `custom_link${idx + 1}`,
          name: `Link ${idx + 1}`,
          index: idx + 1,
          color: idx % 2 === 0 ? '#38bdf8' : '#0284c7',
        })),
      ],
    };
  };

  const handleBuildRobot = () => {
    const customDef = buildDefinition();
    setRobot(customDef);
    setActiveTab('fk');
  };

  const handleExportJson = () => {
    const customDef = buildDefinition();
    const jsonStr = JSON.stringify(customDef, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'custom_robot'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setImportStatus({ type: 'success', message: 'Robot definition JSON downloaded successfully.' });
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportStatus(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Uploaded file is not a valid JSON object.');
        }

        if (typeof parsed.name !== 'string' || !parsed.name.trim()) {
          throw new Error('JSON is missing a valid "name" property.');
        }

        if (!Array.isArray(parsed.joints) || parsed.joints.length === 0) {
          throw new Error('JSON must contain a non-empty "joints" array.');
        }

        if (parsed.joints.length > 8) {
          throw new Error('Robots with more than 8 DOF are not supported in the custom creator.');
        }

        const validJoints: JointDefinition[] = parsed.joints.map((j: Record<string, unknown>, idx: number) => {
          if (typeof j !== 'object' || j === null) {
            throw new Error(`Joint ${idx + 1} is invalid.`);
          }
          return {
            id: typeof j.id === 'string' ? j.id : `custom_j${idx + 1}`,
            name: typeof j.name === 'string' ? j.name : `Joint ${idx + 1}`,
            index: idx,
            type: j.type === 'prismatic' ? 'prismatic' : 'revolute',
            theta: typeof j.theta === 'number' ? j.theta : 0,
            d: typeof j.d === 'number' ? j.d : 0,
            a: typeof j.a === 'number' ? j.a : 0,
            alpha: typeof j.alpha === 'number' ? j.alpha : 0,
            offset: typeof j.offset === 'number' ? j.offset : 0,
            min: typeof j.min === 'number' ? j.min : -Math.PI,
            max: typeof j.max === 'number' ? j.max : Math.PI,
            home: typeof j.home === 'number' ? j.home : 0,
          };
        });

        setName(parsed.name);
        setDhConvention(parsed.dhConvention === 'modified' ? 'modified' : 'standard');
        setJoints(validJoints);
        setImportStatus({
          type: 'success',
          message: `Successfully imported "${parsed.name}" (${validJoints.length}-DOF)!`,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setImportStatus({ type: 'error', message: `Import Failed: ${msg}` });
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col h-full bg-[#faf8f5] text-black p-5 overflow-y-auto select-none space-y-5">
      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-white rounded-2xl border-2 border-stone-200 shadow-sm">
        <span className="text-xs text-stone-600 font-medium">
          Configure joint parameters and synthesize custom robot architecture into the 3D scene:
        </span>

        {/* Actions Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".json,application/json"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            title="Import Robot from JSON file"
            className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-stone-100 text-black font-black text-xs rounded-xl border-2 border-stone-300 shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Upload className="w-4 h-4 text-black" />
            <span>Import JSON</span>
          </button>

          <button
            onClick={handleExportJson}
            title="Export Robot definition to JSON file"
            className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-stone-100 text-black font-black text-xs rounded-xl border-2 border-stone-300 shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4 text-black" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={handleBuildRobot}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 active:scale-95 text-black font-black text-xs rounded-xl border-2 border-stone-900 shadow-md transition-all ml-1 cursor-pointer uppercase tracking-wider"
          >
            <CheckCircle className="w-4 h-4 text-black" />
            <span>Build & Simulate</span>
          </button>
        </div>
      </div>

      {/* 1-Click Arm Templates Bar */}
      <div className="p-4 bg-white rounded-2xl border-2 border-stone-200 shadow-sm space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-black text-black uppercase tracking-wide">
          <Sparkles className="w-4 h-4 text-black" />
          <span>Quick Arm Templates (1-Click Load)</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {ARM_TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.name}
              onClick={() => handleApplyTemplate(tmpl)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-amber-100 text-black border border-stone-300 hover:border-amber-400 text-xs font-black rounded-xl transition-all active:scale-95 cursor-pointer shadow-2xs"
            >
              <Layers className="w-3.5 h-3.5 text-black" />
              <span>{tmpl.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Import Status Alert Banner */}
      {importStatus && (
        <div
          className={`flex items-center justify-between p-4 rounded-2xl border-2 text-xs shadow-xs ${
            importStatus.type === 'error'
              ? 'bg-rose-50 border-rose-300 text-black'
              : 'bg-emerald-50 border-emerald-300 text-black'
          }`}
        >
          <div className="flex items-center gap-2 font-black">
            {importStatus.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{importStatus.message}</span>
          </div>
          <button
            onClick={() => setImportStatus(null)}
            className="text-black hover:underline font-black text-xs ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* General Settings Card */}
      <div className="bg-white p-4 rounded-2xl border-2 border-stone-200 shadow-sm space-y-3">
        <h3 className="text-xs font-black text-black uppercase tracking-wide">Manipulator General Parameters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-black font-black uppercase text-[11px]">Robot Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-white border-2 border-stone-300 rounded-xl text-black font-black focus:border-stone-900 focus:outline-none shadow-2xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-black font-black uppercase text-[11px]">DH Convention Standard</label>
            <select
              value={dhConvention}
              onChange={(e) => setDhConvention(e.target.value as DHConvention)}
              className="w-full px-3 py-2 bg-white border-2 border-stone-300 rounded-xl text-black font-black focus:border-stone-900 focus:outline-none shadow-2xs cursor-pointer"
            >
              <option value="standard">Standard DH (A = RotZ TransZ TransX RotX)</option>
              <option value="modified">Modified DH (A = RotX TransX RotZ TransZ)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Joints List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-black text-black uppercase tracking-wide">Kinematic Joint Links</h3>
            <span className="px-2.5 py-0.5 bg-amber-100 text-black text-[10px] font-black rounded-md border border-amber-300">
              {joints.length} of 8 DOF
            </span>
          </div>
          <button
            onClick={handleAddJoint}
            disabled={joints.length >= 8}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-black rounded-xl bg-amber-400 hover:bg-amber-500 text-black border-2 border-stone-900 shadow-xs disabled:opacity-50 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-black" />
            <span>Add Joint</span>
          </button>
        </div>

        <div className="space-y-3">
          {joints.map((joint, idx) => (
            <div
              key={joint.id}
              className="p-4 bg-white rounded-2xl border-2 border-stone-200 shadow-sm space-y-3.5"
            >
              {/* Joint Header */}
              <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-1 bg-amber-100 text-black text-xs font-black rounded-lg border border-amber-300">
                    Joint {idx + 1}
                  </span>
                  <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-300">
                    <button
                      onClick={() => handleUpdateJoint(idx, 'type', 'revolute')}
                      className={`px-3 py-1 text-xs font-black rounded-lg transition-all cursor-pointer ${
                        joint.type === 'revolute'
                          ? 'bg-amber-400 text-black border border-stone-900 shadow-2xs'
                          : 'text-black hover:bg-white'
                      }`}
                    >
                      Revolute (θ)
                    </button>
                    <button
                      onClick={() => handleUpdateJoint(idx, 'type', 'prismatic')}
                      className={`px-3 py-1 text-xs font-black rounded-lg transition-all cursor-pointer ${
                        joint.type === 'prismatic'
                          ? 'bg-amber-400 text-black border border-stone-900 shadow-2xs'
                          : 'text-black hover:bg-white'
                      }`}
                    >
                      Prismatic (d)
                    </button>
                  </div>
                </div>

                {joints.length > 1 && (
                  <button
                    onClick={() => handleRemoveJoint(idx)}
                    title="Remove this joint"
                    className="p-1.5 hover:bg-rose-100 text-black hover:text-rose-700 rounded-lg transition-colors cursor-pointer border border-stone-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* DH Fields: d, a, alpha, limits */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                {/* d parameter */}
                <div className="space-y-1 p-2 bg-stone-50 rounded-xl border border-stone-300">
                  <label className="text-[11px] text-black font-sans font-black">d (m)</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.05"
                      value={joint.d}
                      onChange={(e) => handleUpdateJoint(idx, 'd', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 bg-white border border-stone-300 rounded-lg text-black font-mono font-black focus:border-stone-900 focus:outline-none"
                    />
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => handleUpdateJoint(idx, 'd', Math.round((joint.d + 0.05) * 100) / 100)}
                        className="px-1.5 py-0.5 bg-stone-100 hover:bg-stone-200 text-black text-[10px] font-black rounded border border-stone-300 cursor-pointer"
                      >
                        +
                      </button>
                      <button
                        onClick={() => handleUpdateJoint(idx, 'd', Math.round((joint.d - 0.05) * 100) / 100)}
                        className="px-1.5 py-0.5 bg-stone-100 hover:bg-stone-200 text-black text-[10px] font-black rounded border border-stone-300 cursor-pointer"
                      >
                        -
                      </button>
                    </div>
                  </div>
                </div>

                {/* a parameter */}
                <div className="space-y-1 p-2 bg-stone-50 rounded-xl border border-stone-300">
                  <label className="text-[11px] text-black font-sans font-black">a (m)</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.05"
                      value={joint.a}
                      onChange={(e) => handleUpdateJoint(idx, 'a', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 bg-white border border-stone-300 rounded-lg text-black font-mono font-black focus:border-stone-900 focus:outline-none"
                    />
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => handleUpdateJoint(idx, 'a', Math.round((joint.a + 0.05) * 100) / 100)}
                        className="px-1.5 py-0.5 bg-stone-100 hover:bg-stone-200 text-black text-[10px] font-black rounded border border-stone-300 cursor-pointer"
                      >
                        +
                      </button>
                      <button
                        onClick={() => handleUpdateJoint(idx, 'a', Math.round((joint.a - 0.05) * 100) / 100)}
                        className="px-1.5 py-0.5 bg-stone-100 hover:bg-stone-200 text-black text-[10px] font-black rounded border border-stone-300 cursor-pointer"
                      >
                        -
                      </button>
                    </div>
                  </div>
                </div>

                {/* alpha parameter with quick buttons */}
                <div className="space-y-1 p-2 bg-stone-50 rounded-xl border border-stone-300">
                  <label className="text-[11px] text-black font-sans font-black">α (deg)</label>
                  <input
                    type="number"
                    step="15"
                    value={(joint.alpha * RAD_TO_DEG).toFixed(0)}
                    onChange={(e) =>
                      handleUpdateJoint(idx, 'alpha', (parseFloat(e.target.value) || 0) * DEG_TO_RAD)
                    }
                    className="w-full px-2 py-1.5 bg-white border border-stone-300 rounded-lg text-black font-mono font-black focus:border-stone-900 focus:outline-none"
                  />
                  <div className="flex items-center gap-1 pt-1">
                    {[-90, 0, 90, 180].map((deg) => (
                      <button
                        key={deg}
                        onClick={() => handleUpdateJoint(idx, 'alpha', deg * DEG_TO_RAD)}
                        className="flex-1 py-1 bg-stone-100 hover:bg-amber-100 text-black font-black text-[10px] rounded border border-stone-300 transition-colors cursor-pointer"
                      >
                        {deg}°
                      </button>
                    ))}
                  </div>
                </div>

                {/* Range [min, max] */}
                <div className="space-y-1 p-2 bg-stone-50 rounded-xl border border-stone-300">
                  <div className="flex items-center justify-between text-[11px] text-black font-sans font-black">
                    <span>Limits</span>
                    <span className="text-[10px] text-stone-500 font-bold">{joint.type === 'revolute' ? '(deg)' : '(mm)'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="relative">
                      <span className="absolute left-1.5 top-0.5 text-[8px] text-stone-400 font-black">MIN</span>
                      <input
                        type="number"
                        step={joint.type === 'revolute' ? 10 : 50}
                        value={joint.type === 'revolute' ? (joint.min * RAD_TO_DEG).toFixed(0) : (joint.min * 1000).toFixed(0)}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value) || 0;
                          handleUpdateJoint(idx, 'min', joint.type === 'revolute' ? v * DEG_TO_RAD : v / 1000);
                        }}
                        className="w-full pt-3 pb-1 px-1.5 bg-white border border-stone-300 rounded-lg text-black font-mono font-black text-xs text-center focus:border-stone-900 focus:outline-none"
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute left-1.5 top-0.5 text-[8px] text-stone-400 font-black">MAX</span>
                      <input
                        type="number"
                        step={joint.type === 'revolute' ? 10 : 50}
                        value={joint.type === 'revolute' ? (joint.max * RAD_TO_DEG).toFixed(0) : (joint.max * 1000).toFixed(0)}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value) || 0;
                          handleUpdateJoint(idx, 'max', joint.type === 'revolute' ? v * DEG_TO_RAD : v / 1000);
                        }}
                        className="w-full pt-3 pb-1 px-1.5 bg-white border border-stone-300 rounded-lg text-black font-mono font-black text-xs text-center focus:border-stone-900 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 pt-1">
                    {[90, 180, 360].map((deg) => (
                      <button
                        key={deg}
                        type="button"
                        onClick={() => {
                          handleUpdateJoint(idx, 'min', -deg * DEG_TO_RAD);
                          handleUpdateJoint(idx, 'max', deg * DEG_TO_RAD);
                        }}
                        className="flex-1 py-0.5 bg-stone-100 hover:bg-amber-100 text-black font-black text-[10px] rounded border border-stone-300 transition-colors cursor-pointer"
                      >
                        ±{deg}°
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


