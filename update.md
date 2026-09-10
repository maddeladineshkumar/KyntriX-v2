# KyntriX — Product & Implementation Update Specification

**Document:** `UPDATE.md`
**Project:** KyntriX
**Purpose:** Major product expansion specification
**Status:** Implementation specification
**Scope:** Features 1–14 from the KyntriX product roadmap

---

# 1. Objective

KyntriX is evolving from a robotics simulation and kinematics analysis application into a complete **interactive robotics learning, simulation, assessment, and competition platform**.

The existing robotics simulator must remain the core of the application.

The new systems must be built around it rather than replacing or weakening the existing simulator.

The target experience is:

```text
LEARN
  ↓
PRACTICE
  ↓
SOLVE
  ↓
SIMULATE
  ↓
VERIFY
  ↓
EARN XP / RATING
  ↓
ANALYZE PERFORMANCE
  ↓
PERSONALIZED RECOMMENDATIONS
```

The final product should feel like a polished professional robotics platform rather than a collection of unrelated features.

---

# 2. Product Principles

All implementation must follow these principles.

## 2.1 Accuracy over AI fluency

Robotics calculations must never depend blindly on an LLM.

The AI may explain mathematics, but numerical robotics calculations should be validated using KyntriX's own deterministic mathematics engine.

For example:

```text
User asks FK question
        ↓
AI interprets question
        ↓
KyntriX mathematics engine calculates FK
        ↓
AI explains result
```

NOT:

```text
User asks FK question
        ↓
LLM guesses the matrix
        ↓
Answer displayed
```

The same principle applies to:

* DH calculations
* homogeneous transformations
* FK
* IK
* Jacobians
* workspace calculations
* trajectories
* robot positions
* orientations
* error measurements

---

# 3. Major Systems To Implement

The following systems are IN SCOPE:

1. KyntriX AI
2. Problem Arena
3. Simulation Challenges
4. XP / Points / Rating
5. Leaderboards
6. Badges and Achievements
7. Learning Streaks
8. User Profiles
9. Personal Analytics
10. Difficulty and Rating System
11. Progressive AI Hint System
12. AI Doubt / Question Upload System
13. Classroom / College Mode
14. Integrated Authentication and User Account System

The following are explicitly OUT OF SCOPE for this version:

* Community/forum system
* Open community answers
* Seasonal championship system
* Open-ended robot design competitions

Do not implement these unless explicitly requested later.

---

# 4. Existing Simulator Must Remain Intact

Before modifying the existing application:

1. Understand the current architecture.
2. Identify the robotics calculation engine.
3. Identify robot definitions.
4. Identify DH implementation.
5. Identify FK implementation.
6. Identify IK implementation.
7. Identify trajectory implementation.
8. Identify workspace implementation.
9. Identify Three.js scene architecture.
10. Identify state-management architecture.
11. Identify existing routes.
12. Identify existing tests.

Do not rewrite working robotics functionality unnecessarily.

New systems should consume existing deterministic robotics functionality through reusable services/modules.

---

# 5. Authentication System

KyntriX needs a proper user account system.

## 5.1 Authentication requirements

Support:

* Email/password registration
* Email/password login
* Logout
* Password reset
* Session persistence
* Protected routes
* User profile
* Account settings

Future-ready architecture should allow:

* Google authentication
* GitHub authentication
* Institutional authentication

but these do not need to be implemented unless already supported by the existing stack.

---

# 6. User Roles

The system must support at least three roles:

```text
student
teacher
admin
```

## Student

Can:

* use simulator
* solve problems
* ask AI questions
* upload doubts
* earn XP
* gain rating
* earn badges
* view analytics
* join classrooms
* complete assignments
* view leaderboard

## Teacher

Can:

* create classroom
* generate/join classroom code
* create assignments
* select problems
* configure deadlines
* configure attempts
* monitor student performance
* view class analytics
* view submissions
* review results

## Admin

Can:

* manage users
* manage problems
* manage categories
* manage badges
* manage challenges
* manage AI configuration
* view platform analytics
* moderate system content
* manage classrooms
* disable abusive accounts

