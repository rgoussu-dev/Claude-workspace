/**
 * End-to-end test for the `walking-skeleton` vertical.
 *
 * Drives `newProject` against a real temp directory with the
 * `quarkus-cli` stack, then verifies the generated project actually
 * builds, its tests pass, and the CLI binary produced by the build
 * runs and prints what its picocli command says it should.
 *
 * Per the contributor brief: "the only part that would not be
 * exercised is the git/CI part; for those replace by a fake that
 * will do a no-op." Today the only CI-shaped side effect emitted by
 * the `quarkus-cli` stack is `vcs/git-init`; that action is replaced
 * with a no-op below. Every other deferred action (notably
 * `walking-skeleton/gradle-wrapper`) runs for real, since the wrapper
 * is the entrypoint to the build/test/run we want to exercise.
 *
 * Hermeticity: a fresh `GRADLE_USER_HOME` is used per test so the
 * scenario starts from a blank cache, mirroring a brand-new
 * developer machine. Network access to Maven Central + the Gradle
 * distribution mirror is required.
 *
 * Cost: first run downloads Gradle + the Quarkus BOM and is slow
 * (multiple minutes). The test is skipped automatically when
 * `gradle` or `java` is not on PATH, and can be disabled explicitly
 * with `KEEL_SKIP_E2E=1` for fast inner-loop iterations.
 */

import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { newProject } from '../../src/installer/new.js';
import { runActions, type RunActionsInputs } from '../../src/composition/actions.js';
import type { Action } from '../../src/composition/types.js';
import type { Prompt } from '../../src/composition/answers.js';

const E2E_TIMEOUT_MS = 20 * 60 * 1000;

const silent = {
  info: () => {},
  success: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

const noPrompt: Prompt = {
  ask: async () => {
    throw new Error('prompt should not be called in non-interactive mode');
  },
};

/**
 * Replaces the listed action ids with no-ops. The "git/CI" fakes
 * required by the brief — every other action runs for real so the
 * generated project actually gets a `gradlew` to drive.
 */
const stubActions =
  (stubbed: ReadonlySet<string>) =>
  (inputs: RunActionsInputs): Promise<void> => {
    const rewritten = inputs.actions.map(
      (a): Action =>
        stubbed.has(a.id)
          ? {
              id: a.id,
              description: `${a.description} [faked: no-op]`,
              run: () => Promise.resolve(),
            }
          : a,
    );
    return runActions({ ...inputs, actions: rewritten });
  };

const onPath = (cmd: string): boolean => {
  const probe = process.platform === 'win32' ? 'where' : 'which';
  return spawnSync(probe, [cmd], { stdio: 'ignore' }).status === 0;
};

const skipE2E = process.env.KEEL_SKIP_E2E === '1' || !onPath('gradle') || !onPath('java');

let cwd: string;
let gradleUserHome: string;

beforeEach(async () => {
  cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'keel-e2e-'));
  gradleUserHome = await fs.mkdtemp(path.join(os.tmpdir(), 'keel-e2e-gradle-'));
});

afterEach(async () => {
  await fs.remove(cwd);
  await fs.remove(gradleUserHome);
});

describe.skipIf(skipE2E)('walking-skeleton e2e', () => {
  it(
    'generates a project that builds, whose tests pass, and that runs',
    async () => {
      // 1. Generate. Fake the git side effect; everything else (the
      //    gradle wrapper task) runs for real.
      await newProject({
        cwd,
        stack: 'quarkus-cli',
        answers: {
          'walking-skeleton/quarkus-cli-bootstrap': {
            basePackage: 'com.acme.e2e',
            projectName: 'walking-skeleton-e2e',
          },
          'vcs/git-init': { remote: '', defaultBranch: 'main' },
        },
        interactive: false,
        dryRun: false,
        logger: silent,
        prompt: noPrompt,
        now: () => '2026-04-26T12:00:00Z',
        keelVersion: '0.0.0-e2e',
        runActions: stubActions(new Set(['vcs/git-init'])),
      });

      // Sanity check: wrapper landed and is executable, no .git dir
      // (git was stubbed out).
      const gradlew = path.join(cwd, 'gradlew');
      expect(await fs.pathExists(gradlew)).toBe(true);
      expect(await fs.pathExists(path.join(cwd, '.git'))).toBe(false);

      // 2. Build + test the generated project. `build` runs tests
      //    transitively, so this single invocation proves both
      //    "builds" and "tests pass".
      const env = { ...process.env, GRADLE_USER_HOME: gradleUserHome };
      const build = spawnSync(gradlew, ['--no-daemon', '--stacktrace', 'build'], {
        cwd,
        env,
        encoding: 'utf8',
      });
      if (build.status !== 0) {
        throw new Error(
          `./gradlew build failed (exit ${build.status})\n` +
            `stdout:\n${build.stdout}\nstderr:\n${build.stderr}`,
        );
      }

      // 3. Run the produced CLI binary against a sample command and
      //    verify the picocli wiring + mediator dispatch produced the
      //    expected greeting on stdout.
      const runJar = path.join(
        cwd,
        'infrastructure',
        'cli',
        'build',
        'quarkus-app',
        'quarkus-run.jar',
      );
      expect(await fs.pathExists(runJar)).toBe(true);

      const run = spawnSync('java', ['-jar', runJar, 'hello', '--name', 'E2E'], {
        cwd,
        env,
        encoding: 'utf8',
      });
      if (run.status !== 0) {
        throw new Error(
          `java -jar quarkus-run.jar failed (exit ${run.status})\n` +
            `stdout:\n${run.stdout}\nstderr:\n${run.stderr}`,
        );
      }
      expect(run.stdout).toContain('Hello, E2E!');
    },
    E2E_TIMEOUT_MS,
  );
});
