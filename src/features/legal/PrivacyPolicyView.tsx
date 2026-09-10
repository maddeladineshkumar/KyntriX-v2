import React from 'react';
import { ShieldCheck, Lock, Database, EyeOff, Award, FileText, Mail, Globe } from 'lucide-react';

export const PrivacyPolicyView: React.FC = () => {
  return (
    <div className="space-y-8 text-stone-800 leading-relaxed font-sans">
      {/* Header Summary Card */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-6 sm:p-8 space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-xs font-semibold text-stone-500">
              Effective Date: September 10, 2026 • Version 2.4 (Educational & Engineering Compliance)
            </p>
          </div>
        </div>
        <p className="text-sm text-stone-700 leading-relaxed pt-2">
          At KyntriX Robotics (<span className="font-mono text-xs font-bold text-amber-950">kyntrix.edu / KyntriX-v2</span>), 
          we are dedicated to empowering robotics engineers, students, and academic researchers with transparent, 
          privacy-respecting simulation and deterministic kinematics tools. This Privacy Policy details the exact types 
          of information we collect, how it is processed, and your complete rights under global data protection frameworks 
          (including GDPR and CCPA).
        </p>
      </div>

      {/* Section 1 */}
      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2 border-b border-stone-200 pb-2">
          <Database className="w-5 h-5 text-amber-600" />
          <span>1. Information We Collect</span>
        </h2>
        <div className="space-y-2 text-sm text-stone-700">
          <p>
            We adhere strictly to the principle of <strong>data minimization</strong>. We only collect information essential 
            for providing interactive 3D robot simulation, kinematic verification, and academic challenge tracking:
          </p>
          <ul className="list-disc list-inside pl-2 space-y-1.5 font-medium">
            <li>
              <strong>Account & Profile Information:</strong> When you register on KyntriX, we collect your name, username, 
              institutional email address, chosen role (Student, Teacher, or Researcher), affiliated academic institution, 
              and optional avatar profile link.
            </li>
            <li>
              <strong>Kinematics & Arena Learning Activity:</strong> When submitting answers in the Kinematics Arena or 
              completing 3D simulation challenges, we record your computed joint configurations, DH parameters, 
              mathematical derivation steps, timestamp of attempt, hints accessed, and solve durations.
            </li>
            <li>
              <strong>Telemetry & Achievements:</strong> User skill level rating (Elo), total experience points (XP), 
              unbroken learning streaks, active days calendar, and unlocked competency badges (e.g. <em>DH Master</em>, 
              <em>IK Specialist</em>, <em>Matrix Master</em>).
            </li>
            <li>
              <strong>Custom Robot Architectures:</strong> Any custom robot models, DH parameter tables, or joint limits 
              synthesized using our Custom Robot Creator.
            </li>
          </ul>
        </div>
      </section>

      {/* Section 2 */}
      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2 border-b border-stone-200 pb-2">
          <EyeOff className="w-5 h-5 text-teal-600" />
          <span>2. Simulation Computing & Client-Side Privacy</span>
        </h2>
        <div className="space-y-2 text-sm text-stone-700">
          <p>
            KyntriX is engineered as a <strong>web-native, edge-computed robotics engine</strong>:
          </p>
          <ul className="list-disc list-inside pl-2 space-y-1.5 font-medium">
            <li>
              <strong>Local 3D Rendering:</strong> All 3D CAD visualization, STL meshes, and robot kinematics computations 
              (Forward Kinematics, Analytical Pieper 6R decoupling, Damped Least Squares IK, and trajectory interpolation) 
              execute locally on your device via client-side WebGL (Three.js) and dedicated off-thread Web Workers.
            </li>
            <li>
              <strong>Zero Biometric or Camera Access:</strong> KyntriX never accesses your camera, microphone, or biometric sensors.
            </li>
            <li>
              <strong>No Third-Party Advertising Trackers:</strong> We do not deploy cross-site tracking cookies, behavioral ad pixels, 
              or third-party data brokers.
            </li>
          </ul>
        </div>
      </section>

      {/* Section 3 */}
      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2 border-b border-stone-200 pb-2">
          <Lock className="w-5 h-5 text-emerald-600" />
          <span>3. Security, Authentication & Local Storage</span>
        </h2>
        <div className="space-y-2 text-sm text-stone-700">
          <p>
            We implement industry-standard cryptographic protections to safeguard your account:
          </p>
          <ul className="list-disc list-inside pl-2 space-y-1.5 font-medium">
            <li>
              <strong>Cryptographic Password Protection:</strong> Passwords are never stored in plaintext; all credentials 
              are secured via salted cryptographic hashing with unique salt factors.
            </li>
            <li>
              <strong>Session Tokens:</strong> Active sessions are managed through secure, bearer-authenticated tokens. 
              Tokens are strictly scoped to verified user operations.
            </li>
            <li>
              <strong>Local Storage & PWA Caching:</strong> We store non-sensitive state (such as active robot selection, 
              view mode preferences, and offline PWA assets) in your browser's local storage to enable instant offline loading.
            </li>
          </ul>
        </div>
      </section>

      {/* Section 4 */}
      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2 border-b border-stone-200 pb-2">
          <Award className="w-5 h-5 text-purple-600" />
          <span>4. Educational Classrooms & Institutional Compliance</span>
        </h2>
        <div className="space-y-2 text-sm text-stone-700">
          <p>
            When utilizing KyntriX within academic courses, universities, or research laboratories:
          </p>
          <ul className="list-disc list-inside pl-2 space-y-1.5 font-medium">
            <li>
              <strong>Classroom Visibility:</strong> When you join a classroom with a verified join code, your instructor 
              can review assignment submissions, problem completion accuracy, and kinematic telemetry relevant to coursework.
            </li>
            <li>
              <strong>FERPA / Student Privacy:</strong> Academic performance data is strictly restricted to assigned instructors 
              and is never made public or indexed by external search engines.
            </li>
          </ul>
        </div>
      </section>

      {/* Section 5 */}
      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2 border-b border-stone-200 pb-2">
          <FileText className="w-5 h-5 text-orange-600" />
          <span>5. Your Data Rights (GDPR & CCPA)</span>
        </h2>
        <div className="space-y-2 text-sm text-stone-700">
          <p>Regardless of your geographic location, KyntriX guarantees the following rights:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 bg-stone-100 rounded-2xl border border-stone-200">
              <h3 className="font-bold text-stone-900 text-xs uppercase tracking-wider mb-1">Right to Access & Export</h3>
              <p className="text-xs text-stone-600">
                You may request a copy of all profile information, custom robot designs, and problem attempt histories in standard JSON format.
              </p>
            </div>
            <div className="p-3.5 bg-stone-100 rounded-2xl border border-stone-200">
              <h3 className="font-bold text-stone-900 text-xs uppercase tracking-wider mb-1">Right to Erasure (To Be Forgotten)</h3>
              <p className="text-xs text-stone-600">
                You may request full deletion of your account, submissions, XP transactions, and rating records at any time.
              </p>
            </div>
            <div className="p-3.5 bg-stone-100 rounded-2xl border border-stone-200">
              <h3 className="font-bold text-stone-900 text-xs uppercase tracking-wider mb-1">Right to Rectification</h3>
              <p className="text-xs text-stone-600">
                You can directly edit your name, institution, and avatar URL through the Profile settings page.
              </p>
            </div>
            <div className="p-3.5 bg-stone-100 rounded-2xl border border-stone-200">
              <h3 className="font-bold text-stone-900 text-xs uppercase tracking-wider mb-1">No Data Monetization</h3>
              <p className="text-xs text-stone-600">
                We do not sell, rent, or trade your personal or academic information under any circumstances.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 6 */}
      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2 border-b border-stone-200 pb-2">
          <Globe className="w-5 h-5 text-blue-600" />
          <span>6. Contact & Data Protection Officer</span>
        </h2>
        <div className="p-4 bg-stone-100/90 border border-stone-200 rounded-2xl space-y-2 text-sm text-stone-700">
          <p>
            If you have questions, feedback, or requests regarding this Privacy Policy or wish to exercise your data rights, 
            please reach out to our team:
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-stone-800 pt-1">
            <div className="flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-amber-600" />
              <span>privacy@kyntrix.edu</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-teal-600" />
              <span>https://github.com/maddeladineshkumar/KyntriX-v2</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