---

# 7. KyntriX AI

Create a dedicated AI system named:

**KyntriX AI**

The AI should behave as a robotics tutor rather than a generic chatbot.

---

## 7.1 AI capabilities

The AI should support:

### Tutor Mode

Explain:

* DH convention
* Standard DH
* Modified/Craig DH
* coordinate frames
* homogeneous transformation matrices
* forward kinematics
* inverse kinematics
* Jacobians
* singularities
* workspace
* manipulability
* trajectories
* robot configurations
* joint limits

---

### Debugger Mode

The user can submit:

* DH table
* matrices
* joint values
* robot configuration
* FK result
* IK result
* target pose

AI should identify likely errors.

Example:

```text
Your α₂ parameter appears inconsistent with the
selected frame convention.

Expected:
α₂ = -90°

Entered:
α₂ = +90°

This reverses the corresponding frame rotation.
```

---

### Problem Solver Mode

The AI can solve uploaded robotics questions.

The answer should contain:

1. Problem interpretation
2. Known values
3. Relevant formula
4. Step-by-step calculation
5. Result
6. Verification
7. Optional simulator visualization

---

### Exam Mode

In Exam Mode:

* Do not immediately reveal answers.
* Provide hints.
* Allow progressive assistance.
* Track hint usage.
* Optionally reduce XP for excessive hints.

---

### Simulator Assistant

Users should be able to ask:

```text
Create a 3-DOF planar robot.

Set:
L1 = 200 mm
L2 = 150 mm
L3 = 100 mm
```

The AI should generate a structured command which the application validates before applying to the simulator.

AI must never execute arbitrary code.

---

# 8. AI + Robotics Engine Architecture

Use a tool/function architecture.

Example:

```text
AI
 │
 ├── calculateFK()
 ├── calculateIK()
 ├── calculateDH()
 ├── calculateTransform()
 ├── calculateJacobian()
 ├── calculateWorkspace()
 ├── calculateTrajectory()
 ├── validateRobot()
 └── inspectSimulatorState()
```

The LLM should determine which tool is needed.

The deterministic robotics engine performs the calculation.

The AI explains the result.

---

# 9. AI Context Awareness

When the user opens KyntriX AI from the simulator, the AI should optionally receive:

```text
currentRobot
robotType
dof
dhParameters
jointValues
jointLimits
targetPose
fkResult
ikResult
jacobian
trajectory
workspace
simulationState
```

This allows questions such as:

> Why is my robot not reaching the target?

to be answered using the actual simulator state.

---

# 10. AI Question Uploads

Users should be able to submit:

* text
* image
* screenshot
* PDF

Supported workflow:

```text
Upload
   ↓
Extract content
   ↓
Identify robotics problem
   ↓
Show extracted problem
   ↓
User confirms
   ↓
Solve / Explain / Hint / Check
```

The extracted problem should be displayed before processing when OCR confidence is low.

---

# 11. AI Safety / Reliability

The AI must:

* clearly distinguish calculated values from explanations
* avoid fabricating formulas
* avoid inventing robot parameters
* identify insufficient information
* request missing parameters when required
* use deterministic calculations whenever possible
* show assumptions
* indicate units
* distinguish degrees/radians
* distinguish Standard DH and Modified DH
* verify numerical results

For calculations, use appropriate numerical tolerance.

Example:

```text
positionTolerance = 1e-3
orientationTolerance = appropriate angular tolerance
```

Do not hard-code arbitrary tolerances without understanding existing simulator precision.

---

# 12. Problem Arena

Create a dedicated area:

**KyntriX Arena**

This is the central practice and assessment system.

---

# 13. Problem Categories

Initial categories:

### DH Tables

Problems involving:

* frame assignment
* DH parameters
* Standard DH
* Modified DH
* missing parameters
* complete DH table generation

### Transformation Matrices

Problems involving:

* elementary transformations
* homogeneous matrices
* matrix multiplication
* frame transformations
* inverse transformations

