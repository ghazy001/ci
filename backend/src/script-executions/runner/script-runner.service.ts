// src/script-executions/runner/script-runner.service.ts

import { Injectable, Logger } from '@nestjs/common';
import {
  AutomationFramework,
  AutomationScriptExecutionStatus,
  BrowserTarget,
  Prisma,
} from '@prisma/client';
import { spawn } from 'child_process';
import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { ScriptExecutionReportsService } from '../reports/script-execution-reports.service';

type ExecuteScriptInput = {
  executionId: string;
  scriptId: string;
  framework: AutomationFramework;
  fileName: string;
  code: string;
  browser?: BrowserTarget | null;
  targetUrl?: string | null;
  environment?: string | null;
  variables?: Record<string, string>;
};

type CommandResult = {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
};

type ExecutionArtifact = {
  type: 'screenshot' | 'trace' | 'video' | 'report' | 'other';
  fileName: string;
  url: string;
  sizeBytes: number;
};

@Injectable()
export class ScriptRunnerService {
  private readonly logger = new Logger(ScriptRunnerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scriptExecutionReportsService: ScriptExecutionReportsService,
  ) {}

  async execute(input: ExecuteScriptInput): Promise<void> {
    const supportedFrameworks = [
      AutomationFramework.PLAYWRIGHT_TS,
      AutomationFramework.PLAYWRIGHT_PYTHON,
      AutomationFramework.CYPRESS_TS,
      AutomationFramework.SELENIUM_JAVA,
    ];

    if (!supportedFrameworks.includes(input.framework)) {
      await this.markFailed(
        input.executionId,
        `Framework ${String(input.framework)} is not supported yet for live execution`,
      );
      return;
    }

    const startedAt = new Date();

    await this.prisma.automationScriptExecution.update({
      where: { id: input.executionId },
      data: {
        status: AutomationScriptExecutionStatus.RUNNING,
        startedAt,
        logs: [
          {
            level: 'info',
            message: 'Execution started',
            timestamp: startedAt.toISOString(),
          },
          {
            level: 'info',
            message: `Framework: ${input.framework}`,
            timestamp: startedAt.toISOString(),
          },
        ] as Prisma.InputJsonValue,
      },
    });

    const tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), `testflow-exec-${input.executionId}-`),
    );

    this.logger.log(`Execution tempDir = ${tempDir}`);

    try {
      await this.prepareFrameworkProject(tempDir, input);

      const mode = process.env.LIVE_EXECUTION_MODE || 'local';

      if (mode !== 'docker') {
        await this.linkRunnerNodeModules(tempDir);
      }

      const timeoutMs = Number(process.env.LIVE_EXECUTION_TIMEOUT_MS || 120000);

      const env = {
        TARGET_URL: input.targetUrl ?? '',
        TEST_ENVIRONMENT: input.environment ?? '',
        BROWSER: this.mapBrowser(input.browser),
        ...(input.variables ?? {}),
      };

      const result =
        mode === 'docker'
          ? await this.runDockerCommand({
              executionId: input.executionId,
              tempDir,
              timeoutMs,
              framework: input.framework,
              env,
            })
          : await this.runLocalCommand({
              executionId: input.executionId,
              tempDir,
              timeoutMs,
              framework: input.framework,
              env,
            });

      const completedAt = new Date();

      const status = result.timedOut
        ? AutomationScriptExecutionStatus.TIMED_OUT
        : result.exitCode === 0
          ? AutomationScriptExecutionStatus.PASSED
          : AutomationScriptExecutionStatus.FAILED;

      const artifacts = await this.collectArtifacts(input.executionId, tempDir);

      await this.finalizeExecution({
        executionId: input.executionId,
        status,
        completedAt,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        command:
          mode === 'docker'
            ? `docker run ${this.getDockerImageForFramework(input.framework)} ${this.getDockerExecutionCommand(input.framework)}`
            : this.getLocalCommandLabel(input.framework),
        logs: await this.appendFinalLog(
          input.executionId,
          status === AutomationScriptExecutionStatus.PASSED
            ? 'success'
            : 'error',
          `Execution finished with status ${status}`,
        ),
        errorMessage:
          status === AutomationScriptExecutionStatus.PASSED
            ? null
            : result.timedOut
              ? 'Execution timed out'
              : 'Execution failed',
        artifacts,
      });
    } catch (error: unknown) {
      await this.markFailed(
        input.executionId,
        error instanceof Error ? error.message : 'Unknown execution error',
      );
    } finally {
      await fs.remove(tempDir).catch(() => undefined);
    }
  }

  private async prepareFrameworkProject(
    tempDir: string,
    input: ExecuteScriptInput,
  ): Promise<void> {
    const safeFileName = this.getSafeFileName(input);

    if (input.framework === AutomationFramework.PLAYWRIGHT_TS) {
      await this.preparePlaywrightTsProject(tempDir, input, safeFileName);
      return;
    }

    if (input.framework === AutomationFramework.CYPRESS_TS) {
      await this.prepareCypressTsProject(tempDir, input, safeFileName);
      return;
    }

    if (input.framework === AutomationFramework.PLAYWRIGHT_PYTHON) {
      await this.preparePlaywrightPythonProject(tempDir, input, safeFileName);
      return;
    }

    if (input.framework === AutomationFramework.SELENIUM_JAVA) {
      await this.prepareSeleniumJavaProject(tempDir, input, safeFileName);
      return;
    }

    throw new Error('Unsupported framework');
  }

  private async preparePlaywrightTsProject(
    tempDir: string,
    input: ExecuteScriptInput,
    safeFileName: string,
  ): Promise<void> {
    const playwrightConfig = `
import { defineConfig, devices } from '@playwright/test';

const browserName = process.env.BROWSER || 'chromium';

export default defineConfig({
  testDir: '.',
  outputDir: 'test-results',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: process.env.TARGET_URL || undefined,
    trace: 'on',
    screenshot: 'on',
    video: 'on',
  },
  projects: [
    {
      name: browserName,
      use:
        browserName === 'firefox'
          ? { ...devices['Desktop Firefox'] }
          : browserName === 'webkit'
            ? { ...devices['Desktop Safari'] }
            : { ...devices['Desktop Chrome'] },
    },
  ],
});
`.trim();

    await fs.writeFile(
      path.join(tempDir, 'playwright.config.ts'),
      playwrightConfig,
    );

    await fs.writeFile(path.join(tempDir, safeFileName), input.code);
  }

  private async prepareCypressTsProject(
    tempDir: string,
    input: ExecuteScriptInput,
    safeFileName: string,
  ): Promise<void> {
    await fs.ensureDir(path.join(tempDir, 'cypress', 'e2e'));

    const packageJson = {
      private: true,
      devDependencies: {
        cypress: '^13.17.0',
        typescript: '^5.0.0',
        'ts-node': '^10.9.0',
      },
    };

    const tsConfig = {
      compilerOptions: {
        target: 'ES2020',
        lib: ['ES2020', 'DOM'],
        types: ['cypress', 'node'],
        module: 'commonjs',
        moduleResolution: 'node',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: false,
        skipLibCheck: true,
        ignoreDeprecations: '6.0',
      },
      include: ['cypress/**/*.ts'],
    };

    const cypressConfig = `
module.exports = {
  e2e: {
    baseUrl: process.env.TARGET_URL || undefined,
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: false,
    videosFolder: 'test-results/videos',
    screenshotsFolder: 'test-results/screenshots',
    video: true,
    screenshotOnRunFailure: true,
  },
};
`.trim();

    await fs.writeFile(
      path.join(tempDir, 'package.json'),
      JSON.stringify(packageJson, null, 2),
    );

    await fs.writeFile(
      path.join(tempDir, 'tsconfig.json'),
      JSON.stringify(tsConfig, null, 2),
    );

    await fs.writeFile(path.join(tempDir, 'cypress.config.js'), cypressConfig);

    await fs.writeFile(
      path.join(tempDir, 'cypress', 'e2e', safeFileName),
      input.code,
    );
  }

  private async preparePlaywrightPythonProject(
    tempDir: string,
    input: ExecuteScriptInput,
    safeFileName: string,
  ): Promise<void> {
    const pytestIni = `
[pytest]
addopts = -s
testpaths = .
`.trim();

    await fs.writeFile(path.join(tempDir, 'pytest.ini'), pytestIni);
    await fs.writeFile(path.join(tempDir, safeFileName), input.code);
  }

  private async prepareSeleniumJavaProject(
    tempDir: string,
    input: ExecuteScriptInput,
    safeFileName: string,
  ): Promise<void> {
    const srcDir = path.join(tempDir, 'src', 'test', 'java', 'generated');

    await fs.ensureDir(srcDir);

    const pomXml = `
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>

  <groupId>ai.testflow</groupId>
  <artifactId>selenium-live-execution</artifactId>
  <version>1.0.0</version>

  <properties>
    <maven.compiler.source>17</maven.compiler.source>
    <maven.compiler.target>17</maven.compiler.target>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    <junit.jupiter.version>5.10.2</junit.jupiter.version>
    <selenium.version>4.23.0</selenium.version>
    <webdrivermanager.version>5.9.2</webdrivermanager.version>
  </properties>

  <dependencies>
    <dependency>
      <groupId>org.seleniumhq.selenium</groupId>
      <artifactId>selenium-java</artifactId>
      <version>\${selenium.version}</version>
    </dependency>

    <dependency>
      <groupId>io.github.bonigarcia</groupId>
      <artifactId>webdrivermanager</artifactId>
      <version>\${webdrivermanager.version}</version>
    </dependency>

    <dependency>
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter</artifactId>
      <version>\${junit.jupiter.version}</version>
      <scope>test</scope>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-surefire-plugin</artifactId>
        <version>3.2.5</version>
        <configuration>
          <useModulePath>false</useModulePath>
          <includes>
            <include>**/*Test.java</include>
          </includes>
          <reportsDirectory>test-results/surefire-reports</reportsDirectory>
          <systemPropertyVariables>
            <TARGET_URL>\${env.TARGET_URL}</TARGET_URL>
            <BROWSER>\${env.BROWSER}</BROWSER>
            <TEST_ENVIRONMENT>\${env.TEST_ENVIRONMENT}</TEST_ENVIRONMENT>
            <webdriver.chrome.driver>/usr/bin/chromedriver</webdriver.chrome.driver>
            <CHROME_BIN>/usr/bin/chromium</CHROME_BIN>
          </systemPropertyVariables>
        </configuration>
      </plugin>
    </plugins>
  </build>
</project>
`.trim();

    await fs.writeFile(path.join(tempDir, 'pom.xml'), pomXml);
    await fs.writeFile(path.join(srcDir, safeFileName), input.code);
  }

  private runLocalCommand(options: {
    executionId: string;
    tempDir: string;
    timeoutMs: number;
    framework: AutomationFramework;
    env: Record<string, string>;
  }): Promise<CommandResult> {
    const nodeModules = path.join(
      this.getRunnerWorkspacePath(),
      'node_modules',
    );

    if (options.framework === AutomationFramework.PLAYWRIGHT_TS) {
      return this.runCommand({
        executionId: options.executionId,
        cwd: options.tempDir,
        command: path.join(
          nodeModules,
          '.bin',
          process.platform === 'win32' ? 'playwright.cmd' : 'playwright',
        ),
        args: ['test', '--config=playwright.config.ts', '--reporter=line'],
        timeoutMs: options.timeoutMs,
        env: {
          NODE_PATH: nodeModules,
          ...options.env,
        },
      });
    }

    if (options.framework === AutomationFramework.CYPRESS_TS) {
      return this.runCommand({
        executionId: options.executionId,
        cwd: options.tempDir,
        command: path.join(
          nodeModules,
          '.bin',
          process.platform === 'win32' ? 'cypress.cmd' : 'cypress',
        ),
        args: ['run', '--config-file', 'cypress.config.js'],
        timeoutMs: options.timeoutMs,
        env: {
          NODE_PATH: nodeModules,
          ...options.env,
        },
      });
    }

    return this.runDockerCommand({
      executionId: options.executionId,
      tempDir: options.tempDir,
      timeoutMs: options.timeoutMs,
      framework: options.framework,
      env: options.env,
    });
  }

  private runDockerCommand(options: {
    executionId: string;
    tempDir: string;
    timeoutMs: number;
    framework: AutomationFramework;
    env: Record<string, string>;
  }): Promise<CommandResult> {
    const image = this.getDockerImageForFramework(options.framework);

    const dockerArgs = [
      'run',
      '--rm',
      '--cpus',
      '1',
      '--memory',
      '3g',
      '--pids-limit',
      '256',
      '--shm-size',
      '1g',
      '-v',
      `${options.tempDir}:/work`,
      '-w',
      '/work',
    ];

    for (const [key, value] of Object.entries(options.env)) {
      dockerArgs.push('-e', `${key}=${value}`);
    }

    dockerArgs.push('-e', 'NODE_PATH=/runner/node_modules');

    dockerArgs.push(
      image,
      'bash',
      '-lc',
      this.getDockerExecutionCommand(options.framework),
    );

    return this.runCommand({
      executionId: options.executionId,
      cwd: process.cwd(),
      command: 'docker',
      args: dockerArgs,
      timeoutMs: options.timeoutMs,
      env: {},
    });
  }

  private getDockerExecutionCommand(framework: AutomationFramework): string {
    if (framework === AutomationFramework.PLAYWRIGHT_TS) {
      return [
        'ln -sfn /runner/node_modules /work/node_modules',
        '/runner/node_modules/.bin/playwright test --config=playwright.config.ts --reporter=line',
      ].join(' && ');
    }

    if (framework === AutomationFramework.CYPRESS_TS) {
      return [
        'ln -sfn /runner/node_modules /work/node_modules',
        'cypress run --config-file cypress.config.js --browser electron',
      ].join(' && ');
    }

    if (framework === AutomationFramework.PLAYWRIGHT_PYTHON) {
      return 'pytest -s';
    }

    if (framework === AutomationFramework.SELENIUM_JAVA) {
      return 'mvn -q test';
    }

    return 'echo Unsupported framework && exit 1';
  }

  private getDockerImageForFramework(framework: AutomationFramework): string {
    if (framework === AutomationFramework.PLAYWRIGHT_TS) {
      return (
        process.env.LIVE_EXECUTION_PLAYWRIGHT_TS_IMAGE ||
        process.env.LIVE_EXECUTION_DOCKER_IMAGE ||
        'testflow-playwright-ts-runner'
      );
    }

    if (framework === AutomationFramework.CYPRESS_TS) {
      return (
        process.env.LIVE_EXECUTION_CYPRESS_TS_IMAGE ||
        'testflow-cypress-ts-runner'
      );
    }

    if (framework === AutomationFramework.PLAYWRIGHT_PYTHON) {
      return (
        process.env.LIVE_EXECUTION_PLAYWRIGHT_PYTHON_IMAGE ||
        'testflow-playwright-python-runner'
      );
    }

    if (framework === AutomationFramework.SELENIUM_JAVA) {
      return (
        process.env.LIVE_EXECUTION_SELENIUM_JAVA_IMAGE ||
        'testflow-selenium-java-runner'
      );
    }

    return 'testflow-playwright-ts-runner';
  }

  private getSafeFileName(input: ExecuteScriptInput): string {
    if (input.framework === AutomationFramework.PLAYWRIGHT_TS) {
      return input.fileName?.endsWith('.spec.ts')
        ? input.fileName
        : 'generated.spec.ts';
    }

    if (input.framework === AutomationFramework.CYPRESS_TS) {
      return input.fileName?.endsWith('.cy.ts')
        ? input.fileName
        : 'generated.cy.ts';
    }

    if (input.framework === AutomationFramework.PLAYWRIGHT_PYTHON) {
      return input.fileName?.endsWith('.py')
        ? input.fileName
        : 'test_generated.py';
    }

    if (input.framework === AutomationFramework.SELENIUM_JAVA) {
      return input.fileName?.endsWith('Test.java')
        ? input.fileName
        : 'GeneratedSeleniumTest.java';
    }

    return input.fileName || 'generated.spec.ts';
  }

  private getLocalCommandLabel(framework: AutomationFramework): string {
    if (framework === AutomationFramework.PLAYWRIGHT_TS) {
      return 'playwright test --config=playwright.config.ts --reporter=line';
    }

    if (framework === AutomationFramework.CYPRESS_TS) {
      return [
        'ln -sfn /runner/node_modules /work/node_modules',
        '/runner/node_modules/.bin/cypress run --project /work --config-file /work/cypress.config.js --browser electron',
      ].join(' && ');
    }

    if (framework === AutomationFramework.PLAYWRIGHT_PYTHON) {
      return 'pytest -s';
    }

    if (framework === AutomationFramework.SELENIUM_JAVA) {
      return [
        '${CHROME_BIN:-/usr/bin/chromium} --version || true',
        '${CHROMEDRIVER_BIN:-/usr/bin/chromedriver} --version || true',
        'mvn -q test',
      ].join(' && ');
    }

    return 'unknown';
  }

  private getRunnerWorkspacePath(): string {
    return path.join(process.cwd(), 'runner-workspace');
  }

  private async linkRunnerNodeModules(tempDir: string): Promise<void> {
    const runnerNodeModules = path.join(
      this.getRunnerWorkspacePath(),
      'node_modules',
    );

    const tempNodeModules = path.join(tempDir, 'node_modules');

    const exists = await fs.pathExists(runnerNodeModules);

    if (!exists) {
      throw new Error(
        `Runner workspace dependencies are missing. Run: cd runner-workspace && npm install`,
      );
    }

    if (!(await fs.pathExists(tempNodeModules))) {
      await fs.symlink(runnerNodeModules, tempNodeModules, 'dir');
    }
  }

  private runCommand(options: {
    executionId: string;
    cwd: string;
    command: string;
    args: string[];
    timeoutMs: number;
    env: Record<string, string>;
  }): Promise<CommandResult> {
    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let resolved = false;

      const safeResolve = (result: CommandResult): void => {
        if (resolved) {
          return;
        }

        resolved = true;
        resolve(result);
      };

      const appendLog = (level: 'info' | 'error', message: string): void => {
        const trimmed = message.trim();

        if (!trimmed) {
          return;
        }

        void this.appendExecutionLog(options.executionId, level, trimmed);
      };

      const child = spawn(options.command, options.args, {
        cwd: options.cwd,
        env: {
          ...process.env,
          ...options.env,
        },
        shell: process.platform === 'win32',
      });

      const timeout = setTimeout(() => {
        timedOut = true;

        appendLog('error', 'Execution timed out. Killing process...');

        child.kill('SIGKILL');
      }, options.timeoutMs);

      child.stdout.on('data', (data: Buffer | string) => {
        const chunk = data.toString();

        stdout += chunk;

        appendLog('info', chunk);
      });

      child.stderr.on('data', (data: Buffer | string) => {
        const chunk = data.toString();

        stderr += chunk;

        appendLog('error', chunk);
      });

      child.on('error', (error: Error) => {
        clearTimeout(timeout);

        appendLog('error', error.message);

        safeResolve({
          exitCode: 1,
          stdout,
          stderr: `${stderr}\n${error.message}`,
          timedOut,
        });
      });

      child.on('close', (exitCode: number | null) => {
        clearTimeout(timeout);

        appendLog(
          exitCode === 0 ? 'info' : 'error',
          `Process exited with code ${exitCode ?? 'unknown'}`,
        );

        safeResolve({
          exitCode,
          stdout,
          stderr,
          timedOut,
        });
      });
    });
  }

  private async appendExecutionLog(
    executionId: string,
    level: 'info' | 'error' | 'success' | 'warning',
    message: string,
  ): Promise<void> {
    try {
      const current = await this.prisma.automationScriptExecution.findUnique({
        where: { id: executionId },
        select: {
          logs: true,
        },
      });

      const existingLogs = Array.isArray(current?.logs) ? current.logs : [];

      await this.prisma.automationScriptExecution.update({
        where: { id: executionId },
        data: {
          logs: [
            ...existingLogs,
            {
              level,
              message,
              timestamp: new Date().toISOString(),
            },
          ] as Prisma.InputJsonValue,
        },
      });
    } catch (error: unknown) {
      this.logger.warn(
        error instanceof Error
          ? error.message
          : 'Failed to append execution log',
      );
    }
  }

  private async collectArtifacts(
    executionId: string,
    tempDir: string,
  ): Promise<Prisma.InputJsonValue> {
    const uploadRoot = path.join(
      process.cwd(),
      'uploads',
      'executions',
      executionId,
    );

    const possibleSourceDirs = [
      path.join(tempDir, 'test-results'),
      path.join(tempDir, 'playwright-report'),
      path.join(tempDir, 'cypress', 'screenshots'),
      path.join(tempDir, 'cypress', 'videos'),
      path.join(tempDir, 'target', 'surefire-reports'),
    ];

    const artifacts: ExecutionArtifact[] = [];

    this.logger.log(`process.cwd() = ${process.cwd()}`);
    this.logger.log(`Saving artifacts to: ${uploadRoot}`);

    await fs.ensureDir(uploadRoot);

    for (const sourceDir of possibleSourceDirs) {
      const exists = await fs.pathExists(sourceDir);

      if (!exists) {
        continue;
      }

      this.logger.log(`Looking for artifacts in: ${sourceDir}`);

      const files = await this.walkFiles(sourceDir);

      this.logger.log(`Found ${files.length} artifact candidate files`);

      for (const filePath of files) {
        const originalFileName = path.basename(filePath);
        const ext = path.extname(originalFileName).toLowerCase();

        let type: ExecutionArtifact['type'] = 'other';

        if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
          type = 'screenshot';
        } else if (ext === '.zip') {
          type = 'trace';
        } else if (ext === '.webm' || ext === '.mp4') {
          type = 'video';
        } else if (ext === '.html' || ext === '.xml' || ext === '.txt') {
          type = 'report';
        }

        if (type === 'other') {
          continue;
        }

        const safeFileName = `${type}-${Date.now()}-${originalFileName}`;
        const destination = path.join(uploadRoot, safeFileName);

        await fs.copy(filePath, destination);

        const stat = await fs.stat(destination);

        artifacts.push({
          type,
          fileName: safeFileName,
          url: `/uploads/executions/${executionId}/${safeFileName}`,
          sizeBytes: stat.size,
        });
      }
    }

    this.logger.log(`Saved ${artifacts.length} artifacts for ${executionId}`);

    return artifacts as Prisma.InputJsonValue;
  }

  private async walkFiles(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    const files = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          return this.walkFiles(fullPath);
        }

        return [fullPath];
      }),
    );

    return files.flat();
  }

  private async appendFinalLog(
    executionId: string,
    level: 'info' | 'success' | 'error' | 'warning',
    message: string,
  ): Promise<Prisma.InputJsonValue> {
    const current = await this.prisma.automationScriptExecution.findUnique({
      where: { id: executionId },
      select: { logs: true },
    });

    const existingLogs = Array.isArray(current?.logs) ? current.logs : [];

    return [
      ...existingLogs,
      {
        level,
        message,
        timestamp: new Date().toISOString(),
      },
    ] as Prisma.InputJsonValue;
  }

  private async finalizeExecution(params: {
    executionId: string;
    status: AutomationScriptExecutionStatus;
    completedAt?: Date;
    command?: string | null;
    exitCode?: number | null;
    stdout?: string | null;
    stderr?: string | null;
    errorMessage?: string | null;
    logs?: Prisma.InputJsonValue;
    artifacts?: Prisma.InputJsonValue;
  }): Promise<void> {
    const updatedExecution = await this.prisma.automationScriptExecution.update(
      {
        where: {
          id: params.executionId,
        },
        data: {
          status: params.status,
          completedAt: params.completedAt ?? new Date(),
          command: params.command ?? undefined,
          exitCode: params.exitCode ?? undefined,
          stdout: params.stdout ?? undefined,
          stderr: params.stderr ?? undefined,
          errorMessage: params.errorMessage ?? undefined,
          logs: params.logs,
          artifacts: params.artifacts,
        },
      },
    );

    if (
      updatedExecution.status === AutomationScriptExecutionStatus.FAILED ||
      updatedExecution.status === AutomationScriptExecutionStatus.TIMED_OUT
    ) {
      await this.createDefectReportForFailedExecution(updatedExecution.id);
    }
  }

  private async createDefectReportForFailedExecution(
    executionId: string,
  ): Promise<void> {
    try {
      await this.scriptExecutionReportsService.createDefectReportIfFailed(
        executionId,
      );
    } catch (error: unknown) {
      this.logger.warn(
        error instanceof Error
          ? `Defect report creation failed: ${error.message}`
          : 'Defect report creation failed',
      );

      const current = await this.prisma.automationScriptExecution.findUnique({
        where: { id: executionId },
        select: {
          logs: true,
        },
      });

      const existingLogs = Array.isArray(current?.logs) ? current.logs : [];

      await this.prisma.automationScriptExecution.update({
        where: {
          id: executionId,
        },
        data: {
          logs: [
            ...existingLogs,
            {
              level: 'warning',
              message:
                error instanceof Error
                  ? `Defect report creation failed: ${error.message}`
                  : 'Defect report creation failed',
              timestamp: new Date().toISOString(),
            },
          ] as Prisma.InputJsonValue,
        },
      });
    }
  }

  private async markFailed(
    executionId: string,
    message: string,
  ): Promise<void> {
    this.logger.error(message);

    const current = await this.prisma.automationScriptExecution.findUnique({
      where: { id: executionId },
      select: {
        logs: true,
      },
    });

    const existingLogs = Array.isArray(current?.logs) ? current.logs : [];

    await this.finalizeExecution({
      executionId,
      status: AutomationScriptExecutionStatus.FAILED,
      completedAt: new Date(),
      errorMessage: message,
      logs: [
        ...existingLogs,
        {
          level: 'error',
          message,
          timestamp: new Date().toISOString(),
        },
      ] as Prisma.InputJsonValue,
    });
  }

  private mapBrowser(browser?: BrowserTarget | null): string {
    if (browser === BrowserTarget.FIREFOX) return 'firefox';
    if (browser === BrowserTarget.WEBKIT) return 'webkit';

    return 'chromium';
  }
}
