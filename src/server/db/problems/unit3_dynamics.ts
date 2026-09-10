import type { Problem } from '../types';

export const unit3DynamicsProblems: Problem[] = [
  // 1. Parallel Axis Theorem (Steiner's Theorem)
  {
    id: 'prob_dyn_01',
    title: "Parallel Axis Theorem for Robot Link Inertia",
    description: 'A slender uniform robot link of mass m = 4.0 kg and length L = 0.60 m has center-of-mass moment of inertia I_cm = m*L^2 / 12 = 0.12 kg*m². Using the parallel axis theorem I = I_cm + m*d², calculate the moment of inertia about the joint pivot at the link end (d = L/2 = 0.30 m).',
    category: 'dynamics',
    subcategory: 'Rigid Body Kinetics',
    difficulty: 'beginner',
    tags: ['Inertia', 'Parallel Axis Theorem', 'Dynamics', 'Steiner'],
    xpReward: 30,
    ratingValue: 1200,
    timeLimitSeconds: 500,
    allowedAttempts: 5,
    hints: [
      'I_pivot = I_cm + m * d^2.',
      'd = 0.60 / 2 = 0.30 m.',
      'm * d^2 = 4.0 * (0.30)^2 = 4.0 * 0.09 = 0.36 kg*m².',
      'I_pivot = 0.12 + 0.36 = 0.48 kg*m² (or m*L^2 / 3 = 4 * 0.36 / 3 = 0.48).',
    ],
    questionData: {
      prompt: 'Enter moment of inertia I_pivot in kg*m².',
      givenValues: { m: 4.0, L: 0.6, I_cm: 0.12 },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 0.48,
      tolerance: 0.005,
      unit: 'kg*m²',
    },
    solution: {
      derivationSteps: [
        'd = L / 2 = 0.30 m',
        'I_pivot = I_cm + m*d^2 = 0.12 + 4.0*(0.30)^2 = 0.12 + 0.36 = 0.48 kg*m²',
        'Alternatively: I_end = (1/3)*m*L^2 = (1/3)*4.0*(0.36) = 0.48 kg*m²',
      ],
      finalAnswerDescription: 'I_pivot = 0.48 kg*m²',
    },
    explanation: 'Parallel axis theorem shifts inertia tensors from link centers of mass to joint rotation centers.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 2. Rotational Kinetic Energy
  {
    id: 'prob_dyn_02',
    title: 'Rotational Kinetic Energy of Robotic Joint',
    description: 'A robot link with moment of inertia about its pivot I = 0.50 kg*m² rotates at angular velocity omega = 4.0 rad/s. Calculate its rotational kinetic energy K = 0.5 * I * omega² in Joules.',
    category: 'dynamics',
    subcategory: 'Rigid Body Kinetics',
    difficulty: 'beginner',
    tags: ['Kinetic Energy', 'Rigid Body Kinetics', 'Rotational Energy'],
    xpReward: 25,
    ratingValue: 1120,
    timeLimitSeconds: 400,
    allowedAttempts: 5,
    hints: [
      'K = 0.5 * I * omega^2.',
      'omega^2 = 4.0^2 = 16.0.',
      'K = 0.5 * 0.50 * 16.0 = 4.0 Joules.',
    ],
    questionData: {
      prompt: 'Enter kinetic energy K in Joules.',
      givenValues: { I: 0.5, omega: 4.0 },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 4.0,
      tolerance: 0.01,
      unit: 'Joules',
    },
    solution: {
      derivationSteps: [
        'K = 0.5 * I * omega^2',
        'K = 0.5 * 0.50 * (4.0)^2 = 0.25 * 16.0 = 4.00 J',
      ],
      finalAnswerDescription: 'K = 4.0 J',
    },
    explanation: 'Rotational kinetic energy forms the positive-definite quadratic core of the Lagrangian function.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 3. Gravitational Potential Energy
  {
    id: 'prob_dyn_03',
    title: 'Gravitational Potential Energy of Single-Link Arm',
    description: 'A single-link arm of mass m = 3.0 kg has its center of mass located at distance l_c = 0.25 m from the pivot. The arm makes an angle theta = 30° with the horizontal ground. Taking ground level at pivot height (h = l_c * sin(theta)) with g = 9.81 m/s², calculate the gravitational potential energy P = m * g * l_c * sin(theta) in Joules.',
    category: 'dynamics',
    subcategory: 'Rigid Body Kinetics',
    difficulty: 'beginner',
    tags: ['Potential Energy', 'Gravity', 'Lagrangian'],
    xpReward: 25,
    ratingValue: 1140,
    timeLimitSeconds: 400,
    allowedAttempts: 5,
    hints: [
      'P = m * g * l_c * sin(theta).',
      'sin(30°) = 0.50.',
      'P = 3.0 * 9.81 * 0.25 * 0.50 = 3.67875 Joules.',
    ],
    questionData: {
      prompt: 'Enter potential energy P in Joules.',
      givenValues: { m: 3.0, l_c: 0.25, thetaDeg: 30, g: 9.81 },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 3.6788,
      tolerance: 0.02,
      unit: 'Joules',
    },
    solution: {
      derivationSteps: [
        'h = l_c * sin(theta) = 0.25 * sin(pi/6) = 0.125 m',
        'P = m * g * h = 3.0 * 9.81 * 0.125 = 3.67875 J',
      ],
      finalAnswerDescription: 'P ≈ 3.679 J',
    },
    explanation: 'Gravitational potential energy establishes the conservative field generating gravity loading torques.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 4. Lagrangian Definition L = K - P
  {
    id: 'prob_dyn_04',
    title: 'Lagrangian Formulation L = K - P',
    description: 'If kinetic energy is K = 4.0 Joules and potential energy is P = 3.679 Joules, compute the value of the Lagrangian L = K - P in Joules.',
    category: 'dynamics',
    subcategory: 'Euler-Lagrange Formulation',
    difficulty: 'beginner',
    tags: ['Lagrangian', 'Euler-Lagrange', 'Dynamics'],
    xpReward: 20,
    ratingValue: 1080,
    timeLimitSeconds: 300,
    allowedAttempts: 5,
    hints: [
      'The Lagrangian is defined by L(q, q_dot) = K(q, q_dot) - P(q).',
      'L = K - P.',
      '4.0 - 3.679 = 0.321 Joules.',
    ],
    questionData: {
      prompt: 'Enter Lagrangian L in Joules.',
      givenValues: { K: 4.0, P: 3.679 },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 0.321,
      tolerance: 0.005,
      unit: 'Joules',
    },
    solution: {
      derivationSteps: [
        'L = K - P = 4.000 - 3.679 = 0.321 J',
      ],
      finalAnswerDescription: 'L = 0.321 J',
    },
    explanation: 'The Lagrangian L encapsulates the kinetic and potential energy balance of the entire mechanical system.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 5. Single-Link Arm Static Gravity Torque
  {
    id: 'prob_dyn_05',
    title: 'Single-Link Robotic Arm Static Gravity Holding Torque',
    description: 'A single-link robot arm of mass m = 5.0 kg with center of mass at l_c = 0.40 m is held horizontally stationary at theta = 0° with g = 9.81 m/s². What holding torque tau_g = m * g * l_c * cos(theta) must the motor exert to prevent the arm from falling?',
    category: 'dynamics',
    subcategory: 'Euler-Lagrange Formulation',
    difficulty: 'beginner',
    tags: ['Gravity Torque', 'Static Equilibrium', 'Holding Torque'],
    xpReward: 25,
    ratingValue: 1120,
    timeLimitSeconds: 400,
    allowedAttempts: 5,
    hints: [
      'tau_g = m * g * l_c * cos(theta).',
      'At horizontal posture theta = 0°, cos(0) = 1.0 (maximum gravity torque).',
      'tau_g = 5.0 * 9.81 * 0.40 * 1.0 = 19.62 N*m.',
    ],
    questionData: {
      prompt: 'Enter gravity holding torque in N*m.',
      givenValues: { m: 5.0, l_c: 0.4, thetaDeg: 0, g: 9.81 },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 19.62,
      tolerance: 0.05,
      unit: 'N*m',
    },
    solution: {
      derivationSteps: [
        'tau_g = m * g * l_c * cos(theta)',
        'tau_g = 5.0 * 9.81 * 0.40 * cos(0) = 19.62 N*m',
      ],
      finalAnswerDescription: 'tau_g = 19.62 N*m',
    },
    explanation: 'Maximum gravitational load occurs when the link is perpendicular to gravity (horizontal posture).',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 6. Inertia Matrix Positive Definiteness Property
  {
    id: 'prob_dyn_06',
    title: 'Manipulator Mass Matrix M(q) Positive Definiteness',
    description: 'For any serial manipulator in arbitrary configuration q, is the generalized inertia/mass matrix M(q) always symmetric and strictly positive-definite (q_dot^T * M(q) * q_dot > 0 for all non-zero q_dot)? (1=Yes, 0=No).',
    category: 'dynamics',
    subcategory: 'Euler-Lagrange Formulation',
    difficulty: 'beginner',
    tags: ['Mass Matrix', 'Positive Definite', 'Properties'],
    xpReward: 25,
    ratingValue: 1100,
    timeLimitSeconds: 300,
    allowedAttempts: 5,
    hints: [
      'Kinetic energy is K = 0.5 * q_dot^T * M(q) * q_dot.',
      'Since physical kinetic energy is always strictly positive for any non-zero motion, M(q) must be positive-definite.',
      'Enter 1 for Yes, 0 for No.',
    ],
    questionData: {
      prompt: 'Enter 1 for Yes, 0 for No.',
      givenValues: { matrix: 'M(q)' },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 1.0,
      tolerance: 0.001,
    },
    solution: {
      derivationSteps: [
        'Because physical kinetic energy K = 1/2 q_dot^T M(q) q_dot > 0 for all q_dot != 0, M(q) is strictly positive definite and symmetric.',
      ],
      finalAnswerDescription: '1.0 (Yes)',
    },
    explanation: 'Positive definiteness guarantees that M(q) is always invertible throughout the entire workspace.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 7. Fundamental Passivity / Skew-Symmetry Property
  {
    id: 'prob_dyn_07',
    title: 'Passivity Property: Skew-Symmetry of M_dot(q) - 2*C(q, q_dot)',
    description: 'A fundamental property in robotic dynamics and Lyapunov control is that the matrix N(q, q_dot) = M_dot(q) - 2*C(q, q_dot) is skew-symmetric. What is the value of the quadratic form z^T * (M_dot - 2*C) * z for any arbitrary vector z?',
    category: 'dynamics',
    subcategory: 'Euler-Lagrange Formulation',
    difficulty: 'intermediate',
    tags: ['Skew-Symmetry', 'Passivity', 'Lyapunov', 'Coriolis'],
    xpReward: 35,
    ratingValue: 1280,
    timeLimitSeconds: 400,
    allowedAttempts: 5,
    hints: [
      'For any skew-symmetric matrix A (where A^T = -A), the quadratic form z^T * A * z is identically zero.',
      'This reflects conservation of energy: d/dt(1/2 * q_dot^T * M * q_dot) = q_dot^T * tau - q_dot^T * g.',
      'Enter 0.0.',
    ],
    questionData: {
      prompt: 'Enter the scalar value of z^T * (M_dot - 2*C) * z.',
      givenValues: { matrix: 'M_dot - 2*C' },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 0.0,
      tolerance: 0.001,
    },
    solution: {
      derivationSteps: [
        'When Coriolis matrix C is defined via Christoffel symbols, M_dot - 2C is skew-symmetric.',
        'Any skew-symmetric matrix satisfies z^T * N * z = 0 for all z.',
      ],
      finalAnswerDescription: '0.0',
    },
    explanation: 'This skew-symmetry property enables Lyapunov-based proofs of asymptotic stability in computed torque control.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 8. 2R Planar Arm Mass Matrix Element M_22
  {
    id: 'prob_dyn_08',
    title: '2R Planar Robot Mass Matrix Element M22',
    description: 'In a 2R planar manipulator, link 2 has mass m2 = 2.0 kg, center of mass at l_c2 = 0.15 m, and moment of inertia I2 = 0.03 kg*m². Calculate the constant mass matrix element M22 = m2 * l_c2² + I2 in kg*m².',
    category: 'dynamics',
    subcategory: 'Euler-Lagrange Formulation',
    difficulty: 'beginner',
    tags: ['2R Dynamics', 'Mass Matrix', 'M22'],
    xpReward: 30,
    ratingValue: 1180,
    timeLimitSeconds: 400,
    allowedAttempts: 5,
    hints: [
      'M22 = m2 * l_c2^2 + I2.',
      'l_c2^2 = 0.15^2 = 0.0225.',
      'm2 * l_c2^2 = 2.0 * 0.0225 = 0.045 kg*m².',
      'M22 = 0.045 + 0.03 = 0.075 kg*m².',
    ],
    questionData: {
      prompt: 'Enter M22 in kg*m².',
      givenValues: { m2: 2.0, l_c2: 0.15, I2: 0.03 },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 0.075,
      tolerance: 0.002,
      unit: 'kg*m²',
    },
    solution: {
      derivationSteps: [
        'M22 = m2 * l_c2^2 + I2',
        'M22 = 2.0 * (0.15)^2 + 0.03 = 2.0 * 0.0225 + 0.03 = 0.045 + 0.03 = 0.075 kg*m²',
      ],
      finalAnswerDescription: 'M22 = 0.075 kg*m²',
    },
    explanation: 'M22 represents the effective rotational inertia of the forearm about the elbow axis.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 9. 2R Planar Arm Mass Matrix Coupling M_12
  {
    id: 'prob_dyn_09',
    title: '2R Planar Arm Inertial Coupling Element M12(theta2)',
    description: 'The cross-coupling inertia is M12 = m2*l_c2² + I2 + m2*l1*l_c2*cos(theta2). Given m2 = 2.0 kg, l1 = 0.40 m, l_c2 = 0.15 m, I2 = 0.03 kg*m², evaluate M12 at theta2 = 0° (fully extended) in kg*m².',
    category: 'dynamics',
    subcategory: 'Euler-Lagrange Formulation',
    difficulty: 'intermediate',
    tags: ['2R Dynamics', 'Mass Matrix', 'Inertial Coupling'],
    xpReward: 35,
    ratingValue: 1240,
    timeLimitSeconds: 500,
    allowedAttempts: 5,
    hints: [
      'm2*l_c2^2 + I2 = 0.075 kg*m² (from previous problem).',
      'm2 * l1 * l_c2 * cos(0) = 2.0 * 0.40 * 0.15 * 1.0 = 0.12 kg*m².',
      'M12 = 0.075 + 0.12 = 0.195 kg*m².',
    ],
    questionData: {
      prompt: 'Enter M12 in kg*m².',
      givenValues: { m2: 2.0, l1: 0.4, l_c2: 0.15, I2: 0.03, theta2Deg: 0 },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 0.195,
      tolerance: 0.005,
      unit: 'kg*m²',
    },
    solution: {
      derivationSteps: [
        'M12 = m2*l_c2^2 + I2 + m2*l1*l_c2*cos(theta2)',
        'M12 = 0.075 + 2.0 * 0.40 * 0.15 * cos(0) = 0.075 + 0.120 = 0.195 kg*m²',
      ],
      finalAnswerDescription: 'M12 = 0.195 kg*m²',
    },
    explanation: 'Inertial coupling M12 varies harmonically with elbow angle theta2.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 10. Centrifugal vs Coriolis Acceleration Terms
  {
    id: 'prob_dyn_10',
    title: 'Centrifugal and Coriolis Torque Distinction',
    description: 'In the nonlinear term C(q, q_dot)*q_dot, velocity product terms of the form q_dot_i² represent which physical forces: centrifugal or Coriolis? (Enter 1 for Centrifugal, 2 for Coriolis).',
    category: 'dynamics',
    subcategory: 'Euler-Lagrange Formulation',
    difficulty: 'beginner',
    tags: ['Coriolis', 'Centrifugal', 'Dynamics'],
    xpReward: 20,
    ratingValue: 1080,
    timeLimitSeconds: 300,
    allowedAttempts: 5,
    hints: [
      'Square terms q_dot_i^2 arise from the rotation of link i on itself (centrifugal forces).',
      'Cross product terms q_dot_i * q_dot_j (i != j) arise from mutual interaction (Coriolis forces).',
      'Enter 1 for Centrifugal.',
    ],
    questionData: {
      prompt: 'Enter 1 for Centrifugal, 2 for Coriolis.',
      givenValues: { term: 'q_dot_i^2' },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 1.0,
      tolerance: 0.001,
    },
    solution: {
      derivationSteps: [
        'Pure squared terms q_dot_i^2 are centrifugal terms (index 1).',
        'Cross-coupling product terms q_dot_i * q_dot_j are Coriolis terms (index 2).',
      ],
      finalAnswerDescription: '1 (Centrifugal)',
    },
    explanation: 'Centrifugal forces pull radially outward while Coriolis forces act perpendicular to relative motion.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 11. Forward Dynamics Formulation
  {
    id: 'prob_dyn_11',
    title: 'Forward Dynamics Equation for Joint Accelerations q_ddot',
    description: 'Given manipulator equation M(q)*q_ddot + C(q, q_dot)*q_dot + g(q) = tau, what is the mathematical expression for joint accelerations q_ddot for forward simulation?',
    category: 'dynamics',
    subcategory: 'Forward Dynamics',
    difficulty: 'intermediate',
    tags: ['Forward Dynamics', 'Simulation', 'Acceleration'],
    xpReward: 30,
    ratingValue: 1200,
    timeLimitSeconds: 400,
    allowedAttempts: 5,
    hints: [
      'Subtract nonlinear terms: M(q)*q_ddot = tau - C*q_dot - g.',
      'Multiply by M(q)^(-1): q_ddot = M^(-1) * (tau - C*q_dot - g).',
      'Enter 1 if q_ddot = M^(-1) * (tau - C*q_dot - g), else 0.',
    ],
    questionData: {
      prompt: 'Enter 1 if q_ddot = M^(-1) * (tau - C*q_dot - g), else 0.',
      givenValues: { equation: 'Manipulator Dynamics' },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 1.0,
      tolerance: 0.001,
    },
    solution: {
      derivationSteps: [
        'M(q)*q_ddot = tau - C(q, q_dot)*q_dot - g(q)',
        'q_ddot = M(q)^(-1) * [tau - C(q, q_dot)*q_dot - g(q)] (Option 1).',
      ],
      finalAnswerDescription: '1.0 (True)',
    },
    explanation: 'Forward dynamics simulates motion by numerically integrating q_ddot over time.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 12. Recursive Newton-Euler Algorithm (RNEA) Complexity
  {
    id: 'prob_dyn_12',
    title: 'RNEA Computational Complexity Order O(n)',
    description: 'What is the computational complexity order of the Recursive Newton-Euler Algorithm (RNEA) for computing inverse dynamics of an n-DOF serial robot? (Enter the polynomial exponent k in O(n^k)).',
    category: 'dynamics',
    subcategory: 'Inverse Dynamics Algorithms',
    difficulty: 'beginner',
    tags: ['RNEA', 'Complexity', 'Newton-Euler', 'O(n)'],
    xpReward: 25,
    ratingValue: 1120,
    timeLimitSeconds: 300,
    allowedAttempts: 5,
    hints: [
      'Luh, Walker, and Paul (1980) formulated RNEA with a forward kinematics recursion and a backward wrench recursion.',
      'Computation scales linearly with joint count: O(n) = O(n^1).',
      'Exponent k = 1.',
    ],
    questionData: {
      prompt: 'Enter exponent k in O(n^k).',
      givenValues: { algorithm: 'RNEA' },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 1.0,
      tolerance: 0.001,
    },
    solution: {
      derivationSteps: [
        'RNEA consists of one forward pass (velocities, accelerations) and one backward pass (forces, torques).',
        'Computational cost is strictly linear: O(n) => exponent k = 1.0.',
      ],
      finalAnswerDescription: '1.0 (Linear O(n))',
    },
    explanation: 'Linear O(n) scaling makes RNEA suitable for high-speed 1 kHz real-time industrial robot control.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 13. Inverse Dynamics Torque for Single Link Arm
  {
    id: 'prob_dyn_13',
    title: 'Single-Link Robotic Arm Inverse Dynamics Required Torque',
    description: 'A single-link arm with effective pivot inertia I = 0.50 kg*m² and static gravity parameter m*g*l_c = 15.0 N*m is commanded to accelerate at q_ddot = 8.0 rad/s² from rest at horizontal posture theta = 0° (q_dot = 0). Calculate required motor torque tau = I*q_ddot + m*g*l_c*cos(theta) in N*m.',
    category: 'dynamics',
    subcategory: 'Inverse Dynamics',
    difficulty: 'intermediate',
    tags: ['Inverse Dynamics', 'Torque', 'Single Link'],
    xpReward: 30,
    ratingValue: 1200,
    timeLimitSeconds: 500,
    allowedAttempts: 5,
    hints: [
      'Inertial torque: I * q_ddot = 0.50 * 8.0 = 4.0 N*m.',
      'Gravity torque: 15.0 * cos(0) = 15.0 N*m.',
      'Total torque: 4.0 + 15.0 = 19.0 N*m.',
    ],
    questionData: {
      prompt: 'Enter required torque tau in N*m.',
      givenValues: { I: 0.5, q_ddot: 8.0, mg_lc: 15.0, theta: 0 },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 19.0,
      tolerance: 0.05,
      unit: 'N*m',
    },
    solution: {
      derivationSteps: [
        'tau = I*q_ddot + m*g*l_c*cos(theta)',
        'tau = 0.50 * 8.0 + 15.0 * cos(0) = 4.0 + 15.0 = 19.0 N*m',
      ],
      finalAnswerDescription: 'tau = 19.0 N*m',
    },
    explanation: 'Inverse dynamics computes the exact actuator torque required to generate the commanded acceleration.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 14. Christoffel Symbols of First Kind
  {
    id: 'prob_dyn_14',
    title: 'Christoffel Symbols in Coriolis Matrix Formulation',
    description: 'The Christoffel symbol of the first kind is c_ijk = 0.5 * (dM_ij/dq_k + dM_ik/dq_j - dM_jk/dq_i). In a 2R arm where M22 is constant, what is the partial derivative dM_22/dq_1?',
    category: 'dynamics',
    subcategory: 'Euler-Lagrange Formulation',
    difficulty: 'beginner',
    tags: ['Christoffel Symbols', 'Mass Matrix Derivative'],
    xpReward: 25,
    ratingValue: 1100,
    timeLimitSeconds: 300,
    allowedAttempts: 5,
    hints: [
      'In the manipulator mass matrix, M22 represents the link 2 inertia about its own joint.',
      'M22 = m2*l_c2^2 + I2 is completely independent of joint angles q1 and q2.',
      'The derivative of a constant with respect to q1 is zero.',
    ],
    questionData: {
      prompt: 'Enter dM_22 / dq_1.',
      givenValues: { parameter: 'M22' },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 0.0,
      tolerance: 0.001,
    },
    solution: {
      derivationSteps: [
        'M22 = m2*l_c2^2 + I2 is constant.',
        'dM22 / dq1 = 0.0.',
      ],
      finalAnswerDescription: '0.0',
    },
    explanation: 'Constant inertia sub-blocks yield zero Christoffel contributions.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 15. Moment of Inertia of a Solid Cylinder
  {
    id: 'prob_dyn_15',
    title: 'Moment of Inertia of Solid Cylindrical Robot Joint',
    description: 'A solid circular cylindrical rotor of mass m = 2.0 kg and radius R = 0.10 m rotates about its longitudinal axis of symmetry. Calculate its moment of inertia I = 0.5 * m * R² in kg*m².',
    category: 'dynamics',
    subcategory: 'Rigid Body Kinetics',
    difficulty: 'beginner',
    tags: ['Inertia', 'Cylinder', 'Rigid Body'],
    xpReward: 20,
    ratingValue: 1080,
    timeLimitSeconds: 300,
    allowedAttempts: 5,
    hints: [
      'I = 0.5 * m * R^2.',
      'R^2 = 0.10^2 = 0.01.',
      'I = 0.5 * 2.0 * 0.01 = 0.01 kg*m².',
    ],
    questionData: {
      prompt: 'Enter moment of inertia I in kg*m².',
      givenValues: { m: 2.0, R: 0.1 },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 0.01,
      tolerance: 0.0005,
      unit: 'kg*m²',
    },
    solution: {
      derivationSteps: [
        'I = 0.5 * m * R^2 = 0.5 * 2.0 * (0.10)^2 = 0.010 kg*m²',
      ],
      finalAnswerDescription: 'I = 0.010 kg*m²',
    },
    explanation: 'Standard geometric moments of inertia populate link dynamic parameter sets in robot URDF files.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 16. Inertia Tensor Symmetry Property
  {
    id: 'prob_dyn_16',
    title: 'Inertia Tensor Symmetry Property',
    description: 'The 3x3 spatial inertia tensor I has off-diagonal products of inertia I_xy, I_xz, I_yz. Is the inertia tensor matrix I always symmetric (I = I^T)? (1=Yes, 0=No).',
    category: 'dynamics',
    subcategory: 'Rigid Body Kinetics',
    difficulty: 'beginner',
    tags: ['Inertia Tensor', 'Symmetry', 'Properties'],
    xpReward: 20,
    ratingValue: 1060,
    timeLimitSeconds: 300,
    allowedAttempts: 5,
    hints: [
      'By definition, I_xy = -int(x * y dm) = I_yx.',
      'The matrix I is symmetric and positive definite.',
      'Enter 1 for Yes, 0 for No.',
    ],
    questionData: {
      prompt: 'Enter 1 for Yes, 0 for No.',
      givenValues: { tensor: 'Inertia Tensor I' },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 1.0,
      tolerance: 0.001,
    },
    solution: {
      derivationSteps: [
        'By definition of volume integrals for products of inertia, I_ij = I_ji.',
        'Therefore the inertia tensor is always symmetric (1.0).',
      ],
      finalAnswerDescription: '1.0 (Yes)',
    },
    explanation: 'Symmetry allows rotation of the coordinate frame into principal axes where all off-diagonal products vanish.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 17. Principal Axes of Inertia
  {
    id: 'prob_dyn_17',
    title: 'Principal Axes of Inertia Definition',
    description: 'When a coordinate frame is aligned with the principal axes of inertia of a rigid body, what is the value of all off-diagonal products of inertia (I_xy, I_xz, I_yz)?',
    category: 'dynamics',
    subcategory: 'Rigid Body Kinetics',
    difficulty: 'beginner',
    tags: ['Principal Axes', 'Inertia Tensor', 'Diagonalization'],
    xpReward: 25,
    ratingValue: 1100,
    timeLimitSeconds: 300,
    allowedAttempts: 5,
    hints: [
      'Principal axes of inertia are the eigenvectors of the mass moment of inertia tensor.',
      'In the principal frame, the inertia tensor is strictly diagonal: diag(I_xx, I_yy, I_zz).',
      'All off-diagonal products of inertia vanish to zero.',
    ],
    questionData: {
      prompt: 'Enter the value of off-diagonal products of inertia.',
      givenValues: { frame: 'Principal Axes Frame' },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 0.0,
      tolerance: 0.001,
    },
    solution: {
      derivationSteps: [
        'In the principal axes reference frame, the inertia tensor is purely diagonal: I = diag(I_xx, I_yy, I_zz).',
        'All off-diagonal elements I_ij (i != j) are 0.0.',
      ],
      finalAnswerDescription: '0.0',
    },
    explanation: 'Aligning CAD coordinate frames with principal axes decouples rotational dynamic equations.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 18. Center of Mass of Two Point Masses
  {
    id: 'prob_dyn_18',
    title: 'Composite Center of Mass Calculation',
    description: 'A robot link consists of two concentrated point masses: mass m1 = 2.0 kg at position x1 = 0.10 m, and mass m2 = 3.0 kg at position x2 = 0.60 m. Calculate the composite center of mass x_cm = (m1*x1 + m2*x2) / (m1 + m2) in meters.',
    category: 'dynamics',
    subcategory: 'Rigid Body Kinetics',
    difficulty: 'beginner',
    tags: ['Center of Mass', 'Composite Body'],
    xpReward: 25,
    ratingValue: 1100,
    timeLimitSeconds: 400,
    allowedAttempts: 5,
    hints: [
      'Numerator: 2.0 * 0.10 + 3.0 * 0.60 = 0.20 + 1.80 = 2.00 kg*m.',
      'Total mass: 2.0 + 3.0 = 5.0 kg.',
      'x_cm = 2.00 / 5.0 = 0.40 m.',
    ],
    questionData: {
      prompt: 'Enter x_cm in meters.',
      givenValues: { m1: 2.0, x1: 0.1, m2: 3.0, x2: 0.6 },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 0.4,
      tolerance: 0.005,
      unit: 'meters',
    },
    solution: {
      derivationSteps: [
        'x_cm = (m1*x1 + m2*x2) / (m1 + m2)',
        'x_cm = (2.0*0.10 + 3.0*0.60) / (2.0 + 3.0) = (0.20 + 1.80) / 5.0 = 2.00 / 5.0 = 0.40 m',
      ],
      finalAnswerDescription: 'x_cm = 0.40 m',
    },
    explanation: 'Accurate center of mass identification is essential for gravity compensation control algorithms.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 19. Viscous Joint Friction Torque
  {
    id: 'prob_dyn_19',
    title: 'Linear Viscous Joint Friction Torque',
    description: 'A robot joint motor has viscous damping coefficient b_v = 0.25 N*m*s/rad. At joint rotational velocity q_dot = 4.0 rad/s, calculate the dissipative friction torque tau_f = b_v * q_dot in N*m.',
    category: 'dynamics',
    subcategory: 'Friction & Dissipation',
    difficulty: 'beginner',
    tags: ['Friction', 'Viscous Damping', 'Dissipation'],
    xpReward: 20,
    ratingValue: 1080,
    timeLimitSeconds: 300,
    allowedAttempts: 5,
    hints: [
      'Viscous damping creates a resistance torque directly proportional to angular speed.',
      'tau_f = b_v * q_dot.',
      '0.25 * 4.0 = 1.0 N*m.',
    ],
    questionData: {
      prompt: 'Enter friction torque tau_f in N*m.',
      givenValues: { b_v: 0.25, q_dot: 4.0 },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 1.0,
      tolerance: 0.01,
      unit: 'N*m',
    },
    solution: {
      derivationSteps: [
        'tau_f = b_v * q_dot = 0.25 * 4.0 = 1.00 N*m',
      ],
      finalAnswerDescription: 'tau_f = 1.00 N*m',
    },
    explanation: 'Viscous damping adds velocity-proportional drag that aids control loop stability.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 20. Coulomb Dry Friction Torque
  {
    id: 'prob_dyn_20',
    title: 'Coulomb Dry Friction Torque Modeling',
    description: 'A robotic joint has Coulomb friction level tau_c = 2.5 N*m. When moving at positive velocity q_dot = +2.0 rad/s, the friction model is tau_friction = tau_c * sgn(q_dot). What is the friction torque in N*m?',
    category: 'dynamics',
    subcategory: 'Friction & Dissipation',
    difficulty: 'beginner',
    tags: ['Coulomb Friction', 'Friction Modeling'],
    xpReward: 20,
    ratingValue: 1080,
    timeLimitSeconds: 300,
    allowedAttempts: 5,
    hints: [
      'Coulomb friction exerts a constant resistive torque opposing the direction of motion.',
      'sgn(+2.0) = +1.',
      'tau_friction = 2.5 * (+1) = 2.5 N*m.',
    ],
    questionData: {
      prompt: 'Enter Coulomb friction torque in N*m.',
      givenValues: { tau_c: 2.5, q_dot: 2.0 },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 2.5,
      tolerance: 0.01,
      unit: 'N*m',
    },
    solution: {
      derivationSteps: [
        'tau_f = tau_c * sgn(q_dot) = 2.5 * sgn(+2.0) = 2.50 N*m',
      ],
      finalAnswerDescription: 'tau_f = 2.50 N*m',
    },
    explanation: 'Coulomb friction produces a constant opposing drag whenever joint velocity is non-zero.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 21. Motor Rotor Inertia Reflected Across Gearbox
  {
    id: 'prob_dyn_21',
    title: 'Reflected Rotor Inertia Through Gear Ratio N',
    description: 'A servomotor with rotor inertia J_m = 0.0002 kg*m² drives a robot joint through a speed reduction gearbox of gear ratio N = 100. What is the reflected rotor inertia J_eff = J_m * N² seen at the joint link side in kg*m²?',
    category: 'dynamics',
    subcategory: 'Actuator Dynamics',
    difficulty: 'intermediate',
    tags: ['Gearbox', 'Reflected Inertia', 'Actuators'],
    xpReward: 30,
    ratingValue: 1200,
    timeLimitSeconds: 400,
    allowedAttempts: 5,
    hints: [
      'Reflected inertia scales with the square of the gear reduction ratio: J_eff = J_m * N^2.',
      'N^2 = 100^2 = 10,000.',
      '0.0002 * 10,000 = 2.0 kg*m².',
    ],
    questionData: {
      prompt: 'Enter reflected inertia J_eff in kg*m².',
      givenValues: { J_m: 0.0002, N: 100 },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 2.0,
      tolerance: 0.02,
      unit: 'kg*m²',
    },
    solution: {
      derivationSteps: [
        'J_eff = J_m * N^2',
        'J_eff = 0.0002 * (100)^2 = 0.0002 * 10000 = 2.00 kg*m²',
      ],
      finalAnswerDescription: 'J_eff = 2.00 kg*m²',
    },
    explanation: 'High reduction ratios (N > 80) dominate link inertia, linearizing individual joint dynamics.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 22. Total Joint Kinetic Energy Including Motor
  {
    id: 'prob_dyn_22',
    title: 'Total Effective Inertia: Link Plus Reflected Rotor',
    description: 'A robot joint has physical link inertia I_link = 1.50 kg*m² and reflected motor rotor inertia J_eff = 2.00 kg*m². What is the total effective joint inertia I_total = I_link + J_eff in kg*m²?',
    category: 'dynamics',
    subcategory: 'Actuator Dynamics',
    difficulty: 'beginner',
    tags: ['Effective Inertia', 'Actuator Dynamics'],
    xpReward: 20,
    ratingValue: 1080,
    timeLimitSeconds: 300,
    allowedAttempts: 5,
    hints: [
      'Total joint inertia equals link physical inertia plus actuator reflected inertia.',
      'I_total = I_link + J_eff.',
      '1.50 + 2.00 = 3.50 kg*m².',
    ],
    questionData: {
      prompt: 'Enter total inertia I_total in kg*m².',
      givenValues: { I_link: 1.5, J_eff: 2.0 },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 3.5,
      tolerance: 0.01,
      unit: 'kg*m²',
    },
    solution: {
      derivationSteps: [
        'I_total = I_link + J_eff = 1.50 + 2.00 = 3.50 kg*m²',
      ],
      finalAnswerDescription: 'I_total = 3.50 kg*m²',
    },
    explanation: 'The motor drive must accelerate both the mechanical payload and its own spinning rotor.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 23. Work Done by Motor Torque
  {
    id: 'prob_dyn_23',
    title: 'Mechanical Work Done by Constant Motor Torque',
    description: 'A constant joint torque tau = 15.0 N*m rotates a robotic joint through an angle Delta_theta = 90° (pi/2 ≈ 1.5708 rad). Calculate the mechanical work W = tau * Delta_theta done by the motor in Joules.',
    category: 'dynamics',
    subcategory: 'Rigid Body Kinetics',
    difficulty: 'beginner',
    tags: ['Work', 'Torque', 'Energy'],
    xpReward: 25,
    ratingValue: 1100,
    timeLimitSeconds: 400,
    allowedAttempts: 5,
    hints: [
      'W = tau * Delta_theta.',
      'Delta_theta must be in radians: pi / 2 ≈ 1.570796 rad.',
      '15.0 * 1.570796 ≈ 23.5619 Joules.',
    ],
    questionData: {
      prompt: 'Enter mechanical work W in Joules.',
      givenValues: { tau: 15.0, angleDeg: 90 },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 23.5619,
      tolerance: 0.05,
      unit: 'Joules',
    },
    solution: {
      derivationSteps: [
        'Delta_theta = 90° = pi / 2 ≈ 1.570796 rad',
        'W = tau * Delta_theta = 15.0 * 1.570796 ≈ 23.5619 J',
      ],
      finalAnswerDescription: 'W ≈ 23.56 J',
    },
    explanation: 'Work done by joint torques transforms directly into kinetic and potential energy storage.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 24. Instantaneous Mechanical Power
  {
    id: 'prob_dyn_24',
    title: 'Instantaneous Mechanical Power Output P = tau * omega',
    description: 'At peak trajectory speed, a joint motor delivers torque tau = 25.0 N*m at angular velocity omega = 3.0 rad/s. What is the instantaneous mechanical power output P in Watts?',
    category: 'dynamics',
    subcategory: 'Actuator Dynamics',
    difficulty: 'beginner',
    tags: ['Power', 'Motor Sizing', 'Watts'],
    xpReward: 25,
    ratingValue: 1100,
    timeLimitSeconds: 300,
    allowedAttempts: 5,
    hints: [
      'Mechanical power is the product of joint driving torque and joint angular velocity.',
      'Power P = tau * omega.',
      '25.0 * 3.0 = 75.0 Watts.',
    ],
    questionData: {
      prompt: 'Enter power P in Watts.',
      givenValues: { tau: 25.0, omega: 3.0 },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 75.0,
      tolerance: 0.1,
      unit: 'Watts',
    },
    solution: {
      derivationSteps: [
        'P = tau * omega = 25.0 * 3.0 = 75.0 W',
      ],
      finalAnswerDescription: 'P = 75.0 W',
    },
    explanation: 'Peak power calculations govern electrical bus sizing and thermal dissipation ratings in industrial robots.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 25. Kinetic Energy Metric Tensor Formulation
  {
    id: 'prob_dyn_25',
    title: 'Kinetic Energy as Riemannian Metric Tensor',
    description: 'The manipulator mass matrix M(q) defines a Riemannian metric tensor on the joint configuration manifold. The kinetic energy distance metric is ds² = dq^T * M(q) * dq. Does a geodesic trajectory in this metric correspond to natural unforced robot motion? (1=Yes, 0=No).',
    category: 'dynamics',
    subcategory: 'Euler-Lagrange Formulation',
    difficulty: 'intermediate',
    tags: ['Riemannian Geometry', 'Metric Tensor', 'Geodesics'],
    xpReward: 35,
    ratingValue: 1250,
    timeLimitSeconds: 400,
    allowedAttempts: 5,
    hints: [
      'Geometric mechanics views the manipulator inertia matrix M(q) as defining a Riemannian metric tensor.',
      "By Maupertuis' and Hamilton's principles of least action, unforced conservative rigid body trajectories trace geodesics on the Riemannian manifold defined by M(q).",
      'Enter 1 for Yes, 0 for No.',
    ],
    questionData: {
      prompt: 'Enter 1 for Yes, 0 for No.',
      givenValues: { framework: 'Geometric Mechanics' },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 1.0,
      tolerance: 0.001,
    },
    solution: {
      derivationSteps: [
        'In Riemannian mechanics, unforced Euler-Lagrange equations d/dt(dL/dq_dot) - dL/dq = 0 are identical to the geodesic equations on (Q, M(q)).',
      ],
      finalAnswerDescription: '1.0 (Yes)',
    },
    explanation: 'Geometric mechanics views robot dynamics as geodesic flows on curved configuration manifolds.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 26. Conservative vs Non-Conservative Generalized Forces
  {
    id: 'prob_dyn_26',
    title: 'Classification of Generalized Torques in Lagrange Equations',
    description: 'In the complete Euler-Lagrange equations d/dt(dL/dq_dot) - dL/dq = tau_nc, are motor actuator torques and friction forces conservative or non-conservative generalized forces? (Enter 1 for Non-Conservative, 0 for Conservative).',
    category: 'dynamics',
    subcategory: 'Euler-Lagrange Formulation',
    difficulty: 'beginner',
    tags: ['Lagrange Equations', 'Non-Conservative', 'Generalized Forces'],
    xpReward: 20,
    ratingValue: 1080,
    timeLimitSeconds: 300,
    allowedAttempts: 5,
    hints: [
      'Conservative forces (like gravity and ideal springs) derive from potential functions and are included inside L = K - P.',
      'External actuators and dissipating friction cannot be derived from a scalar potential and enter on the right side as tau_nc.',
      'Enter 1 for Non-Conservative.',
    ],
    questionData: {
      prompt: 'Enter 1 for Non-Conservative, 0 for Conservative.',
      givenValues: { forces: 'Motor torque and friction' },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 1.0,
      tolerance: 0.001,
    },
    solution: {
      derivationSteps: [
        'Actuator torques and dissipative friction cannot be written as negative gradients of a potential function.',
        'They are non-conservative generalized forces (index 1).',
      ],
      finalAnswerDescription: '1 (Non-Conservative)',
    },
    explanation: 'Non-conservative generalized forces transfer external energy into and out of the mechanical manipulator.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 27. Gravitational Vector Gradient Definition
  {
    id: 'prob_dyn_27',
    title: 'Gravity Vector g(q) as Potential Energy Gradient',
    description: 'The gravity torque vector g(q) in manipulator dynamics is defined as which derivative of potential energy P(q)?',
    category: 'dynamics',
    subcategory: 'Euler-Lagrange Formulation',
    difficulty: 'beginner',
    tags: ['Gravity Vector', 'Potential Energy', 'Gradient'],
    xpReward: 25,
    ratingValue: 1100,
    timeLimitSeconds: 300,
    allowedAttempts: 5,
    hints: [
      'Since potential energy P depends only on joint positions q and not velocities q_dot, -dL/dq = dP/dq = g(q).',
      'g(q) = grad_q(P(q)).',
      'Enter 1 if g_i(q) = dP / dq_i, else 0.',
    ],
    questionData: {
      prompt: 'Enter 1 if g_i(q) = dP / dq_i, else 0.',
      givenValues: { definition: 'Gravity vector' },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 1.0,
      tolerance: 0.001,
    },
    solution: {
      derivationSteps: [
        'In the Euler-Lagrange equations, d/dt(dL/dq_dot) - dK/dq + dP/dq = tau.',
        'The term dP/dq defines the gravity compensation vector g(q) (1.0).',
      ],
      finalAnswerDescription: '1.0 (True)',
    },
    explanation: 'The gravity vector is the exact gradient of total gravitational potential energy with respect to joint coordinates.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 28. Inverted Pendulum Upright Equilibrium
  {
    id: 'prob_dyn_28',
    title: 'Inverted Upright Equilibrium Stability',
    description: 'A single-link arm is balanced vertically upright at theta = 90° (pi/2 rad) against gravity without motor torque. At this equilibrium posture, is the potential energy at a local maximum (unstable equilibrium)? (1=Yes, 0=No).',
    category: 'dynamics',
    subcategory: 'Rigid Body Kinetics',
    difficulty: 'beginner',
    tags: ['Equilibrium', 'Inverted Pendulum', 'Stability'],
    xpReward: 20,
    ratingValue: 1080,
    timeLimitSeconds: 300,
    allowedAttempts: 5,
    hints: [
      'At the inverted upright position, the center of mass is at its highest vertical elevation.',
      'Potential energy is maximized: d²P/dq² < 0.',
      'A local maximum of potential energy represents an unstable equilibrium.',
      'Enter 1 for Yes, 0 for No.',
    ],
    questionData: {
      prompt: 'Enter 1 for Yes (Unstable), 0 for No.',
      givenValues: { posture: 'Upright inverted theta = 90°' },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 1.0,
      tolerance: 0.001,
    },
    solution: {
      derivationSteps: [
        'P(theta) = m*g*l_c*sin(theta) reaches maximum at theta = pi/2.',
        'd²P/dtheta² = -m*g*l_c*sin(pi/2) < 0 (negative definite).',
        'Hence unstable equilibrium (1.0).',
      ],
      finalAnswerDescription: '1.0 (Yes)',
    },
    explanation: 'Unstable equilibria require active feedback control to maintain balance.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 29. Gravity Load Invariance under Arm Extension
  {
    id: 'prob_dyn_29',
    title: 'Gravity Load Variation with Elbow Extension',
    description: 'In a 2R planar arm operating in a vertical plane, does extending the elbow (increasing horizontal reach) increase or decrease the gravitational torque required at shoulder Joint 1? (Enter 1 for Increases, 0 for Decreases).',
    category: 'dynamics',
    subcategory: 'Euler-Lagrange Formulation',
    difficulty: 'beginner',
    tags: ['Gravity Torque', 'Moment Arm', '2R Arm'],
    xpReward: 20,
    ratingValue: 1080,
    timeLimitSeconds: 300,
    allowedAttempts: 5,
    hints: [
      'Torque equals force times perpendicular moment arm.',
      'Extending the elbow moves link 2 further away from the shoulder pivot, increasing the moment arm.',
      'Therefore gravitational torque increases (Option 1).',
    ],
    questionData: {
      prompt: 'Enter 1 for Increases, 0 for Decreases.',
      givenValues: { motion: 'Elbow extension' },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 1.0,
      tolerance: 0.001,
    },
    solution: {
      derivationSteps: [
        'Extending the elbow increases the horizontal distance x2 = l1*cos(q1) + l_c2*cos(q1 + q2).',
        'This increases the moment arm of gravity about Joint 1, increasing required torque (1.0).',
      ],
      finalAnswerDescription: '1 (Increases)',
    },
    explanation: 'Greater moment arms multiply gravitational torque loads on base actuators.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 30. Coriolis Matrix Linearity in Velocity
  {
    id: 'prob_dyn_30',
    title: 'Coriolis Matrix Linearity in Joint Velocity q_dot',
    description: 'The Coriolis matrix C(q, q_dot) is linearly dependent on joint velocity vector q_dot: C(q, alpha*q_dot) = alpha * C(q, q_dot). Does doubling all joint velocities quadruple the Coriolis-centrifugal torque vector C(q, q_dot)*q_dot? (1=Yes, 0=No).',
    category: 'dynamics',
    subcategory: 'Euler-Lagrange Formulation',
    difficulty: 'intermediate',
    tags: ['Coriolis', 'Quadratic Velocity', 'Dynamics'],
    xpReward: 30,
    ratingValue: 1220,
    timeLimitSeconds: 400,
    allowedAttempts: 5,
    hints: [
      'C(q, 2*q_dot) * (2*q_dot) = 2 * C(q, q_dot) * 2 * q_dot = 4 * (C * q_dot).',
      'The torque vector scales with velocity squared (quadratic scaling).',
      'Enter 1 for Yes, 0 for No.',
    ],
    questionData: {
      prompt: 'Enter 1 for Yes, 0 for No.',
      givenValues: { scaling: 'Doubling joint velocity' },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 1.0,
      tolerance: 0.001,
    },
    solution: {
      derivationSteps: [
        'The Coriolis/centrifugal generalized force tau_c = C(q, q_dot)*q_dot is quadratic in q_dot.',
        'Doubling speed: (2*q_dot)^2 = 4 times the torque (1.0).',
      ],
      finalAnswerDescription: '1.0 (Yes)',
    },
    explanation: 'Quadratic velocity scaling causes dynamic forces to surge dramatically during high-speed trajectory motions.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },
];