### Forward Kinematics

Problems involving:

* 2-DOF
* 3-DOF
* 4-DOF
* 5-DOF
* 6-DOF
* serial manipulators
* industrial robot configurations

### Inverse Kinematics

Problems involving:

* planar robots
* 3R planar
* SCARA
* spherical wrist
* 6R robots
* numerical IK
* multiple solutions
* joint limits

### Jacobians

Problems involving:

* Jacobian construction
* velocity mapping
* singularities
* manipulability
* condition number

### Trajectory Planning

Problems involving:

* linear trajectories
* trapezoidal velocity
* cubic polynomial
* quintic polynomial
* joint-space trajectory
* Cartesian trajectory

### Workspace

Problems involving:

* reachability
* workspace limits
* workspace interpretation
* singular configurations

---

# 14. Problem Structure

Every problem should have structured metadata.

Example:

```text
id
title
description
category
subcategory
difficulty
xpReward
ratingValue
timeLimit
allowedAttempts
hintCount
questionData
answerSchema
solution
explanation
robotConfiguration
tags
createdBy
createdAt
updatedAt
```

Do not store everything as unstructured text if it can be represented mathematically.

---

# 15. Answer Validation

Answers must be validated programmatically.

Different question types require different validators.

Examples:

```text
DH parameter validator
matrix validator
scalar validator
vector validator
angle validator
joint configuration validator
pose validator
IK solution validator
trajectory validator
```

Numerical answers should support tolerances.

Example:

```text
expected = 1.5708
user = 1.5707

difference = 0.0001

if difference <= tolerance:
    correct
```

For matrices, compare element-by-element within tolerance.

For IK, validate the resulting pose rather than only comparing joint angles, because multiple valid IK solutions may exist.

---

# 16. Problem Difficulty

Use:

```text
Beginner
Intermediate
Advanced
Expert
Research
```

Difficulty should be determined using:

* mathematical complexity
* DOF
* number of steps
* number of possible solutions
* required concepts
* time expected
* historical success rate

Do not assume difficulty purely from DOF.

---

# 17. Progressive Difficulty

Users should receive recommendations based on performance.

Example:

```text
Beginner
   ↓
Intermediate
   ↓
Advanced
   ↓
Expert
   ↓
Research
```

But users should still be able to access higher difficulty problems where appropriate.

---

# 18. XP System

XP represents learning progress.

Example base values:

```text
Easy       → 10–25 XP
Medium     → 25–50 XP
Advanced   → 50–100 XP
Expert     → 100–250 XP
Research   → 250+ XP
```

Exact values should be configurable.

XP bonuses can include:

* first-attempt success
* no hints
* fast completion
* high-quality solution
* challenge completion
* assignment completion
* simulator accuracy

Avoid awarding large XP merely for opening pages or repeatedly submitting random answers.

---

# 19. XP Transaction System

Do NOT directly modify:

```text
user.xp += 100
```

from random frontend components.

Create an auditable XP transaction system.

Example:

```text
xp_transactions

id
userId
amount
reason
referenceType
referenceId
createdAt
```

This prevents cheating and makes XP history inspectable.

---

# 20. Rating System

XP and rating must be separate.

### XP

Measures learning activity/progression.

### Rating

Measures competitive problem-solving ability.

Use a rating model inspired by Elo/TrueSkill.

Rating should consider:

* problem difficulty
* expected success probability
* actual result
* opponent/benchmark difficulty where applicable

For solo problems, use a calibrated difficulty-based rating update.

---

# 21. Leaderboards

Implement:

### Global

All users.

### Weekly

Current week.

### Monthly

Current month.

### All Time

Permanent.

### College

Users associated with the same institution.

### Friends

If social relationships are later supported, otherwise omit until needed.

Leaderboard data should not require scanning every user on every page load.

Use:

* indexed queries
* cached rankings
* periodic aggregation where appropriate

---

# 22. Badges

Implement achievement infrastructure.

Badge structure:

```text
id
name
description
icon
criteria
rarity
xpReward
createdAt
```

