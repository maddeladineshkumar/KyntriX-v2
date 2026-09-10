import type { Problem } from '../types';

export const unit2MobileProblems: Problem[] = [
  // 1. Forward Kinematics: Differential Drive Linear Velocity
  {
    id: 'prob_mob_01',
    title: 'Differential Drive Forward Kinematics: Linear Velocity v',
    description: 'A differential drive mobile robot has wheels of radius r = 0.10m separated by track width b = 0.50m. If right wheel speed is omega_R = 12.0 rad/s and left wheel speed is omega_L = 8.0 rad/s, calculate the forward linear velocity v in m/s.',
    category: 'mobile',
    subcategory: 'Differential Drive Kinematics',
    difficulty: 'beginner',
    tags: ['Mobile Robots', 'Differential Drive', 'Forward Kinematics', 'Linear Velocity'],
    xpReward: 25,
    ratingValue: 1100,
    timeLimitSeconds: 400,
    allowedAttempts: 5,
    hints: [
      'The forward linear velocity is the average of the wheel tangential speeds: v = (r / 2) * (omega_R + omega_L).',
      'v = (0.10 / 2) * (12.0 + 8.0).',
      '0.05 * 20.0 = 1.0 m/s.',
    ],
    questionData: {
      prompt: 'Enter linear velocity v in m/s.',
      givenValues: { r: 0.1, b: 0.5, omega_R: 12.0, omega_L: 8.0 },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 1.0,
      tolerance: 0.01,
      unit: 'm/s',
    },
    solution: {
      derivationSteps: [
        'v = (r / 2) * (omega_R + omega_L)',
        'v = (0.10 / 2) * (12.0 + 8.0) = 0.05 * 20.0 = 1.00 m/s',
      ],
      finalAnswerDescription: 'v = 1.00 m/s',
    },
    explanation: 'Forward speed of a differential drive robot is strictly proportional to the mean angular velocity of its drive wheels.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 2. Forward Kinematics: Differential Drive Angular Velocity
  {
    id: 'prob_mob_02',
    title: 'Differential Drive Forward Kinematics: Angular Velocity omega',
    description: 'For the same robot (r = 0.10m, b = 0.50m, omega_R = 12.0 rad/s, omega_L = 8.0 rad/s), calculate the robot turning angular velocity omega around the vertical axis in rad/s.',
    category: 'mobile',
    subcategory: 'Differential Drive Kinematics',
    difficulty: 'beginner',
    tags: ['Mobile Robots', 'Differential Drive', 'Angular Velocity', 'Yaw Rate'],
    xpReward: 25,
    ratingValue: 1120,
    timeLimitSeconds: 400,
    allowedAttempts: 5,
    hints: [
      'The angular yaw velocity is omega = (r / b) * (omega_R - omega_L).',
      'omega = (0.10 / 0.50) * (12.0 - 8.0).',
      '0.20 * 4.0 = 0.80 rad/s.',
    ],
    questionData: {
      prompt: 'Enter angular velocity omega in rad/s.',
      givenValues: { r: 0.1, b: 0.5, omega_R: 12.0, omega_L: 8.0 },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 0.8,
      tolerance: 0.01,
      unit: 'rad/s',
    },
    solution: {
      derivationSteps: [
        'omega = (r / b) * (omega_R - omega_L)',
        'omega = (0.10 / 0.50) * (12.0 - 8.0) = 0.20 * 4.0 = 0.80 rad/s',
      ],
      finalAnswerDescription: 'omega = 0.80 rad/s',
    },
    explanation: 'Turning yaw rate is proportional to the differential wheel speed divided by the wheelbase width.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 3. Instantaneous Center of Rotation (ICR)
  {
    id: 'prob_mob_03',
    title: 'Instantaneous Center of Rotation (ICR) Turning Radius R',
    description: 'For the robot moving with linear speed v = 1.0 m/s and angular speed omega = 0.80 rad/s, calculate the instantaneous turning radius R = v / omega in meters.',
    category: 'mobile',
    subcategory: 'Instantaneous Center of Rotation',
    difficulty: 'beginner',
    tags: ['ICR', 'Turning Radius', 'Curvature'],
    xpReward: 25,
    ratingValue: 1120,
    timeLimitSeconds: 400,
    allowedAttempts: 5,
    hints: [
      'In a differential drive robot, turning radius is the ratio of linear velocity to angular velocity.',
      'R = v / omega.',
      'R = 1.0 / 0.80 = 1.25 meters.',
    ],
    questionData: {
      prompt: 'Enter turning radius R in meters.',
      givenValues: { v: 1.0, omega: 0.8 },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 1.25,
      tolerance: 0.01,
      unit: 'meters',
    },
    solution: {
      derivationSteps: [
        'R = v / omega = 1.00 / 0.80 = 1.25 m',
      ],
      finalAnswerDescription: 'R = 1.25 m',
    },
    explanation: 'The robot body rotates instantaneously about the ICR located at distance R along the wheel axle axis.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 4. Pure Rotation (Turn in Place)
  {
    id: 'prob_mob_04',
    title: 'Differential Drive Pure Rotation (Zero Radius Turn)',
    description: 'To turn in place with zero linear velocity (v = 0) at an angular rate of omega = 2.0 rad/s, what must the left wheel speed omega_L be if right wheel speed is omega_R = +5.0 rad/s?',
    category: 'mobile',
    subcategory: 'Differential Drive Kinematics',
    difficulty: 'beginner',
    tags: ['Turn In Place', 'Differential Drive', 'Spin'],
    xpReward: 25,
    ratingValue: 1100,
    timeLimitSeconds: 300,
    allowedAttempts: 5,
    hints: [
      'Linear velocity is the average of the two wheel speeds: v = (r/2)*(omega_R + omega_L).',
      'For pure rotation in place, v = 0 requires omega_L = -omega_R.',
      'Since omega_R = +5.0 rad/s, omega_L = -5.0 rad/s.',
    ],
    questionData: {
      prompt: 'Enter left wheel speed omega_L in rad/s.',
      givenValues: { omega_R: 5.0, v: 0 },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: -5.0,
      tolerance: 0.01,
      unit: 'rad/s',
    },
    solution: {
      derivationSteps: [
        'v = (r / 2) * (omega_R + omega_L) = 0',
        'omega_L = -omega_R = -5.0 rad/s',
      ],
      finalAnswerDescription: 'omega_L = -5.0 rad/s',
    },
    explanation: 'Opposite equal wheel rotations spin the robot about its kinematic midpoint without translating.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 5. Inverse Kinematics: Required Right Wheel Speed
  {
    id: 'prob_mob_05',
    title: 'Inverse Kinematics: Right Wheel Speed for Desired (v, omega)',
    description: 'A differential drive AGV with r = 0.08m and wheelbase b = 0.40m needs to follow a path at forward speed v = 0.80 m/s and yaw rate omega = 0.50 rad/s. Calculate the required right wheel angular velocity omega_R in rad/s.',
    category: 'mobile',
    subcategory: 'Differential Drive Kinematics',
    difficulty: 'intermediate',
    tags: ['Inverse Kinematics', 'Mobile Robots', 'Wheel Velocity'],
    xpReward: 35,
    ratingValue: 1220,
    timeLimitSeconds: 500,
    allowedAttempts: 5,
    hints: [
      'The inverse kinematics formula is omega_R = (2*v + omega*b) / (2*r).',
      '2*v = 2 * 0.80 = 1.60.',
      'omega*b = 0.50 * 0.40 = 0.20.',
      'omega_R = (1.60 + 0.20) / (2 * 0.08) = 1.80 / 0.16 = 11.25 rad/s.',
    ],
    questionData: {
      prompt: 'Enter omega_R in rad/s.',
      givenValues: { r: 0.08, b: 0.4, v: 0.8, omega: 0.5 },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 11.25,
      tolerance: 0.05,
      unit: 'rad/s',
    },
    solution: {
      derivationSteps: [
        'omega_R = (2*v + omega*b) / (2*r)',
        'omega_R = (2*(0.80) + (0.50)*(0.40)) / (2 * 0.08)',
        'omega_R = (1.60 + 0.20) / 0.16 = 1.80 / 0.16 = 11.25 rad/s',
      ],
      finalAnswerDescription: 'omega_R = 11.25 rad/s',
    },
    explanation: 'Differential drive inverse kinematics maps commanded trajectory twists (v, omega) into individual wheel actuator speeds.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 6. Inverse Kinematics: Required Left Wheel Speed
  {
    id: 'prob_mob_06',
    title: 'Inverse Kinematics: Left Wheel Speed for Desired (v, omega)',
    description: 'For the same AGV (r = 0.08m, b = 0.40m, v = 0.80 m/s, omega = 0.50 rad/s), calculate the required left wheel speed omega_L in rad/s.',
    category: 'mobile',
    subcategory: 'Differential Drive Kinematics',
    difficulty: 'intermediate',
    tags: ['Inverse Kinematics', 'Mobile Robots', 'Left Wheel'],
    xpReward: 35,
    ratingValue: 1220,
    timeLimitSeconds: 500,
    allowedAttempts: 5,
    hints: [
      'The left wheel formula is omega_L = (2*v - omega*b) / (2*r).',
      '2*v = 1.60, omega*b = 0.20.',
      'omega_L = (1.60 - 0.20) / 0.16 = 1.40 / 0.16 = 8.75 rad/s.',
    ],
    questionData: {
      prompt: 'Enter omega_L in rad/s.',
      givenValues: { r: 0.08, b: 0.4, v: 0.8, omega: 0.5 },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 8.75,
      tolerance: 0.05,
      unit: 'rad/s',
    },
    solution: {
      derivationSteps: [
        'omega_L = (2*v - omega*b) / (2*r)',
        'omega_L = (1.60 - 0.20) / 0.16 = 1.40 / 0.16 = 8.75 rad/s',
      ],
      finalAnswerDescription: 'omega_L = 8.75 rad/s',
    },
    explanation: 'The inner wheel rotates slower than the outer wheel to execute the desired curvature.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 7. Non-Holonomic Constraint Equation
  {
    id: 'prob_mob_07',
    title: 'Non-Holonomic Rolling Without Slipping Constraint',
    description: 'A wheeled mobile robot heading at angle theta has velocity [x_dot, y_dot]. The pure rolling without slipping constraint enforces zero lateral velocity. What is the value of the non-holonomic constraint expression -x_dot*sin(theta) + y_dot*cos(theta)?',
    category: 'mobile',
    subcategory: 'Non-Holonomic Constraints',
    difficulty: 'intermediate',
    tags: ['Non-Holonomic', 'No-Slip Condition', 'Constraints'],
    xpReward: 35,
    ratingValue: 1250,
    timeLimitSeconds: 400,
    allowedAttempts: 5,
    hints: [
      'The vector [-sin(theta), cos(theta)] points in the lateral (sideways) direction perpendicular to heading.',
      'Pure rolling and no lateral slip forbids instantaneous sideways velocity.',
      'Therefore the dot product must be identically zero.',
    ],
    questionData: {
      prompt: 'Enter the scalar value of the constraint expression.',
      givenValues: { condition: 'Pure rolling without slipping' },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 0.0,
      tolerance: 0.001,
    },
    solution: {
      derivationSteps: [
        'Lateral unit normal vector is n = [-sin(theta), cos(theta)]^T.',
        'No lateral slip requires v_lateral = v · n = -x_dot*sin(theta) + y_dot*cos(theta) = 0.',
      ],
      finalAnswerDescription: '0.0 (Zero lateral velocity)',
    },
    explanation: 'This non-integrable Pfaffian constraint restricts instantaneous velocity without reducing reachable configuration space.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 8. Unicycle Kinematic Model x_dot
  {
    id: 'prob_mob_08',
    title: 'Unicycle Kinematic Model: Longitudinal Velocity x_dot',
    description: 'A unicycle robot moves with linear speed v = 1.5 m/s at a heading orientation theta = 30° (pi/6 rad). Calculate the global coordinate velocity x_dot = v * cos(theta) in m/s.',
    category: 'mobile',
    subcategory: 'Unicycle Model',
    difficulty: 'beginner',
    tags: ['Unicycle Model', 'Kinematics', 'Global Velocity'],
    xpReward: 25,
    ratingValue: 1100,
    timeLimitSeconds: 400,
    allowedAttempts: 5,
    hints: [
      'x_dot = v * cos(theta).',
      'cos(30°) = sqrt(3) / 2 ≈ 0.8660.',
      '1.5 * 0.8660 = 1.299 m/s.',
    ],
    questionData: {
      prompt: 'Enter x_dot in m/s.',
      givenValues: { v: 1.5, thetaDeg: 30 },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 1.299,
      tolerance: 0.01,
      unit: 'm/s',
    },
    solution: {
      derivationSteps: [
        'x_dot = v * cos(theta) = 1.5 * cos(pi/6) = 1.5 * 0.866025 ≈ 1.299 m/s',
      ],
      finalAnswerDescription: 'x_dot ≈ 1.299 m/s',
    },
    explanation: 'The unicycle model projects body linear velocity onto global Cartesian coordinates via heading angle theta.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 9. Unicycle Kinematic Model y_dot
  {
    id: 'prob_mob_09',
    title: 'Unicycle Kinematic Model: Lateral Global Velocity y_dot',
    description: 'For the same unicycle robot (v = 1.5 m/s at theta = 30°), calculate y_dot = v * sin(theta) in m/s.',
    category: 'mobile',
    subcategory: 'Unicycle Model',
    difficulty: 'beginner',
    tags: ['Unicycle Model', 'Kinematics', 'Global Velocity'],
    xpReward: 25,
    ratingValue: 1100,
    timeLimitSeconds: 400,
    allowedAttempts: 5,
    hints: [
      'y_dot = v * sin(theta).',
      'sin(30°) = 0.50.',
      '1.5 * 0.50 = 0.75 m/s.',
    ],
    questionData: {
      prompt: 'Enter y_dot in m/s.',
      givenValues: { v: 1.5, thetaDeg: 30 },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 0.75,
      tolerance: 0.01,
      unit: 'm/s',
    },
    solution: {
      derivationSteps: [
        'y_dot = v * sin(theta) = 1.5 * sin(pi/6) = 1.5 * 0.50 = 0.75 m/s',
      ],
      finalAnswerDescription: 'y_dot = 0.75 m/s',
    },
    explanation: 'Global y_dot tracks the vertical component of the heading trajectory vector.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 10. Wheel Encoder Odometry Distance Delta_s
  {
    id: 'prob_mob_10',
    title: 'Dead Reckoning Odometry: Incremental Distance Delta_s',
    description: 'During a time interval Delta_t, wheel optical encoders record right wheel rotation Delta_theta_R = 4.0 rad and left wheel rotation Delta_theta_L = 4.0 rad for wheel radius r = 0.10m. Calculate total linear distance traveled Delta_s in meters.',
    category: 'mobile',
    subcategory: 'Dead Reckoning & Odometry',
    difficulty: 'beginner',
    tags: ['Odometry', 'Encoders', 'Dead Reckoning', 'Distance'],
    xpReward: 25,
    ratingValue: 1120,
    timeLimitSeconds: 400,
    allowedAttempts: 5,
    hints: [
      'Forward displacement is the average linear distance travelled by the left and right wheels.',
      'Delta_s = (r / 2) * (Delta_theta_R + Delta_theta_L).',
      'Delta_s = (0.10 / 2) * (4.0 + 4.0) = 0.05 * 8.0 = 0.40 m.',
    ],
    questionData: {
      prompt: 'Enter distance Delta_s in meters.',
      givenValues: { r: 0.1, Delta_theta_R: 4.0, Delta_theta_L: 4.0 },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 0.4,
      tolerance: 0.005,
      unit: 'meters',
    },
    solution: {
      derivationSteps: [
        'Delta_s = (r / 2) * (Delta_theta_R + Delta_theta_L)',
        'Delta_s = (0.10 / 2) * (4.0 + 4.0) = 0.05 * 8.0 = 0.40 m',
      ],
      finalAnswerDescription: 'Delta_s = 0.40 m',
    },
    explanation: 'Encoder odometry integrates wheel tick pulses over discrete sampling intervals.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 11. Wheel Encoder Odometry Heading Change Delta_theta
  {
    id: 'prob_mob_11',
    title: 'Dead Reckoning Odometry: Heading Orientation Change Delta_theta',
    description: 'For wheel radius r = 0.10m and track width b = 0.40m, encoders register Delta_theta_R = 5.0 rad and Delta_theta_L = 3.0 rad. Calculate the change in heading angle Delta_theta in radians.',
    category: 'mobile',
    subcategory: 'Dead Reckoning & Odometry',
    difficulty: 'beginner',
    tags: ['Odometry', 'Heading Change', 'Dead Reckoning'],
    xpReward: 25,
    ratingValue: 1140,
    timeLimitSeconds: 400,
    allowedAttempts: 5,
    hints: [
      'Heading change in a diff-drive robot is proportional to the difference in wheel rolling distances divided by wheelbase b.',
      'Delta_theta = (r / b) * (Delta_theta_R - Delta_theta_L).',
      'Delta_theta = (0.10 / 0.40) * (5.0 - 3.0) = 0.25 * 2.0 = 0.50 rad.',
    ],
    questionData: {
      prompt: 'Enter Delta_theta in radians.',
      givenValues: { r: 0.1, b: 0.4, Delta_theta_R: 5.0, Delta_theta_L: 3.0 },
    },
    answerSchema: {
      type: 'angle',
      expectedAngleRad: 0.5,
      angleToleranceRad: 0.01,
      unit: 'radians',
    },
    solution: {
      derivationSteps: [
        'Delta_theta = (r / b) * (Delta_theta_R - Delta_theta_L)',
        'Delta_theta = (0.10 / 0.40) * (5.0 - 3.0) = 0.25 * 2.0 = 0.50 rad',
      ],
      finalAnswerDescription: 'Delta_theta = 0.50 rad',
    },
    explanation: 'Differential encoder counts update the cumulative robot orientation estimate in dead reckoning.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 12. Omnidirectional 3-Wheel Robot Kinematics
  {
    id: 'prob_mob_12',
    title: '3-Wheel Omnidirectional Drive Wheel Angle Spacing',
    description: 'In a standard symmetric 3-wheel holonomic omnidirectional robot with omni-wheels oriented around the chassis perimeter, what is the angular spacing between adjacent wheel axes in degrees?',
    category: 'mobile',
    subcategory: 'Omnidirectional Kinematics',
    difficulty: 'beginner',
    tags: ['Omni Drive', 'Holonomic', 'Wheel Geometry'],
    xpReward: 20,
    ratingValue: 1080,
    timeLimitSeconds: 300,
    allowedAttempts: 5,
    hints: [
      'Omnidirectional triangular bases symmetrically distribute wheel traction vectors.',
      'The 3 wheels are evenly spaced around a circle of 360°.',
      '360° / 3 = 120°.',
    ],
    questionData: {
      prompt: 'Enter wheel spacing in degrees.',
      givenValues: { wheelCount: 3 },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 120.0,
      tolerance: 0.1,
      unit: 'degrees',
    },
    solution: {
      derivationSteps: [
        'Equiangular distribution around circular chassis: 360° / 3 = 120°.',
      ],
      finalAnswerDescription: '120°',
    },
    explanation: 'A 120° symmetric wheel layout spans the 2D plane uniformly, enabling omnidirectional holonomic mobility.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 13. Mecanum Wheel Roller Angle
  {
    id: 'prob_mob_13',
    title: 'Standard Mecanum Wheel Passive Roller Angle',
    description: 'In industrial 4-wheel Mecanum drive platforms (Swedish wheels), what is the standard angle alpha in degrees between the passive perimeter roller rotation axis and the main wheel hub axis?',
    category: 'mobile',
    subcategory: 'Mecanum Kinematics',
    difficulty: 'beginner',
    tags: ['Mecanum', 'Roller Angle', 'Holonomic'],
    xpReward: 20,
    ratingValue: 1080,
    timeLimitSeconds: 300,
    allowedAttempts: 5,
    hints: [
      'Mecanum wheels feature passive rollers mounted along the periphery of each wheel.',
      'Standard Mecanum wheels utilize angled rollers oriented at 45°.',
      'This 45° angle splits traction forces equally into longitudinal and lateral components.',
    ],
    questionData: {
      prompt: 'Enter roller angle in degrees.',
      givenValues: { wheelType: 'Mecanum' },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 45.0,
      tolerance: 0.1,
      unit: 'degrees',
    },
    solution: {
      derivationSteps: [
        'Mecanum wheels feature passive rollers angled at exactly 45° to the wheel plane.',
      ],
      finalAnswerDescription: '45°',
    },
    explanation: 'The 45° passive roller angle couples hub rotation with lateral reaction forces, enabling holonomic sideways strafing.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 14. Holonomic vs Non-Holonomic Mobility Degree
  {
    id: 'prob_mob_14',
    title: 'Degree of Mobility: Holonomic vs Non-Holonomic',
    description: 'A 4-wheel Mecanum mobile robot can instantaneously generate arbitrary linear velocities vx, vy and angular velocity omega simultaneously in the plane. Is a Mecanum robot holonomic? (1=Yes, 0=No).',
    category: 'mobile',
    subcategory: 'Mecanum Kinematics',
    difficulty: 'beginner',
    tags: ['Holonomic', 'Mecanum', 'Degree of Mobility'],
    xpReward: 20,
    ratingValue: 1050,
    timeLimitSeconds: 300,
    allowedAttempts: 5,
    hints: [
      'A robot is holonomic if its controllable degrees of freedom equal its total degrees of freedom in task space.',
      'In SE(2), task DOF = 3 (x, y, theta).',
      'Mecanum drive can move in any direction without rotating first: 3 controllable DOF = 3 task DOF.',
      'Enter 1 for Yes, 0 for No.',
    ],
    questionData: {
      prompt: 'Enter 1 for Yes (Holonomic), 0 for No.',
      givenValues: { platform: 'Mecanum 4WD' },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 1.0,
      tolerance: 0.001,
    },
    solution: {
      derivationSteps: [
        'Mecanum platforms possess 3 controllable degrees of freedom matching the 3 DOF of planar SE(2) motion.',
        'Therefore Mecanum platforms are holonomic (1.0).',
      ],
      finalAnswerDescription: '1.0 (Yes)',
    },
    explanation: 'Holonomic mobile robots eliminate non-holonomic constraints, simplifying path planning and docking maneuvers.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 15. Straight Line Motion Condition
  {
    id: 'prob_mob_15',
    title: 'Differential Drive Pure Straight Line Condition',
    description: 'For a differential drive robot to travel in a pure straight line with zero curvature (omega = 0), what is the ratio of right wheel speed to left wheel speed (omega_R / omega_L)?',
    category: 'mobile',
    subcategory: 'Differential Drive Kinematics',
    difficulty: 'beginner',
    tags: ['Differential Drive', 'Straight Line', 'Ratio'],
    xpReward: 20,
    ratingValue: 1050,
    timeLimitSeconds: 300,
    allowedAttempts: 5,
    hints: [
      'omega = (r / b) * (omega_R - omega_L) = 0.',
      'This requires omega_R = omega_L.',
      'omega_R / omega_L = 1.0.',
    ],
    questionData: {
      prompt: 'Enter speed ratio omega_R / omega_L.',
      givenValues: { motion: 'Pure straight line' },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 1.0,
      tolerance: 0.001,
    },
    solution: {
      derivationSteps: [
        'omega = (r / b) * (omega_R - omega_L) = 0 => omega_R = omega_L',
        'Ratio = 1.0.',
      ],
      finalAnswerDescription: '1.0',
    },
    explanation: 'Identical wheel speeds result in an infinite ICR radius, generating linear translational motion.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 16. Tricycle Drive Steering Angle
  {
    id: 'prob_mob_16',
    title: 'Tricycle Model Turning Radius R from Steering Angle alpha',
    description: 'In a tricycle drive robot with wheelbase L = 1.0m (distance from rear axle to steered front wheel), the front wheel is steered by angle alpha = 30° (pi/6 rad). Calculate the turning radius R = L / tan(alpha) in meters.',
    category: 'mobile',
    subcategory: 'Tricycle & Car-Like Kinematics',
    difficulty: 'intermediate',
    tags: ['Tricycle', 'Ackerman', 'Steering Angle', 'Curvature'],
    xpReward: 30,
    ratingValue: 1180,
    timeLimitSeconds: 500,
    allowedAttempts: 5,
    hints: [
      'R = L / tan(alpha).',
      'tan(30°) = 1 / sqrt(3) ≈ 0.57735.',
      'R = 1.0 / 0.57735 = sqrt(3) ≈ 1.732 meters.',
    ],
    questionData: {
      prompt: 'Enter turning radius R in meters.',
      givenValues: { L: 1.0, alphaDeg: 30 },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 1.732,
      tolerance: 0.01,
      unit: 'meters',
    },
    solution: {
      derivationSteps: [
        'R = L / tan(alpha)',
        'tan(pi/6) = 1 / sqrt(3) ≈ 0.57735',
        'R = 1.0 / 0.57735 = 1.73205 m',
      ],
      finalAnswerDescription: 'R ≈ 1.732 m',
    },
    explanation: 'Front-wheel steering angle establishes the radius of curvature via right-triangle trigonometry.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 17. Runaway Odometry Error Nature
  {
    id: 'prob_mob_17',
    title: 'Cumulative Nature of Dead Reckoning Odometry Drift',
    description: 'Dead reckoning odometry integrates wheel rotations over time. Do orientation estimation errors cause positional tracking drift that grows linearly, quadratically, or unbounded with distance traveled? (Enter 1 for unbounded/accumulating, 0 for self-correcting).',
    category: 'mobile',
    subcategory: 'Dead Reckoning & Odometry',
    difficulty: 'beginner',
    tags: ['Odometry Drift', 'Localization', 'Sensor Fusion'],
    xpReward: 20,
    ratingValue: 1080,
    timeLimitSeconds: 300,
    allowedAttempts: 5,
    hints: [
      'A small error in orientation delta_theta rotates all subsequent positional steps.',
      'Odometry is open-loop integration and has no ground-truth reference.',
      'Errors accumulate monotonically without bound (unbounded drift).',
    ],
    questionData: {
      prompt: 'Enter 1 if odometry error accumulates unbounded over time, else 0.',
      givenValues: { sensor: 'Wheel Encoders' },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 1.0,
      tolerance: 0.001,
    },
    solution: {
      derivationSteps: [
        'Orientation errors enter kinematics through trigonometric terms and integrate into growing position errors.',
        'Dead reckoning error is strictly unbounded without external sensor fusion (e.g. LiDAR SLAM) (1.0).',
      ],
      finalAnswerDescription: '1.0 (Unbounded drift)',
    },
    explanation: 'Unbounded odometric drift necessitates external reference corrections like LiDAR SLAM and landmark matching.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 18. Ackerman Steering Geometry Principle
  {
    id: 'prob_mob_18',
    title: 'Ackerman Steering Principle for Four-Wheeled Vehicles',
    description: 'In an Ackerman steering system turning through a curve, why must the inside front wheel turn at a steeper angle than the outside front wheel? (Enter 1 if the inside wheel traces a tighter circle with smaller radius, else 0).',
    category: 'mobile',
    subcategory: 'Tricycle & Car-Like Kinematics',
    difficulty: 'beginner',
    tags: ['Ackerman Steering', 'Car-Like Robots', 'No-Slip'],
    xpReward: 25,
    ratingValue: 1100,
    timeLimitSeconds: 300,
    allowedAttempts: 5,
    hints: [
      'Both front wheels must steer so their axles intersect at the same ICR on the rear axle line.',
      'The inner wheel is closer to the ICR and must turn more sharply.',
      'Enter 1 for True, 0 for False.',
    ],
    questionData: {
      prompt: 'Enter 1 for True, 0 for False.',
      givenValues: { mechanism: 'Ackerman Steering' },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 1.0,
      tolerance: 0.001,
    },
    solution: {
      derivationSteps: [
        'The inside wheel radius R_in = R - b/2 is smaller than the outside wheel radius R_out = R + b/2.',
        'To share a common ICR on the rear axle, cot(alpha_in) - cot(alpha_out) = b / L.',
        'Hence inside wheel turns steeper (1.0).',
      ],
      finalAnswerDescription: '1.0 (True)',
    },
    explanation: 'Ackerman steering geometry prevents tire scrubbing during vehicle cornering.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 19. Forward Kinematics with Equal Opposing Wheel Speeds
  {
    id: 'prob_mob_19',
    title: 'Spinning in Place Linear Velocity v',
    description: 'A differential drive mobile robot rotates in place with omega_R = +8.0 rad/s and omega_L = -8.0 rad/s (wheel radius r = 0.12m, track b = 0.60m). What is its linear forward velocity v in m/s?',
    category: 'mobile',
    subcategory: 'Differential Drive Kinematics',
    difficulty: 'beginner',
    tags: ['Differential Drive', 'Spin in Place'],
    xpReward: 20,
    ratingValue: 1060,
    timeLimitSeconds: 300,
    allowedAttempts: 5,
    hints: [
      'In a differential drive vehicle, forward speed is given by v = (r / 2) * (omega_R + omega_L).',
      'v = (r / 2) * (omega_R + omega_L).',
      'v = (0.12 / 2) * (8.0 + (-8.0)) = 0.06 * 0 = 0.0 m/s.',
    ],
    questionData: {
      prompt: 'Enter linear velocity v in m/s.',
      givenValues: { omega_R: 8.0, omega_L: -8.0 },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 0.0,
      tolerance: 0.001,
      unit: 'm/s',
    },
    solution: {
      derivationSteps: [
        'v = (r / 2) * (omega_R + omega_L) = (r / 2) * (8.0 - 8.0) = 0.0 m/s',
      ],
      finalAnswerDescription: 'v = 0.0 m/s',
    },
    explanation: 'Equal opposing wheel speeds produce zero net linear translation.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 20. Diff-Drive Yaw Rate with Opposing Wheels
  {
    id: 'prob_mob_20',
    title: 'Spinning in Place Angular Velocity omega',
    description: 'For the same robot (r = 0.12m, b = 0.60m, omega_R = 8.0 rad/s, omega_L = -8.0 rad/s), calculate its angular velocity omega in rad/s.',
    category: 'mobile',
    subcategory: 'Differential Drive Kinematics',
    difficulty: 'beginner',
    tags: ['Differential Drive', 'Spin in Place', 'Angular Velocity'],
    xpReward: 25,
    ratingValue: 1100,
    timeLimitSeconds: 400,
    allowedAttempts: 5,
    hints: [
      'omega = (r / b) * (omega_R - omega_L).',
      'omega_R - omega_L = 8.0 - (-8.0) = 16.0 rad/s.',
      'omega = (0.12 / 0.60) * 16.0 = 0.20 * 16.0 = 3.20 rad/s.',
    ],
    questionData: {
      prompt: 'Enter angular velocity omega in rad/s.',
      givenValues: { r: 0.12, b: 0.6, omega_R: 8.0, omega_L: -8.0 },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 3.2,
      tolerance: 0.01,
      unit: 'rad/s',
    },
    solution: {
      derivationSteps: [
        'omega = (r / b) * (omega_R - omega_L)',
        'omega = (0.12 / 0.60) * (8.0 - (-8.0)) = 0.20 * 16.0 = 3.20 rad/s',
      ],
      finalAnswerDescription: 'omega = 3.20 rad/s',
    },
    explanation: 'Opposing wheel speeds generate maximum rotational rate about the robot center.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 21. Wheel Slip Ratio
  {
    id: 'prob_mob_21',
    title: 'Longitudinal Wheel Slip Ratio Definition',
    description: 'When a mobile robot wheel spins at angular speed omega with radius r, but the vehicle moves at ground speed v, what is the slip ratio s when the wheel spins freely in place on ice without translating (v = 0)?',
    category: 'mobile',
    subcategory: 'Tire Mechanics & Slip',
    difficulty: 'intermediate',
    tags: ['Tire Slip', 'Traction', 'Wheel Mechanics'],
    xpReward: 30,
    ratingValue: 1200,
    timeLimitSeconds: 400,
    allowedAttempts: 5,
    hints: [
      'Wheel slip measures relative velocity difference between tyre surface and ground.',
      'Slip ratio during acceleration is s = (r*omega - v) / (r*omega).',
      'When v = 0 and omega > 0, s = (r*omega - 0) / (r*omega) = 1.0 (100% slip).',
    ],
    questionData: {
      prompt: 'Enter slip ratio s.',
      givenValues: { v: 0, omega: 10.0 },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 1.0,
      tolerance: 0.001,
    },
    solution: {
      derivationSteps: [
        's = (r*omega - v) / (r*omega) = (r*omega - 0) / (r*omega) = 1.0 (100% wheel spin).',
      ],
      finalAnswerDescription: '1.0 (100% slip)',
    },
    explanation: 'A slip ratio of 1.0 represents complete traction loss during wheel spin.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 22. Four-Wheel Differential Skid-Steer
  {
    id: 'prob_mob_22',
    title: 'Skid-Steer 4WD Effective Wheelbase Extension',
    description: 'In 4-wheel skid-steer mobile robots, wheels must scrub laterally across the ground to turn. Does lateral tire scrubbing increase the effective wheelbase width b_eff compared to the geometric track width b? (1=Yes, 0=No).',
    category: 'mobile',
    subcategory: 'Skid-Steer Kinematics',
    difficulty: 'intermediate',
    tags: ['Skid-Steer', 'Effective Track Width', 'Scrubbing'],
    xpReward: 25,
    ratingValue: 1140,
    timeLimitSeconds: 300,
    allowedAttempts: 5,
    hints: [
      'Due to tire scrub resistance, more torque is needed to turn, making the robot respond as if its track were wider.',
      'Empirical kinematic calibration models this by setting b_eff > b_geom.',
      'Enter 1 for Yes, 0 for No.',
    ],
    questionData: {
      prompt: 'Enter 1 for Yes, 0 for No.',
      givenValues: { vehicle: '4WD Skid-Steer' },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 1.0,
      tolerance: 0.001,
    },
    solution: {
      derivationSteps: [
        'Lateral scrub resistance creates an effective track width b_eff greater than nominal b (1.0).',
      ],
      finalAnswerDescription: '1.0 (Yes)',
    },
    explanation: 'Skid-steer kinematic models calibrate an enlarged effective track width to compensate for tire scrubbing.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 23. Mecanum Diagonal Wheel Pairs
  {
    id: 'prob_mob_23',
    title: 'Mecanum Drive Sideways Strafing Wheel Direction Pattern',
    description: 'To drive a 4-wheel Mecanum platform purely sideways to the right (positive vy with vx = 0, omega = 0), diagonally opposite wheel pairs must rotate in what pattern? (Enter 1 if front-left and rear-right wheels spin forward while front-right and rear-left spin backward, else 0).',
    category: 'mobile',
    subcategory: 'Mecanum Kinematics',
    difficulty: 'intermediate',
    tags: ['Mecanum', 'Strafing', 'Holonomic'],
    xpReward: 35,
    ratingValue: 1220,
    timeLimitSeconds: 400,
    allowedAttempts: 5,
    hints: [
      'Due to the 45° roller orientation, diagonal wheels create matching lateral thrust.',
      'Strafing requires spinning wheels in alternating polarities: FL (+), FR (-), RL (-), RR (+).',
      'Enter 1 for True, 0 for False.',
    ],
    questionData: {
      prompt: 'Enter 1 for True, 0 for False.',
      givenValues: { maneuver: 'Pure sideways strafe' },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 1.0,
      tolerance: 0.001,
    },
    solution: {
      derivationSteps: [
        'For pure lateral strafing: omega_FL = +omega, omega_FR = -omega, omega_RL = -omega, omega_RR = +omega.',
        'This pattern cancels longitudinal forces and adds lateral forces (1.0).',
      ],
      finalAnswerDescription: '1.0 (True)',
    },
    explanation: 'Mecanum wheel vector sums generate lateral reaction thrust without chassis rotation.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 24. Circular Trajectory Completion Time
  {
    id: 'prob_mob_24',
    title: 'Circular Orbit Completion Time in Mobile Robots',
    description: 'A differential drive robot drives along a circular path of radius R = 2.0m at constant linear speed v = 0.50 m/s. How many seconds does it take to complete one full 360° orbit (t = 2*pi*R / v)?',
    category: 'mobile',
    subcategory: 'Differential Drive Kinematics',
    difficulty: 'beginner',
    tags: ['Trajectory', 'Circular Orbit', 'Time'],
    xpReward: 25,
    ratingValue: 1100,
    timeLimitSeconds: 400,
    allowedAttempts: 5,
    hints: [
      'The robot drives around a circular trajectory of radius R.',
      'Circumference C = 2 * pi * R = 2 * pi * 2.0 = 4*pi ≈ 12.5664 m.',
      'Time t = C / v = 12.5664 / 0.50 = 25.1327 seconds.',
    ],
    questionData: {
      prompt: 'Enter time t in seconds.',
      givenValues: { R: 2.0, v: 0.5 },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 25.1327,
      tolerance: 0.1,
      unit: 'seconds',
    },
    solution: {
      derivationSteps: [
        'C = 2 * pi * R = 4 * pi ≈ 12.56637 m',
        't = C / v = 12.56637 / 0.50 ≈ 25.1327 s',
      ],
      finalAnswerDescription: 't ≈ 25.13 s',
    },
    explanation: 'Circular orbit duration depends strictly on orbit radius and path speed.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 25. Pure Rotation Time for 90 Degree Turn
  {
    id: 'prob_mob_25',
    title: 'Turn-in-Place Duration for 90° Heading Change',
    description: 'A mobile robot spins in place with constant angular velocity omega = 0.50 rad/s. How many seconds does it take to rotate by 90° (pi/2 rad)?',
    category: 'mobile',
    subcategory: 'Differential Drive Kinematics',
    difficulty: 'beginner',
    tags: ['Turn-in-Place', 'Yaw Rate', 'Duration'],
    xpReward: 20,
    ratingValue: 1080,
    timeLimitSeconds: 300,
    allowedAttempts: 5,
    hints: [
      't = Delta_theta / omega.',
      'Delta_theta = pi / 2 ≈ 1.5708 rad.',
      't = 1.5708 / 0.50 = 3.1416 seconds.',
    ],
    questionData: {
      prompt: 'Enter time t in seconds.',
      givenValues: { angleDeg: 90, omega: 0.5 },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 3.1416,
      tolerance: 0.02,
      unit: 'seconds',
    },
    solution: {
      derivationSteps: [
        'Delta_theta = pi / 2 ≈ 1.570796 rad',
        't = (pi / 2) / 0.50 = pi ≈ 3.1416 s',
      ],
      finalAnswerDescription: 't = pi ≈ 3.1416 s',
    },
    explanation: 'Rotational maneuvers in place scale inversely with steady-state yaw rate.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },

  // 26. Pure Rolling Wheel Contact Constraint
  {
    id: 'prob_mob_26',
    title: 'Ideal Wheel Contact Point Tangential Velocity',
    description: 'Under the ideal pure rolling constraint (no slipping and no skidding), what is the instantaneous velocity of the physical contact point between tire and ground relative to the fixed ground?',
    category: 'mobile',
    subcategory: 'Non-Holonomic Constraints',
    difficulty: 'beginner',
    tags: ['Pure Rolling', 'Contact Point', 'Kinematics'],
    xpReward: 20,
    ratingValue: 1050,
    timeLimitSeconds: 300,
    allowedAttempts: 5,
    hints: [
      'In rigid body rolling without slip, the instantaneous point of contact is the instantaneous center of rotation.',
      'The contact point is stationary relative to the ground.',
      'Enter 0.0 m/s.',
    ],
    questionData: {
      prompt: 'Enter contact point velocity in m/s.',
      givenValues: { condition: 'Ideal rolling without slip' },
    },
    answerSchema: {
      type: 'scalar',
      expectedScalar: 0.0,
      tolerance: 0.001,
      unit: 'm/s',
    },
    solution: {
      derivationSteps: [
        'By definition of pure rolling, the instantaneous contact point has zero relative velocity to the supporting surface: v_contact = 0.0 m/s.',
      ],
      finalAnswerDescription: '0.0 m/s',
    },
    explanation: 'The zero instantaneous velocity of the contact point is the foundational assumption of classical wheeled locomotion kinematics.',
    createdBy: 'system',
    createdAt: '2025-08-01T00:00:00.000Z',
    updatedAt: '2025-08-01T00:00:00.000Z',
  },
];
