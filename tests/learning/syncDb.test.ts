import { describe, it, expect } from 'vitest';
import { Database } from '../../src/server/db/database';
import { allArenaProblems } from '../../src/server/db/problems';
import { simulationChallenges } from '../../src/server/db/challenges/seedChallenges';
import fs from 'fs';
import path from 'path';

describe('Database Synchronization', () => {
  it('synchronizes all 256 arena problems and 25 challenges into kyntrix_db.json', () => {
    // Reset to seed so kyntrix_db.json gets all updated problems and challenges
    Database.resetToSeed();

    const dbPath = path.resolve(process.cwd(), 'data/kyntrix_db.json');
    expect(fs.existsSync(dbPath)).toBe(true);

    let parsed: any;
    for (let i = 0; i < 5; i++) {
      try {
        const raw = fs.readFileSync(dbPath, 'utf8');
        parsed = JSON.parse(raw);
        if (parsed && parsed.problems && parsed.challenges) break;
      } catch {
        const end = Date.now() + 25;
        while (Date.now() < end) {}
      }
    }
    expect(parsed).toBeDefined();

    const problemKeys = Object.keys(parsed.problems);
    const challengeKeys = Object.keys(parsed.challenges);

    expect(problemKeys.length).toBe(256);
    expect(challengeKeys.length).toBe(25);
    expect(allArenaProblems.length).toBe(256);
    expect(simulationChallenges.length).toBe(25);
  });
});