Initial badges:

### DH Apprentice

Solve 10 DH problems.

### DH Master

Solve 100 DH problems.

### Matrix Master

Solve 50 transformation problems.

### FK Specialist

Maintain high FK accuracy.

### IK Specialist

Solve a specified number of IK problems.

### Jacobian Explorer

Complete Jacobian challenges.

### Zero Hint

Complete a defined number of problems without hints.

### Six DOF

Successfully complete 6-DOF challenges.

### KyntriX Master

Reach a configured XP threshold.

---

# 23. Achievement Engine

Achievements must be evaluated server-side.

Example:

```text
problemSolved
xpEarned
accuracyChanged
streakChanged
challengeCompleted
assignmentCompleted
ratingChanged
```

These events can trigger achievement evaluation.

Avoid putting achievement logic directly into UI components.

---

# 24. Learning Streak

Track meaningful learning activity.

A streak day should require a meaningful action such as:

* completing a problem
* completing an assignment
* completing a simulator challenge
* completing a learning activity

Simply logging in should NOT automatically count as a learning day.

Track:

```text
currentStreak
longestStreak
lastActivityDate
```

Use the user's timezone when calculating daily activity.

---

# 25. User Profile

Create a polished profile page.

Display:

```text
Avatar
Name
Username
Institution
XP
Rating
Rank
Current Streak
Longest Streak
Problems Solved
Accuracy
Badges
Skill Breakdown
Recent Activity
```

Skill breakdown:

```text
DH                 92%
Transformation     86%
FK                 81%
IK                 73%
Jacobian           64%
Trajectory         58%
```

These percentages should be calculated from meaningful performance data.

---

# 26. Personal Analytics

Create:

**KyntriX Analytics**

Include:

* total problems
* problems by category
* accuracy
* first-attempt accuracy
* average solve time
* hint usage
* difficulty distribution
* XP history
* rating history
* streak history
* simulator challenge performance

---

# 27. Weakness Detection

The analytics system should identify weaknesses.

Example:

```text
Your FK accuracy is 91%.

Your IK accuracy is 62%.

Recommended:
→ 3R planar IK
→ Multiple IK solutions
→ Joint-limit constrained IK
```

Recommendations should be generated from actual user performance.

---

# 28. AI-Powered Recommendations

The AI can explain recommendations, but the underlying recommendation signals should come from structured analytics.

Example:

```text
weakestCategory = IK
weakestSubcategory = orientation
recommendedDifficulty = Intermediate
```

AI then turns this into natural language.

---

# 29. Hint System

Every supported problem can contain multiple hints.

Example:

```text
Hint 1:
Identify the transformation between frame 1 and frame 2.

Hint 2:
Look at the rotation about the x-axis.

Hint 3:
Use the DH transformation equation.

Solution:
...
```

Hints should be progressive.

Track:

```text
hintsUsed
```

Optional scoring:

```text
0 hints → 100% reward
1 hint  → 90%
2 hints → 75%
3 hints → 60%
```

Exact percentages must be configurable.

---

# 30. Simulation Challenges

Create a challenge system tightly integrated with the simulator.

Example challenge:

> Move the end effector to the target pose.

The simulator should evaluate:

* position error
* orientation error
* joint limits
* collision
* trajectory validity
* completion time
* path efficiency

Example result:

```text
Position Error: 0.43 mm
Orientation Error: 0.18°
Joint Limits: Passed
Collision: None
Trajectory: Valid

Score: 947 / 1000
```

---

# 31. Challenge Validation

Never trust client-side completion results.

The server must receive the necessary state/result and validate where possible.

Important values should be recalculated or cryptographically verified when feasible.

Do not allow:

```text
POST /challenge/complete
{
    "score": 10000
}
```

to directly grant rewards.

---

# 32. Challenge Scoring

Example scoring components:

```text
Accuracy       40%
Efficiency     20%
Time           15%
No violations  15%
Hints          10%
```

Weights should be configurable per challenge.

---

# 33. Classroom / College Mode

