import React from 'react';
import { FileCheck, AlertOctagon, Scale, ShieldAlert, BookOpen, Bot, Terminal } from 'lucide-react';

export const TermsOfServiceView: React.FC = () => {
  return (
    <div className="space-y-8 text-stone-800 leading-relaxed font-sans">
      {/* Header Summary Card */}
      <div className="bg-orange-500/10 border border-orange-500/30 rounded-3xl p-6 sm:p-8 space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-orange-500 text-white shadow-md shadow-orange-500/20">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              Terms of Service
            </h1>
            <p className="text-xs font-semibold text-stone-500">
              Effective Date: September 10, 2026 • Version 2.4 (Academic & Simulator Terms)
            </p>
          </div>
        </div>
        <p className="text-sm text-stone-700 leading-relaxed pt-2">
          Welcome to KyntriX Robotics (<span className="font-mono text-xs font-bold text-orange-950">kyntrix.edu / KyntriX-v2</span>). 
          These Terms of Service govern your access to and use of our web-native 3D robotics simulation platform, 
          deterministic kinematic solvers, custom arm builders, classroom environments, and problem arena challenge modules.
        </p>
      </div>

      {/* Section 1 */}
      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2 border-b border-stone-200 pb-2">
          <BookOpen className="w-5 h-5 text-amber-600" />
          <span>1. Acceptance of Terms & Educational License</span>
        </h2>
        <div className="space-y-2 text-sm text-stone-700">
          <p>
            By accessing or using KyntriX, you agree to be bound by these Terms of Service and our Privacy Policy. 
            If you do not agree, do not access or use the platform.
          </p>
          <p>
            <strong>Grant of License:</strong> KyntriX grants you a personal, non-exclusive, non-transferable, revocable 
            license to use the software for educational, academic coursework, individual study, and non-commercial scientific research. 
            Commercial licensing or embedding of the KyntriX simulation engine within proprietary commercial hardware requires 
            prior written authorization.
          </p>
        </div>
      </section>

      {/* Section 2 - Physical Machinery Disclaimer (CRITICAL IN ROBOTICS) */}
      <section className="space-y-3">
        <div className="p-5 bg-rose-50 border-2 border-rose-300 rounded-3xl space-y-3">
          <h2 className="text-base sm:text-lg font-black text-rose-950 flex items-center gap-2">
            <AlertOctagon className="w-6 h-6 text-rose-600 shrink-0" />
            <span>2. CRITICAL NOTICE: Physical Machinery & Industrial Safety Disclaimer</span>
          </h2>
          <div className="space-y-2 text-xs sm:text-sm text-rose-900 leading-relaxed font-medium">
            <p>
              <strong>KyntriX is a virtual mathematical simulation environment.</strong> While our forward kinematics, 
              analytical Pieper 6R decoupling, Damped Least Squares (DLS) numerical solvers, and trajectory interpolators 
              are built to rigorous mathematical and academic standards:
            </p>
            <ul className="list-disc list-inside pl-2 space-y-1">
              <li>
                <strong>No Direct Physical Actuation:</strong> You must NEVER directly feed generated trajectory waypoints, 
                joint angles, or velocity profiles into physical industrial robots without rigorous offline verification, 
                independent hardware limit switches, and an operator physically ready at an independent emergency stop (E-stop).
              </li>
              <li>
                <strong>Real-World Physical Factors:</strong> The simulation may not account for real-world physical dynamics 
                such as link elasticity, motor backlash, thermal expansion, unmodeled cable friction, payload inertia shifts, 
                or sensor noise.
              </li>
              <li>
                <strong>Zero Liability for Hardware Damage:</strong> KyntriX and its contributors assume zero liability 
                for physical hardware collision, mechanical damage, electrical burnout, or bodily injury resulting from 
                applying simulation outputs to real-world robots.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Section 3 */}
      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2 border-b border-stone-200 pb-2">
          <Bot className="w-5 h-5 text-teal-600" />
          <span>3. Robot Models, DH Parameters & Intellectual Property</span>
        </h2>
        <div className="space-y-2 text-sm text-stone-700">
          <p>
            KyntriX includes 3D representations and kinematic specifications for 42 industrial and academic manipulators 
            (including ABB, FANUC, KUKA, Puma 560, Stanford Arm, and educational skeleton chains):
          </p>
          <ul className="list-disc list-inside pl-2 space-y-1.5 font-medium">
            <li>
              <strong>Third-Party Trademarks:</strong> Robot brand names and manufacturer identifiers (e.g., ABB, FANUC, KUKA, 
              Epson) are the registered trademarks of their respective owners. Their inclusion in KyntriX is strictly for 
              academic identification and educational benchmarking under fair use doctrine.
            </li>
            <li>
              <strong>Algorithmic Implementations:</strong> The KyntriX simulation engine, DH parameter solver, matrix viewers, 
              trajectory generators, and gamified problem assessment systems are the proprietary intellectual property of KyntriX.
            </li>
          </ul>
        </div>
      </section>

      {/* Section 4 */}
      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2 border-b border-stone-200 pb-2">
          <ShieldAlert className="w-5 h-5 text-purple-600" />
          <span>4. User Conduct & Academic Integrity</span>
        </h2>
        <div className="space-y-2 text-sm text-stone-700">
          <p>As a member of the KyntriX engineering community, you agree not to:</p>
          <ul className="list-disc list-inside pl-2 space-y-1.5 font-medium">
            <li>
              Use automated bots, scrapers, or exploits to manipulate the competitive rating (Elo), badge progression, 
              or leaderboard rankings in the Kinematics Arena.
            </li>
            <li>
              Submit plagiarized solutions or bypass progressive guidance hints dishonestly in institutional classroom assignments.
            </li>
            <li>
              Attempt to reverse engineer, decompile, or attack the server-side deterministic assessment APIs or database endpoints.
            </li>
            <li>
              Share account credentials with third parties or impersonate other students, faculty, or researchers.
            </li>
          </ul>
        </div>
      </section>

      {/* Section 5 */}
      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2 border-b border-stone-200 pb-2">
          <Scale className="w-5 h-5 text-stone-700" />
          <span>5. Disclaimer of Warranties & Limitation of Liability</span>
        </h2>
        <div className="space-y-2 text-sm text-stone-700 leading-relaxed">
          <p>
            THE PLATFORM, MATHEMATICAL MODELS, AND SIMULATION TOOLS ARE PROVIDED ON AN <strong>"AS IS"</strong> AND 
            <strong>"AS AVAILABLE"</strong> BASIS WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING 
            WITHOUT LIMITATION THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR KINEMATIC OR INDUSTRIAL 
            PURPOSE, AND NON-INFRINGEMENT.
          </p>
          <p>
            IN NO EVENT SHALL KYNTRIX OR ITS DEVELOPERS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, 
            OR CONSEQUENTIAL DAMAGES ARISING OUT OF THE USE OF OR INABILITY TO USE THE SIMULATOR OR ALGORITHMIC SOLVERS.
          </p>
        </div>
      </section>

      {/* Section 6 */}
      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2 border-b border-stone-200 pb-2">
          <Terminal className="w-5 h-5 text-amber-600" />
          <span>6. Modifications & Governing Law</span>
        </h2>
        <div className="space-y-2 text-sm text-stone-700">
          <p>
            We reserve the right to revise or update these Terms at any time. When updates occur, the revision date at the top 
            will be updated. Continued use of KyntriX following notification constitutes acceptance of the modified Terms.
          </p>
          <p>
            If any provision of these Terms is found invalid or unenforceable by an authoritative court of competent jurisdiction, 
            the remaining provisions will remain in full force and effect.
          </p>
        </div>
      </section>
    </div>
  );
};
