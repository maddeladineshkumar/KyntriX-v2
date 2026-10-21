import React from 'react';
import {
  Activity,
  Compass,
  Gauge,
  Keyboard,
  Layers,
  Plane,
  ScanLine,
  SlidersHorizontal,
  Volume2,
} from 'lucide-react';
import { Kbd, ModalShell, SectionLabel } from './studioUi';

interface StudioHelpProps {
  onClose: () => void;
}

const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: 'Space', action: 'Play or pause the mechanism' },
  { keys: '1 – 4', action: 'Assembled, Cutaway, Explore, Testbed' },
  { keys: '← / →', action: 'Previous or next tour station' },
  { keys: 'R', action: 'Fit the camera to the model' },
  { keys: 'G', action: 'Toggle the floor grid' },
  { keys: 'L', action: 'Toggle component callouts' },
  { keys: 'F', action: 'Toggle airflow particles' },
  { keys: '?', action: 'Open this reference' },
  { keys: 'Esc', action: 'Close a panel or clear the selection' },
];

export const StudioHelp: React.FC<StudioHelpProps> = ({ onClose }) => (
  <ModalShell
    title="Studio Controls & Mechanical Principles"
    subtitle="A quick reference for navigation, analysis modes, and the live test stands."
    icon={<Compass className="h-4 w-4" />}
    size="lg"
    onClose={onClose}
  >
    <div className="space-y-3 text-xs leading-relaxed text-stone-700">
      <div className="grid gap-2 sm:grid-cols-2">
        <section className="rounded-xl border border-stone-200 bg-white p-3">
          <SectionLabel className="flex items-center gap-1.5 text-amber-800">
            <Compass className="h-3.5 w-3.5" /> 3D Navigation
          </SectionLabel>
          <p className="mt-1.5">
            Left-drag to orbit, right-drag to pan, and scroll or pinch to zoom. The view tools can
            also fit the model, zoom in/out, and switch to front, side, top, or orthographic views.
          </p>
        </section>

        <section className="rounded-xl border border-stone-200 bg-white p-3">
          <SectionLabel className="flex items-center gap-1.5 text-amber-800">
            <SlidersHorizontal className="h-3.5 w-3.5" /> View & Performance
          </SectionLabel>
          <p className="mt-1.5">
            Open the view menu to toggle airflow, callouts, the grid, and auto-rotation. Choose
            Balanced quality on lower-power devices to reduce pixel density and particle count.
          </p>
        </section>

        <section className="rounded-xl border border-stone-200 bg-white p-3">
          <SectionLabel className="flex items-center gap-1.5 text-amber-800">
            <ScanLine className="h-3.5 w-3.5" /> Free-Angle Cutaways
          </SectionLabel>
          <p className="mt-1.5">
            Slice housings and internal hardware with the section depth, yaw, and pitch controls.
            Enable “cut internal hardware” to section every component, or use presets for repeatable
            teaching views.
          </p>
        </section>

        <section className="rounded-xl border border-stone-200 bg-white p-3">
          <SectionLabel className="flex items-center gap-1.5 text-amber-800">
            <Layers className="h-3.5 w-3.5" /> Continuous Separation
          </SectionLabel>
          <p className="mt-1.5">
            In Explore mode, scrub separation to loosen subassemblies, then continue toward a packed
            hardware inventory. Click any piece to inspect it and isolate its parent subsystem.
          </p>
        </section>

        <section className="rounded-xl border border-stone-200 bg-white p-3">
          <SectionLabel className="flex items-center gap-1.5 text-amber-800">
            <Plane className="h-3.5 w-3.5" /> Flight Testbed
          </SectionLabel>
          <p className="mt-1.5">
            Aircraft turbines and the AeroJet-X get throttle, altitude, reheat (where supported), and
            thrust vectoring. Watch RPM, thrust, turbine inlet temperature, Mach, and efficiency
            respond in the Data tab.
          </p>
        </section>

        <section className="rounded-xl border border-stone-200 bg-white p-3">
          <SectionLabel className="flex items-center gap-1.5 text-amber-800">
            <Gauge className="h-3.5 w-3.5" /> Dyno Testbed
          </SectionLabel>
          <p className="mt-1.5">
            Piston, rotary, and electric drives switch to a dyno stand with torque, brake power,
            fuel flow, boost, efficiency, and a live dyno sweep — no irrelevant flight controls.
          </p>
        </section>

        <section className="rounded-xl border border-stone-200 bg-white p-3">
          <SectionLabel className="flex items-center gap-1.5 text-amber-800">
            <Activity className="h-3.5 w-3.5" /> Telemetry & Tour
          </SectionLabel>
          <p className="mt-1.5">
            The Data tab runs a fixed 240 Hz powertrain solve and publishes telemetry about 12 times
            per second, with dyno, P-V, and per-cylinder pressure views. Guided tours step through
            each architecture with camera framing, part highlighting, and progress dots.
          </p>
        </section>

        <section className="rounded-xl border border-stone-200 bg-white p-3">
          <SectionLabel className="flex items-center gap-1.5 text-amber-800">
            <Volume2 className="h-3.5 w-3.5" /> Audio & Accessibility
          </SectionLabel>
          <p className="mt-1.5">
            The speaker button synthesizes a running engine tone. Dialogs trap keyboard focus, every
            slider is labelled, and reduced-motion users are not auto-advanced through tours.
          </p>
        </section>
      </div>

      <section className="rounded-xl border border-stone-200 bg-white p-3">
        <SectionLabel className="flex items-center gap-1.5 text-amber-800">
          <Keyboard className="h-3.5 w-3.5" /> Keyboard Shortcuts
        </SectionLabel>
        <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
          {SHORTCUTS.map((shortcut) => (
            <div
              key={shortcut.keys}
              className="flex items-center justify-between gap-2 rounded-lg bg-stone-50 px-2 py-1"
            >
              <span className="font-semibold text-stone-600">{shortcut.action}</span>
              <Kbd>{shortcut.keys}</Kbd>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-stone-500">
          Shortcuts are ignored while typing in a search field or when a dialog is open.
        </p>
      </section>

      <p className="px-1 text-[10px] leading-relaxed text-stone-500">
        Telemetry is an educational thermodynamic estimate. It is designed to show trends and
        relationships, not to certify real hardware.
      </p>
    </div>
  </ModalShell>
);