Implement a classroom system.

Teachers can create:

```text
Classroom
```

with:

```text
name
description
institution
teacher
joinCode
createdAt
```

Students join using a code.

Example:

```text
KX-ROB-73A9
```

---

# 34. Classroom Dashboard

Teacher dashboard:

```text
Students
Assignments
Challenges
Average Score
Average Accuracy
Completion Rate
Weakest Topics
Top Performers
Recent Activity
```

---

# 35. Assignments

Teachers can create assignments containing selected problems.

Assignment properties:

```text
title
description
problems
startDate
dueDate
attemptLimit
timeLimit
allowHints
allowAI
XPReward
```

Teachers should be able to configure whether AI assistance is allowed.

---

# 36. Assignment Results

Students should see:

```text
Score
Accuracy
Problems completed
Time
Hints used
Attempts
```

Teachers should see class-level analytics.

---

# 37. Exam Mode

Teachers can create AI-restricted exams.

Possible configuration:

```text
AI disabled
Hints disabled
Limited attempts
Time limit
Randomized problems
Randomized values
```

Problem parameters should support controlled randomization so every student can receive a mathematically equivalent but numerically different problem.

---

# 38. Anti-Cheating

Implement reasonable protections.

Track:

* excessive submissions
* suspiciously rapid answers
* repeated answer patterns
* assignment timing
* tab visibility where technically appropriate
* answer generation patterns
* client tampering attempts

Do not rely on browser-only anti-cheat mechanisms.

The server remains authoritative.

---

# 39. Database Architecture

Use normalized structured entities.

Suggested entities:

```text
users
profiles
roles
sessions

robots
robot_configurations

problems
problem_categories
problem_attempts
problem_hints

challenges
challenge_attempts

xp_transactions
ratings
rating_history

badges
user_badges

streaks
user_statistics

ai_conversations
ai_messages
ai_usage

classrooms
classroom_members

assignments
assignment_problems
assignment_submissions
```

Exact implementation should adapt to the existing backend/database technology.

Do not introduce an entirely new database stack if the project already has a suitable persistent backend.

---

# 40. API Architecture

Separate frontend and backend responsibilities.

Suggested API groups:

```text
/api/auth
/api/users
/api/profile
/api/problems
/api/problems/:id/attempt
/api/challenges
/api/challenges/:id/submit
/api/leaderboard
/api/badges
/api/analytics
/api/ai
/api/classrooms
/api/assignments
```

All authenticated endpoints must verify the session/token server-side.

---

# 41. AI API

The AI provider must be abstracted.

Do NOT hard-code the entire application around one AI provider.

Create an interface such as:

```text
AIProvider
```

with operations such as:

```text
generateResponse()
analyzeImage()
analyzeDocument()
generateHints()
explainSolution()
```

This allows switching between providers later.

---

# 42. AI Cost Control

AI requests can become expensive.

Implement:

* token limits
* request limits
* model selection
* caching where appropriate
* usage tracking
* rate limiting

Track:

```text
userId
model
requestType
tokens
estimatedCost
timestamp
```

---

# 43. API Key Security

Never expose AI provider API keys in the frontend.

Bad:

```text
VITE_AI_API_KEY=...
```

Do not ship secret keys through Vite/client-side bundles.

Correct architecture:

```text
Frontend
   ↓
KyntriX Backend
   ↓
AI Provider
```

---

# 44. Rate Limiting

At minimum rate-limit:

* login
* registration
* password reset
* AI requests
* image/PDF processing
* problem submission
* challenge submission

Rate limits should be server-side.

---

# 45. UI / UX

The new systems must visually belong to KyntriX.

Do not create separate-looking applications for:

* simulator
* AI
* arena
* profile
* classroom

They should feel like one product.

---

# 46. Main Navigation

Recommended navigation:

```text
KyntriX
│
├── Simulator
├── Arena
├── AI
├── Challenges
├── Leaderboard
├── Learn / Progress
├── Classroom
└── Profile
```

Navigation should adapt according to user role.

---

# 47. Dashboard

After login, show a personalized dashboard.

Example:

```text
Good evening, Dinesh.

🔥 7 day streak

XP
8,420

Rating
1,842

Continue Learning
─────────────────
Inverse Kinematics
72% mastery

Recommended Challenge
─────────────────
6R IK — Joint Limits

Recent Activity
─────────────────
✓ DH Challenge +40 XP
✓ FK Challenge +75 XP
```

---

# 48. Responsive Design

Everything must work on:

* desktop
* laptop
* tablet
* mobile

However, the simulator remains optimized primarily for larger screens because of the complexity of 3D interaction.

---

# 49. Accessibility

Implement:

* keyboard navigation
* accessible labels
* readable contrast
* focus states
* semantic HTML
* screen-reader-friendly controls
* reduced-motion option where appropriate

---

# 50. Performance

Do not allow the new features to degrade simulator performance.

Especially protect:

* Three.js rendering
* animation loop
* physics/kinematics calculations
* Web Workers
* trajectory calculations

Heavy operations should remain off the main UI thread where appropriate.

---

# 51. Web Workers

Continue using Web Workers for computationally expensive operations where the existing application already does so.

Potential worker tasks:

```text
IK
workspace generation
trajectory calculations
large matrix operations
challenge validation
```

Do not move every calculation into workers unnecessarily.

---

# 52. PWA

Preserve existing PWA functionality.

The new application should remain installable if the existing architecture supports it.

Offline functionality should be considered for:

* cached UI
* documentation
* previously loaded problems

AI requests obviously require network connectivity.

---

# 53. SEO

Do not make the new application entirely dependent on client-side rendering.

Important public pages should have crawlable content:

```text
/
 /simulator
 /arena
 /challenges
 /learn
 /robots
 /kinematics
 /forward-kinematics
 /inverse-kinematics
 /dh-parameters
```

Authenticated dashboards do not need to be indexed.

---

# 54. Structured Data

Where appropriate, use schema.org structured data for public educational content.

Potential types:

```text
SoftwareApplication
WebApplication
Course
LearningResource
FAQPage
```

Only use structured data that accurately represents the page.

Do not add fake ratings, reviews, or unsupported claims.

---

# 55. Sitemap

Public crawlable pages must be included in the sitemap.

Do NOT include:

```text
/dashboard
/profile/private
/settings
/admin
/classroom/private
/ai/private-conversations
```

Dynamic private URLs should not be indexed.

---

# 56. Robots

Maintain the existing robots policy.

Ensure private/system routes are not unnecessarily crawlable.

Do not block important public educational pages.

---

# 57. Analytics

Track product events, not invasive personal data.

Examples:

```text
problem_started
problem_completed
problem_failed
hint_used
ai_question
challenge_started
challenge_completed
badge_earned
assignment_completed
classroom_joined
```

Use these events for product analytics and learning recommendations.

---

# 58. Error Handling

Every new system needs proper error states.

Examples:

```text
AI unavailable
AI rate limit
Invalid image
PDF extraction failed
Problem validation failed
Network error
Session expired
Challenge submission failed
```

Never silently fail.

---

# 59. Loading States

Every asynchronous operation must have an appropriate loading state.

Especially:

* AI responses
* OCR
* PDF processing
* problem generation
* challenge validation
* leaderboard loading
* analytics

---

# 60. Empty States

Examples:

```text
No problems solved yet.

Start your first KyntriX challenge.
```

```text
No classroom joined.

Enter a classroom code to get started.
```

```text
No badges yet.

Complete your first DH challenge.
```

---

# 61. Security

Implement:

* server-side authorization
* input validation
* output sanitization
* CSRF protection where applicable
* secure cookies/tokens
* password hashing
* rate limiting
* file-type validation
* upload-size limits
* malware-safe file handling
* SQL injection protection
* XSS protection

Never trust client-provided:

```text
XP
rating
score
role
achievement
assignment result
```

---

# 62. File Upload Security

For image/PDF questions:

* validate MIME type
* validate actual file signature
* enforce size limits
* sanitize filenames
* store files outside executable paths
* generate safe IDs
* scan where appropriate
* automatically expire temporary files where possible

---

# 63. Testing

Every major system requires tests.

### Unit tests

Test:

* XP calculation
* rating calculation
* badge criteria
* streak calculation
* numerical validators
* matrix validators
* FK validators
* IK validators
* challenge scoring

### Integration tests

Test:

```text
login
problem submission
XP award
rating update
badge award
analytics update
AI request
assignment submission
```

### End-to-end tests

Test complete user flows.

Example:

```text
Register
↓
Login
↓
Solve DH problem
↓
Receive XP
↓
Rating updated
↓
Badge unlocked
↓
Dashboard updated
```

---

# 64. Database Integrity

Use transactions for operations such as:

```text
problem submission
    ↓
validate
    ↓
create attempt
    ↓
award XP
    ↓
update rating
    ↓
check badges
    ↓
update statistics
```

These operations should not leave partially updated state.

---

# 65. Duplicate Reward Prevention

A user must not be able to repeatedly trigger rewards by replaying requests.

Use unique constraints/idempotency where appropriate.

Example:

```text
attemptId
transactionId
challengeSubmissionId
```

A completed attempt should not award XP twice.

---

# 66. Auditability

Important user actions should have records.

Especially:

* problem attempts
* XP changes
* rating changes
* assignment submissions
* challenge submissions
* admin actions

This will make debugging and abuse investigation much easier.

---

# 67. Implementation Strategy

Do NOT attempt to implement every feature simultaneously.

Use phases.

---

## Phase 0 — Existing Application Audit

Before coding:

* inspect repository
* inspect current architecture
* inspect package.json
* inspect routes
* inspect state management
* inspect backend
* inspect database
* inspect authentication
* inspect simulator
* inspect tests
* inspect deployment
* inspect current SEO
* inspect current PWA

Produce an internal architecture map.

Do not rewrite anything yet.

---

# Phase 1 — Foundation

Implement:

* authentication
* user profiles
* roles
* database foundation
* API architecture
* protected routes
* event system
* secure backend foundation

---

# Phase 2 — Problem Engine

Implement:

* problem schema
* categories
* problem rendering
* answer validation
* attempts
* hints
* difficulty
* problem database

Start with:

1. DH
2. Transformation matrices
3. FK
4. IK

Then expand.

---

# Phase 3 — Gamification

Implement:

* XP
* XP transactions
* rating
* rating history
* badges
* streaks
* leaderboard

---

# Phase 4 — AI

Implement:

* AI provider abstraction
* KyntriX AI UI
* Tutor mode
* Hint mode
* Solver mode
* Debugger mode
* simulator context
* image uploads
* PDF uploads
* AI usage tracking
* rate limiting

---

# Phase 5 — Simulation Challenges

Connect Arena with the actual 3D simulator.

Implement:

* challenge definitions
* target poses
* validation
* scoring
* submission
* results
* XP/rating integration

---

# Phase 6 — Analytics

Implement:

* personal dashboard
* category mastery
* weakness detection
* recommendations
* performance graphs
* XP/rating history

---

# Phase 7 — Classroom

Implement:

* teacher accounts
* classrooms
* join codes
* assignments
* assignment configuration
* student results
* teacher dashboard
* class analytics
* exam mode

---

# Phase 8 — Polish

Perform:

* UI consistency pass
* responsive pass
* accessibility pass
* performance optimization
* security audit
* SEO audit
* PWA audit
* testing
* deployment validation

---

# 68. Recommended Dashboard Architecture

The dashboard should become the central entry point.

```text
                    DASHBOARD
                        │
       ┌────────────────┼────────────────┐
       │                │                │
   Continue          Practice        Challenge
   Learning          Arena           Simulator
       │                │                │
       └────────────────┼────────────────┘
                        │
                  AI Assistant
                        │
              ┌─────────┼─────────┐
              │         │         │
            XP        Rating    Skills
              │         │         │
              └─────────┼─────────┘
                        │
                   Analytics
```

---

# 69. Critical UX Principle

The user should never feel that they are navigating between unrelated tools.

For example:

A user solving an IK problem should be able to:

```text
Problem
 ↓
Try Answer
 ↓
Wrong
 ↓
Get Hint
 ↓
Ask AI
 ↓
Open Simulator
 ↓
Test IK
 ↓
Submit
 ↓
Earn XP
 ↓
See Skill Improvement
```

This complete loop is one of the most important goals of the new architecture.

---

# 70. Example End-to-End Experience

User logs in.

```text
Welcome back.

🔥 5 day streak
1,420 XP
Rating 1542
```

KyntriX recommends:

> **3R Planar IK — Intermediate**

User opens it.

Question:

> Find all valid joint configurations for the given target.

User enters values.

KyntriX:

```text
Partially correct.

θ₁ ✓
θ₂ ✗
θ₃ ✓
```

User asks AI:

> Why is θ₂ wrong?

AI examines the problem and explains the mathematical issue.

User requests a hint.

KyntriX provides Hint 1.

User fixes the answer.

KyntriX validates the solution using the robotics engine.

Then:

```text
✓ Correct

Position Error: 0.002 mm

+75 XP
+18 Rating

Badge Progress:
IK Specialist 8/10
```

The analytics system records the performance.

KyntriX then recommends:

> Your IK accuracy is improving. Try a 6-DOF spherical-wrist problem next.

This is the desired product loop.

---

# 71. What NOT To Do

Do not:

* replace the simulator with an AI-generated approximation
* let the LLM perform authoritative numerical calculations
* expose API keys
* trust frontend XP/rating
* trust frontend challenge scores
* make every feature client-side
* create separate disconnected UI systems
* add unnecessary social/community features
* implement seasonal competitions in this version
* implement open-ended robot design competitions in this version
* sacrifice simulator performance
* sacrifice mathematical accuracy for UI effects
* introduce unnecessary dependencies
* rewrite working code without justification

---

# 72. Definition of Done

The update is considered successful when:

### Authentication

Users can securely create accounts, log in, maintain profiles and use protected features.

### Simulator

Existing robotics functionality continues working without regression.

### AI

Users can ask robotics questions, upload questions, receive explanations, obtain hints and interact with simulator-aware context.

### Arena

Users can solve structured robotics problems with deterministic validation.

### Gamification

Successful work produces appropriate XP, rating changes, badges and streak progress.

### Leaderboard

Users can compare competitive performance.

### Analytics

Users can understand their strengths and weaknesses.

### Challenges

Users can solve real simulation tasks and receive validated scores.

### Classroom

Teachers can create classes and assignments and analyze student performance.

### Security

Rewards and privileged operations cannot be trivially manipulated from the client.

### Performance

The new systems do not significantly degrade 3D simulation performance.

### SEO

Public educational content remains crawlable and private application data remains appropriately protected.

---

# 73. Final Product Vision

KyntriX should ultimately feel like:

```text
                 KYNTRIX
                     │
       ┌─────────────┼─────────────┐
       │             │             │
    SIMULATE       LEARN        COMPETE
       │             │             │
    3D Robots      AI Tutor     Arena
    DH Studio      AI Debugger  Challenges
    FK / IK        AI Hints     Rating
    Workspace      Doubts       Leaderboard
    Trajectory     Analytics    Badges
       │             │             │
       └─────────────┼─────────────┘
                     │
                PERSONALIZED
                  LEARNING
                     │
                  PROFILE
                     │
                CLASSROOMS
```

The defining characteristic should be the connection between these systems.

**KyntriX is not simply a robotics simulator with an AI chatbot.**

It should be a unified environment where a user can:

**learn robotics → solve robotics problems → ask an AI tutor → test concepts in a real 3D simulator → receive deterministic evaluation → earn XP/rating → identify weaknesses → receive personalized practice → and participate in structured classroom challenges.**

That integrated loop is the primary architectural and product objective of this update.
