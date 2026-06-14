#!/usr/bin/env node

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PIPELINES = new Set(['subagents', 'team-agents']);
const MODES = new Set(['ask_user', 'auto_decide', 'hybrid']);
const LEVELS = new Set(['simple', 'standard', 'full']);
const EFFORT_LEVELS = new Set(['low', 'medium', 'high', 'xhigh', 'max']);
const TERMINAL_STATES = new Set(['COMPLETE', 'FAILED', 'CANCELLED']);
const LOOP_STATE_TO_COUNTER = {
  DEBUGGING: 'debugging',
  QA: 'qa',
  CODE_REVIEW: 'review',
};

const ALLOWED_TRANSITIONS = {
  INTAKE: ['PLANNING', 'WAITING_FOR_USER', 'BLOCKED', 'CANCELLING', 'FAILED'],
  PLANNING: [
    'ARCHITECTURE',
    'WAITING_FOR_USER',
    'BLOCKED',
    'CANCELLING',
    'FAILED',
  ],
  ARCHITECTURE: [
    'ARCHITECTURE_REVIEW',
    'WAITING_FOR_USER',
    'BLOCKED',
    'CANCELLING',
    'FAILED',
  ],
  ARCHITECTURE_REVIEW: [
    'ARCHITECTURE',
    'IMPLEMENTATION',
    'WAITING_FOR_USER',
    'BLOCKED',
    'CANCELLING',
    'FAILED',
  ],
  IMPLEMENTATION: [
    'DEBUGGING',
    'QA',
    'WAITING_FOR_USER',
    'BLOCKED',
    'CANCELLING',
    'FAILED',
  ],
  DEBUGGING: [
    'IMPLEMENTATION',
    'QA',
    'WAITING_FOR_USER',
    'BLOCKED',
    'CANCELLING',
    'FAILED',
  ],
  QA: [
    'IMPLEMENTATION',
    'DEBUGGING',
    'SECURITY_REVIEW',
    'CODE_REVIEW',
    'WAITING_FOR_USER',
    'BLOCKED',
    'CANCELLING',
    'FAILED',
  ],
  SECURITY_REVIEW: [
    'IMPLEMENTATION',
    'DEBUGGING',
    'CODE_REVIEW',
    'WAITING_FOR_USER',
    'BLOCKED',
    'CANCELLING',
    'FAILED',
  ],
  CODE_REVIEW: [
    'IMPLEMENTATION',
    'DEBUGGING',
    'DOCUMENTATION',
    'FINALIZING',
    'WAITING_FOR_USER',
    'BLOCKED',
    'CANCELLING',
    'FAILED',
  ],
  DOCUMENTATION: [
    'IMPLEMENTATION',
    'FINALIZING',
    'WAITING_FOR_USER',
    'BLOCKED',
    'CANCELLING',
    'FAILED',
  ],
  FINALIZING: ['COMPLETE', 'BLOCKED', 'CANCELLING', 'FAILED'],
  WAITING_FOR_USER: ['BLOCKED', 'CANCELLING', 'FAILED'],
  BLOCKED: ['CANCELLING', 'FAILED'],
  CANCELLING: ['CANCELLED'],
  COMPLETE: [],
  FAILED: [],
  CANCELLED: [],
};

const REQUIRED_ARTIFACTS = [
  'REQUEST.md',
  'BRIEF.md',
  'ARCHITECTURE.md',
  'IMPLEMENTATION_PLAN.md',
  'PROGRESS.md',
  'QA.md',
  'SECURITY.md',
  'REVIEW.md',
  'DOCUMENTATION.md',
  'CHANGE_REQUESTS.md',
  'FINAL_SUMMARY.md',
  'CLEANUP.md',
];

const REQUIRED_AGENTS = [
  'project-manager',
  'senior-engineer',
  'code-architect',
  'debugger',
  'qa-tester',
  'security-reviewer',
  'code-reviewer',
  'documenter',
];

const REQUIRED_SKILLS = [
  'pipeline-core',
  'pipeline-cleanup',
  'pipeline-subagents',
  'pipeline-team-agents',
  'clean-subagents',
  'clean-team',
];

function fail(message) {
  throw new Error(message);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`Cannot read valid JSON from ${filePath}: ${error.message}`);
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function parseArguments(args) {
  const positionals = [];
  const flags = {};

  for (let index = 0; index < args.length; index += 1) {
    const item = args[index];
    if (!item.startsWith('--')) {
      positionals.push(item);
      continue;
    }

    const key = item.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith('--')) {
      flags[key] = true;
      continue;
    }

    flags[key] = next;
    index += 1;
  }

  return { positionals, flags };
}

function createContext(rootDir = process.cwd()) {
  const configPath = path.join(rootDir, '.claude', 'pipeline', 'config.json');
  if (!fs.existsSync(configPath)) {
    fail(`Missing pipeline config: ${configPath}`);
  }

  const config = readJson(configPath);
  const resolve = (relativePath) => path.resolve(rootDir, relativePath);
  const archiveRoot = resolve(config.archiveRoot);
  const currentPointer = resolve(config.currentPointer);
  const templateRoot = resolve(config.templateRoot);
  const projectTasksRoot = path.resolve(rootDir, '.claude', 'tasks');
  const projectPipelineRoot = path.resolve(rootDir, '.claude', 'pipeline');

  ensureInside(projectTasksRoot, archiveRoot, 'Archive root');
  ensureInside(projectTasksRoot, currentPointer, 'Current pointer');
  ensureInside(projectPipelineRoot, templateRoot, 'Template root');

  return {
    rootDir,
    config,
    configPath,
    archiveRoot,
    currentPointer,
    templateRoot,
  };
}

function ensureInside(parent, child, label) {
  const relative = path.relative(parent, child);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    fail(`${label} must stay inside ${parent}`);
  }
}

function sanitizeSlug(value) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');

  if (!slug) {
    fail('The run slug must contain at least one letter or number.');
  }

  return slug;
}

function dateStamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function timestamp() {
  return new Date().toISOString();
}

function listMarkdownFiles(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => entry.name)
    .sort();
}

function listSkillDirectories(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        fs.existsSync(path.join(directory, entry.name, 'SKILL.md')),
    )
    .map((entry) => entry.name)
    .sort();
}

function listFilesRecursive(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return [];
  }

  const stats = fs.statSync(targetPath);
  if (stats.isFile()) {
    return [targetPath];
  }

  return fs.readdirSync(targetPath, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(targetPath, entry.name);
    return entry.isDirectory() ? listFilesRecursive(entryPath) : [entryPath];
  });
}

function validateLauncher(context) {
  const validation = context.config.launcher?.validation || { type: 'none' };
  if (validation.type === 'none') {
    return [];
  }

  if (validation.type !== 'package-json-script') {
    return [`Unknown launcher validation type: ${validation.type}.`];
  }

  const manifestPath = path.resolve(
    context.rootDir,
    validation.path || 'package.json',
  );
  ensureInside(context.rootDir, manifestPath, 'Launcher manifest');
  if (!fs.existsSync(manifestPath)) {
    return [`Missing launcher manifest: ${manifestPath}.`];
  }

  const manifest = readJson(manifestPath);
  const actual = manifest.scripts?.[validation.script];
  if (actual !== validation.expected) {
    return [
      `Launcher script ${validation.script} must be ${validation.expected}, found ${actual || 'none'}.`,
    ];
  }

  return [];
}

function commandPrefix(context) {
  return context.config.launcher?.display || 'node .claude/scripts/pipeline.js';
}

function parseFrontmatter(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) {
    return { content, metadata: null };
  }

  const metadata = {};
  let activeList = null;
  for (const line of match[1].split(/\r?\n/)) {
    const listItem = line.match(/^\s+-\s+(.+)$/);
    if (listItem && activeList) {
      metadata[activeList].push(listItem[1].trim());
      continue;
    }

    const field = line.match(/^([a-zA-Z][a-zA-Z0-9-]*):\s*(.*)$/);
    if (!field) {
      continue;
    }

    const [, key, rawValue] = field;
    if (!rawValue) {
      metadata[key] = [];
      activeList = key;
      continue;
    }

    metadata[key] = rawValue.replace(/^['"]|['"]$/g, '');
    activeList = null;
  }

  return { content, metadata };
}

function validateDefinitions(context) {
  const errors = [];
  const skillsRoot = path.join(context.rootDir, '.claude', 'skills');
  const agentsRoot = path.join(context.rootDir, '.claude', 'agents');
  const skillNames = listSkillDirectories(skillsRoot);
  const agentFiles = listMarkdownFiles(agentsRoot);
  const agentNames = new Set();

  for (const skillName of skillNames) {
    const skillPath = path.join(skillsRoot, skillName, 'SKILL.md');
    const { content, metadata } = parseFrontmatter(skillPath);
    if (!metadata) {
      errors.push(`${skillPath} has no valid YAML frontmatter.`);
      continue;
    }
    if (metadata.name !== skillName) {
      errors.push(`${skillPath} name must match directory ${skillName}.`);
    }
    if (!metadata.description) {
      errors.push(`${skillPath} is missing description.`);
    }
    if (content.split(/\r?\n/).length > 500) {
      errors.push(`${skillPath} exceeds 500 lines.`);
    }

    const directory = path.dirname(skillPath);
    const links = [...content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map(
      (match) => match[1],
    );
    for (const link of links) {
      if (/^(https?:|#)/.test(link)) {
        continue;
      }
      if (!fs.existsSync(path.resolve(directory, link))) {
        errors.push(`${skillPath} references missing file ${link}.`);
      }
    }
  }

  for (const fileName of agentFiles) {
    const agentPath = path.join(agentsRoot, fileName);
    const expectedName = fileName.replace(/\.md$/, '');
    const { metadata } = parseFrontmatter(agentPath);
    if (!metadata) {
      errors.push(`${agentPath} has no valid YAML frontmatter.`);
      continue;
    }
    if (metadata.name !== expectedName) {
      errors.push(`${agentPath} name must match filename ${expectedName}.`);
    }
    if (agentNames.has(metadata.name)) {
      errors.push(`Duplicate agent name: ${metadata.name}.`);
    }
    agentNames.add(metadata.name);
    if (!metadata.description) {
      errors.push(`${agentPath} is missing description.`);
    }
    if (!metadata.tools) {
      errors.push(`${agentPath} is missing a tools allowlist.`);
    }
    if (typeof metadata.model !== 'string' || !metadata.model.trim()) {
      errors.push(`${agentPath} must define a non-empty model.`);
    }
    if (!metadata.effort || !EFFORT_LEVELS.has(metadata.effort)) {
      errors.push(
        `${agentPath} must define effort as ${Array.from(EFFORT_LEVELS).join(', ')}.`,
      );
    }
    if (Array.isArray(metadata.skills)) {
      for (const skillName of metadata.skills) {
        if (!skillNames.includes(skillName)) {
          errors.push(`${agentPath} references missing skill ${skillName}.`);
        }
      }
    }
  }

  for (const requiredAgent of REQUIRED_AGENTS) {
    if (!agentNames.has(requiredAgent)) {
      errors.push(`Missing required agent: ${requiredAgent}.`);
    }
  }

  for (const requiredSkill of REQUIRED_SKILLS) {
    if (!skillNames.includes(requiredSkill)) {
      errors.push(`Missing required pipeline skill: ${requiredSkill}.`);
    }
  }

  const nativeTeamsPath = path.join(context.rootDir, '.claude', 'teams');
  if (
    fs.existsSync(nativeTeamsPath) &&
    listFilesRecursive(nativeTeamsPath).length > 0
  ) {
    errors.push('Repository must not contain native Claude team state.');
  }

  if (!context.config.archiveRoot.startsWith('.claude/tasks/')) {
    errors.push('archiveRoot must stay under .claude/tasks/.');
  }
  if (!context.config.currentPointer.startsWith('.claude/tasks/')) {
    errors.push('currentPointer must stay under .claude/tasks/.');
  }

  errors.push(...validateLauncher(context));

  return errors;
}

function validatePortability(context) {
  const errors = [];
  const manifestPath = path.join(
    context.rootDir,
    '.claude',
    'pipeline',
    'portable-manifest.json',
  );
  if (!fs.existsSync(manifestPath)) {
    return [`Missing portability manifest: ${manifestPath}.`];
  }

  const manifest = readJson(manifestPath);
  const portableFiles = [];
  for (const relativePath of manifest.copyUnchanged || []) {
    const absolutePath = path.resolve(context.rootDir, relativePath);
    ensureInside(context.rootDir, absolutePath, 'Portable path');
    if (!fs.existsSync(absolutePath)) {
      errors.push(`Missing portable path: ${relativePath}.`);
      continue;
    }
    portableFiles.push(...listFilesRecursive(absolutePath));
  }

  for (const relativePath of manifest.adaptBeforeUse || []) {
    const absolutePath = path.resolve(context.rootDir, relativePath);
    ensureInside(context.rootDir, absolutePath, 'Adapter path');
    if (!fs.existsSync(absolutePath)) {
      errors.push(`Missing adapter path: ${relativePath}.`);
    }
  }

  const patterns = (manifest.forbiddenPortablePatterns || []).map((pattern) => ({
    pattern,
    normalized: pattern.toLowerCase(),
  }));
  for (const filePath of portableFiles) {
    if (path.resolve(filePath) === path.resolve(manifestPath)) {
      continue;
    }
    const content = fs.readFileSync(filePath, 'utf8').toLowerCase();
    for (const item of patterns) {
      if (content.includes(item.normalized)) {
        errors.push(
          `${path.relative(context.rootDir, filePath)} contains project-specific pattern ${item.pattern}.`,
        );
      }
    }
  }

  const adapterRoot = path.join(context.rootDir, '.claude', 'pipeline', 'adapters');
  const exampleConfigPath = path.join(adapterRoot, 'config.example.json');
  const exampleProfilePath = path.join(
    adapterRoot,
    'project-profile.example.md',
  );
  if (
    fs.existsSync(exampleConfigPath) &&
    fs.existsSync(exampleProfilePath)
  ) {
    const temporaryRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), 'claude-portability-'),
    );
    try {
      for (const relativePath of manifest.copyUnchanged || []) {
        const sourcePath = path.resolve(context.rootDir, relativePath);
        const targetPath = path.resolve(temporaryRoot, relativePath);
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.cpSync(sourcePath, targetPath, { recursive: true });
      }
      const targetPipelineRoot = path.join(temporaryRoot, '.claude', 'pipeline');
      fs.mkdirSync(targetPipelineRoot, { recursive: true });
      fs.copyFileSync(
        exampleConfigPath,
        path.join(targetPipelineRoot, 'config.json'),
      );
      fs.copyFileSync(
        exampleProfilePath,
        path.join(targetPipelineRoot, 'project-profile.md'),
      );

      const portableContext = createContext(temporaryRoot);
      const definitionErrors = validateDefinitions(portableContext);
      errors.push(
        ...definitionErrors.map((error) => `Portable-copy validation: ${error}`),
      );
      const created = startRun(portableContext, {
        pipeline: 'subagents',
        slug: 'portable-smoke-test',
        title: 'Portable smoke test',
        mode: 'hybrid',
        level: 'standard',
        request: 'Validate the copied generic pipeline kit.',
      });
      errors.push(
        ...validateRun(portableContext, created).map(
          (error) => `Portable-run validation: ${error}`,
        ),
      );
    } finally {
      fs.rmSync(temporaryRoot, { recursive: true, force: true });
    }
  } else {
    errors.push('Portable adapter examples are missing.');
  }

  return errors;
}

function renderCurrentPointer(state) {
  return `# Current Claude Pipeline Run

- RUN_ID: ${state.runId}
- Path: ${state.runPath}
- Pipeline: ${state.pipeline}
- Mode: ${state.mode}
- Level: ${state.level}
- Status: ${state.status}
- State: ${state.currentState}
- Updated: ${state.updatedAt}
`;
}

function writeCurrentPointer(context, state) {
  fs.mkdirSync(path.dirname(context.currentPointer), { recursive: true });
  fs.writeFileSync(context.currentPointer, renderCurrentPointer(state), 'utf8');
}

function clearCurrentPointer(context, runId) {
  if (!fs.existsSync(context.currentPointer)) {
    return false;
  }
  if (readCurrentRunId(context) !== runId) {
    return false;
  }
  fs.rmSync(context.currentPointer, { force: true });
  return true;
}

function readCurrentRunId(context) {
  if (!fs.existsSync(context.currentPointer)) {
    return null;
  }

  const content = fs.readFileSync(context.currentPointer, 'utf8');
  const match = content.match(/^- RUN_ID:\s*(.+)$/m);
  return match ? match[1].trim() : null;
}

function resolveRun(context, requestedRunId) {
  const runId = requestedRunId || readCurrentRunId(context);
  if (!runId) {
    fail('No run selected and no current Claude pipeline run exists.');
  }

  if (path.basename(runId) !== runId) {
    fail(`Invalid run ID: ${runId}`);
  }

  const runDir = path.resolve(context.archiveRoot, runId);
  ensureInside(context.archiveRoot, runDir, 'Run path');

  const statePath = path.join(runDir, 'state.json');
  if (!fs.existsSync(statePath)) {
    fail(`Missing run state: ${statePath}`);
  }

  return { runId, runDir, statePath, state: readJson(statePath) };
}

function copyTemplates(context, runDir) {
  if (!fs.existsSync(context.templateRoot)) {
    fail(`Missing template directory: ${context.templateRoot}`);
  }

  const templateFiles = listMarkdownFiles(context.templateRoot);
  const missing = REQUIRED_ARTIFACTS.filter(
    (artifact) => !templateFiles.includes(artifact),
  );
  if (missing.length > 0) {
    fail(`Missing required templates: ${missing.join(', ')}`);
  }

  for (const fileName of templateFiles) {
    fs.copyFileSync(
      path.join(context.templateRoot, fileName),
      path.join(runDir, fileName),
      fs.constants.COPYFILE_EXCL,
    );
  }
}

function renderRequest({ title, pipeline, mode, level, request }) {
  return `# Request

## User request

${request || title}

## Requested pipeline

- Pipeline: ${pipeline}
- Mode: ${mode}
- Level: ${level}

## Initial constraints

Resolve constraints from the project profile and canonical instruction files.

## Source links or artifacts

- None recorded at initialization.
`;
}

function createInitialCleanupState() {
  return {
    status: 'NOT_STARTED',
    pipeline: null,
    reason: null,
    priorState: null,
    startedAt: null,
    updatedAt: null,
    completedAt: null,
    result: null,
    archiveAction: 'KEEP',
    notes: [],
  };
}

function ensureCleanupState(state) {
  state.cleanup = {
    ...createInitialCleanupState(),
    ...(state.cleanup || {}),
  };
  if (!Array.isArray(state.cleanup.notes)) {
    state.cleanup.notes = [];
  }
  return state.cleanup;
}

function renderCleanupArtifact(state) {
  const cleanup = ensureCleanupState(state);
  const notes = cleanup.notes.length
    ? cleanup.notes.map((note) => `- ${note}`).join('\n')
    : '- None recorded.';

  return `# Pipeline Cleanup

## Status

\`${cleanup.status}\`

## Target

- Run: ${state.runId}
- Pipeline: ${cleanup.pipeline || state.pipeline}
- Prior state: ${cleanup.priorState || 'N/A'}

## Request

- Reason: ${cleanup.reason || 'Not requested.'}
- Started: ${cleanup.startedAt || 'N/A'}
- Updated: ${cleanup.updatedAt || 'N/A'}
- Completed: ${cleanup.completedAt || 'N/A'}

## Result

- Runtime result: ${cleanup.result || 'NOT_RUN'}
- Archive action: ${cleanup.archiveAction}
- Current run state: ${state.currentState}

## Interrupted Or Incomplete Work

${notes}

## Safety

- Runtime cleanup must use official Claude controls.
- Native Claude team/task state must not be edited manually.
- Purge is allowed only after successful runtime cleanup.
`;
}

function writeCleanupArtifact(run) {
  fs.writeFileSync(
    path.join(run.runDir, 'CLEANUP.md'),
    renderCleanupArtifact(run.state),
    'utf8',
  );
}

function createInitialState(context, options, runId, runDir) {
  const now = timestamp();
  const relativeRunPath = path
    .relative(context.rootDir, runDir)
    .split(path.sep)
    .join('/');

  return {
    version: 1,
    runId,
    runPath: relativeRunPath,
    title: options.title,
    pipeline: options.pipeline,
    mode: options.mode,
    level: options.level,
    status: 'IN_PROGRESS',
    currentState: 'INTAKE',
    resumeState: null,
    activeRole: 'orchestrator',
    createdAt: now,
    updatedAt: now,
    iterations: {
      debugging: 0,
      qa: 0,
      review: 0,
    },
    limits: { ...context.config.limits },
    artifacts: Object.fromEntries(
      REQUIRED_ARTIFACTS.map((name) => [name, `${relativeRunPath}/${name}`]),
    ),
    assumptions: [],
    blockers: [],
    cleanup: createInitialCleanupState(),
    history: [
      {
        from: null,
        to: 'INTAKE',
        actor: 'orchestrator',
        at: now,
        note: 'Run initialized.',
      },
    ],
  };
}

function startRun(context, options) {
  if (!PIPELINES.has(options.pipeline)) {
    fail(`Pipeline must be one of: ${Array.from(PIPELINES).join(', ')}`);
  }
  if (!MODES.has(options.mode)) {
    fail(`Mode must be one of: ${Array.from(MODES).join(', ')}`);
  }
  if (!LEVELS.has(options.level)) {
    fail(`Level must be one of: ${Array.from(LEVELS).join(', ')}`);
  }
  if (!options.title) {
    fail('Missing required --title.');
  }

  const slug = sanitizeSlug(options.slug || options.title);
  const runId = `${dateStamp()}_${slug}`;
  const runDir = path.resolve(context.archiveRoot, runId);
  ensureInside(context.archiveRoot, runDir, 'Run path');

  if (fs.existsSync(runDir)) {
    const existing = resolveRun(context, runId);
    const mismatches = [
      ['title', existing.state.title, options.title],
      ['pipeline', existing.state.pipeline, options.pipeline],
      ['mode', existing.state.mode, options.mode],
      ['level', existing.state.level, options.level],
    ].filter(([, actual, expected]) => actual !== expected);
    if (mismatches.length > 0) {
      const details = mismatches
        .map(([field, actual, expected]) => `${field}: ${actual} != ${expected}`)
        .join(', ');
      fail(
        `Run ${runId} already exists with different settings (${details}). Use a different slug or matching settings.`,
      );
    }
    writeCurrentPointer(context, existing.state);
    return { ...existing, created: false };
  }

  fs.mkdirSync(context.archiveRoot, { recursive: true });
  fs.mkdirSync(runDir, { recursive: false });
  copyTemplates(context, runDir);

  const state = createInitialState(context, options, runId, runDir);
  fs.writeFileSync(
    path.join(runDir, 'REQUEST.md'),
    renderRequest(options),
    'utf8',
  );
  writeJson(path.join(runDir, 'state.json'), state);
  writeCurrentPointer(context, state);

  return {
    runId,
    runDir,
    statePath: path.join(runDir, 'state.json'),
    state,
    created: true,
  };
}

function parseArtifactStatus(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/## Status\s*\r?\n+\s*`?([A-Z_]+)`?/);
  return match ? match[1] : null;
}

function hasOpenChangeRequests(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const openStart = content.indexOf('## Open');
  if (openStart === -1) {
    return false;
  }

  const resolvedStart = content.indexOf(
    '## Resolved',
    openStart + '## Open'.length,
  );
  const sectionEnd = resolvedStart === -1 ? content.length : resolvedStart;
  const section = content.slice(openStart + '## Open'.length, sectionEnd);
  return section.trim().length > 0;
}

function differsFromTemplate(context, runDir, artifact) {
  const templatePath = path.join(context.templateRoot, artifact);
  const artifactPath = path.join(runDir, artifact);
  return (
    fs.readFileSync(templatePath, 'utf8') !==
    fs.readFileSync(artifactPath, 'utf8')
  );
}

function validateRun(context, run, options = {}) {
  const errors = [];
  const { state, runDir, runId } = run;

  if (state.runId !== runId) {
    errors.push(`state.runId is ${state.runId}, expected ${runId}`);
  }
  if (!PIPELINES.has(state.pipeline)) {
    errors.push(`Unknown pipeline: ${state.pipeline}`);
  }
  if (!MODES.has(state.mode)) {
    errors.push(`Unknown mode: ${state.mode}`);
  }
  if (!LEVELS.has(state.level)) {
    errors.push(`Unknown level: ${state.level}`);
  }
  if (!Object.hasOwn(ALLOWED_TRANSITIONS, state.currentState)) {
    errors.push(`Unknown current state: ${state.currentState}`);
  }
  if (!Array.isArray(state.history) || state.history.length === 0) {
    errors.push('State history is missing or empty.');
  }

  const cleanup = ensureCleanupState(state);
  const cleanupStatuses = new Set([
    'NOT_STARTED',
    'IN_PROGRESS',
    'PARTIAL',
    'CLEANED',
  ]);
  if (!cleanupStatuses.has(cleanup.status)) {
    errors.push(`Unknown cleanup status: ${cleanup.status}`);
  }
  if (cleanup.pipeline !== null && !PIPELINES.has(cleanup.pipeline)) {
    errors.push(`Unknown cleanup pipeline: ${cleanup.pipeline}`);
  }
  if (state.currentState === 'CANCELLING' && !['IN_PROGRESS', 'PARTIAL'].includes(cleanup.status)) {
    errors.push('CANCELLING state requires IN_PROGRESS or PARTIAL cleanup.');
  }
  if (state.currentState === 'CANCELLED' && cleanup.status !== 'CLEANED') {
    errors.push('CANCELLED state requires CLEANED cleanup.');
  }
  if (cleanup.status === 'CLEANED' && cleanup.result !== 'CLEANED') {
    errors.push('CLEANED cleanup requires result CLEANED.');
  }

  for (const artifact of REQUIRED_ARTIFACTS) {
    if (!fs.existsSync(path.join(runDir, artifact))) {
      errors.push(`Missing artifact: ${artifact}`);
    }
  }

  if (options.completion) {
    if (state.currentState !== 'FINALIZING' && state.currentState !== 'COMPLETE') {
      errors.push('Completion validation requires FINALIZING or COMPLETE state.');
    }
    if (Array.isArray(state.blockers) && state.blockers.length > 0) {
      errors.push('Run has unresolved blockers.');
    }
    if (hasOpenChangeRequests(path.join(runDir, 'CHANGE_REQUESTS.md'))) {
      errors.push('CHANGE_REQUESTS.md contains open items.');
    }

    const expectedStatuses = {
      'QA.md': ['PASS'],
      'SECURITY.md': ['PASS', 'NOT_REQUIRED'],
      'REVIEW.md': ['PASS'],
      'DOCUMENTATION.md': ['COMPLETE', 'NOT_REQUIRED'],
    };

    for (const [artifact, accepted] of Object.entries(expectedStatuses)) {
      const status = parseArtifactStatus(path.join(runDir, artifact));
      if (!accepted.includes(status)) {
        errors.push(
          `${artifact} status must be ${accepted.join(' or ')}, found ${status || 'none'}`,
        );
      }
    }

    for (const artifact of [
      'BRIEF.md',
      'ARCHITECTURE.md',
      'IMPLEMENTATION_PLAN.md',
      'PROGRESS.md',
      'FINAL_SUMMARY.md',
    ]) {
      if (!differsFromTemplate(context, runDir, artifact)) {
        errors.push(`${artifact} still matches its empty template.`);
      }
    }
  }

  return errors;
}

function transitionRun(context, run, options) {
  const target = String(options.to || '').toUpperCase();
  const actor = options.actor;
  if (!target || !actor) {
    fail('Transition requires --to and --actor.');
  }
  if (!Object.hasOwn(ALLOWED_TRANSITIONS, target)) {
    fail(`Unknown target state: ${target}`);
  }
  if (target === 'CANCELLING' || target === 'CANCELLED') {
    fail('Use the cleanup command for CANCELLING and CANCELLED transitions.');
  }

  const state = run.state;
  if (TERMINAL_STATES.has(state.currentState)) {
    fail(`Cannot transition terminal run from ${state.currentState}.`);
  }

  let allowed = ALLOWED_TRANSITIONS[state.currentState] || [];
  if (
    (state.currentState === 'WAITING_FOR_USER' ||
      state.currentState === 'BLOCKED') &&
    state.resumeState
  ) {
    allowed = [...new Set([...allowed, state.resumeState])];
  }
  if (!allowed.includes(target)) {
    fail(
      `Invalid transition ${state.currentState} -> ${target}. Allowed: ${allowed.join(', ') || 'none'}`,
    );
  }

  if (target === 'COMPLETE') {
    const errors = validateRun(context, run, { completion: true });
    if (errors.length > 0) {
      fail(`Completion validation failed:\n- ${errors.join('\n- ')}`);
    }
  }

  const counter = LOOP_STATE_TO_COUNTER[target];
  if (counter) {
    const nextValue = (state.iterations[counter] || 0) + 1;
    const limit = state.limits[counter];
    if (Number.isInteger(limit) && nextValue > limit) {
      fail(`Cannot enter ${target}: ${counter} iteration limit ${limit} reached.`);
    }
    state.iterations[counter] = nextValue;
  }

  const from = state.currentState;
  const now = timestamp();
  if (target === 'WAITING_FOR_USER' || target === 'BLOCKED') {
    state.resumeState = from;
  } else if (from === 'WAITING_FOR_USER' || from === 'BLOCKED') {
    state.resumeState = null;
  }

  state.currentState = target;
  state.status = target === 'COMPLETE' ? 'DONE' : target;
  if (!TERMINAL_STATES.has(target) && target !== 'BLOCKED') {
    state.status = 'IN_PROGRESS';
  }
  state.activeRole = actor;
  state.updatedAt = now;
  state.history.push({
    from,
    to: target,
    actor,
    at: now,
    note: options.note || '',
  });

  writeJson(run.statePath, state);
  writeCurrentPointer(context, state);
  return state;
}

function assertCleanupPipeline(run, pipeline) {
  if (!PIPELINES.has(pipeline)) {
    fail(`Cleanup pipeline must be one of: ${Array.from(PIPELINES).join(', ')}`);
  }
  if (run.state.pipeline !== pipeline) {
    fail(
      `Cleanup pipeline mismatch: run ${run.runId} uses ${run.state.pipeline}, not ${pipeline}.`,
    );
  }
}

function appendCleanupNote(cleanup, note) {
  if (note && !cleanup.notes.includes(note)) {
    cleanup.notes.push(note);
  }
}

function beginCleanup(context, run, options) {
  assertCleanupPipeline(run, options.pipeline);
  const state = run.state;
  const cleanup = ensureCleanupState(state);

  if (cleanup.status === 'CLEANED') {
    fail(`Run ${run.runId} cleanup is already complete.`);
  }
  if (cleanup.pipeline && cleanup.pipeline !== options.pipeline) {
    fail(
      `Cleanup already belongs to ${cleanup.pipeline}, not ${options.pipeline}.`,
    );
  }

  const now = timestamp();
  const firstStart = cleanup.status === 'NOT_STARTED';
  if (firstStart) {
    cleanup.priorState = state.currentState;
    cleanup.startedAt = now;
  }
  cleanup.status = 'IN_PROGRESS';
  cleanup.pipeline = options.pipeline;
  cleanup.reason = options.reason || cleanup.reason || 'User-requested cleanup.';
  cleanup.updatedAt = now;
  cleanup.completedAt = null;
  cleanup.result = null;
  cleanup.archiveAction = 'KEEP';
  appendCleanupNote(cleanup, options.note);

  if (!TERMINAL_STATES.has(state.currentState) && state.currentState !== 'CANCELLING') {
    const from = state.currentState;
    state.currentState = 'CANCELLING';
    state.status = 'IN_PROGRESS';
    state.resumeState = null;
    state.activeRole = 'orchestrator';
    state.history.push({
      from,
      to: 'CANCELLING',
      actor: 'orchestrator',
      at: now,
      note: cleanup.reason,
    });
  } else {
    state.history.push({
      from: state.currentState,
      to: state.currentState,
      actor: 'orchestrator',
      at: now,
      note: `Cleanup started for ${options.pipeline}.`,
    });
  }

  state.updatedAt = now;
  writeJson(run.statePath, state);
  writeCleanupArtifact(run);
  if (readCurrentRunId(context) === run.runId) {
    writeCurrentPointer(context, state);
  }
  return state;
}

function markCleanupPartial(context, run, options) {
  assertCleanupPipeline(run, options.pipeline);
  const state = run.state;
  const cleanup = ensureCleanupState(state);
  if (!['IN_PROGRESS', 'PARTIAL'].includes(cleanup.status)) {
    fail(`Cleanup must begin before it can be marked partial for ${run.runId}.`);
  }
  if (cleanup.pipeline !== options.pipeline) {
    fail(`Cleanup belongs to ${cleanup.pipeline}, not ${options.pipeline}.`);
  }

  const now = timestamp();
  cleanup.status = 'PARTIAL';
  cleanup.result = 'PARTIAL';
  cleanup.updatedAt = now;
  cleanup.completedAt = null;
  cleanup.archiveAction = 'KEEP';
  appendCleanupNote(
    cleanup,
    options.note || 'Runtime cleanup is incomplete and must be retried.',
  );
  state.updatedAt = now;

  writeJson(run.statePath, state);
  writeCleanupArtifact(run);
  if (readCurrentRunId(context) === run.runId) {
    writeCurrentPointer(context, state);
  }
  return state;
}

function finishCleanup(context, run, options) {
  assertCleanupPipeline(run, options.pipeline);
  const state = run.state;
  const cleanup = ensureCleanupState(state);
  if (!['IN_PROGRESS', 'PARTIAL'].includes(cleanup.status)) {
    fail(`Cleanup must begin before it can finish for ${run.runId}.`);
  }
  if (cleanup.pipeline !== options.pipeline) {
    fail(`Cleanup belongs to ${cleanup.pipeline}, not ${options.pipeline}.`);
  }

  const now = timestamp();
  cleanup.status = 'CLEANED';
  cleanup.result = 'CLEANED';
  cleanup.updatedAt = now;
  cleanup.completedAt = now;
  cleanup.archiveAction = options.purge ? 'PURGE' : 'KEEP';
  appendCleanupNote(cleanup, options.note || 'Runtime cleanup completed.');

  if (state.currentState === 'CANCELLING') {
    state.currentState = 'CANCELLED';
    state.status = 'CANCELLED';
    state.resumeState = null;
    state.activeRole = 'orchestrator';
    state.history.push({
      from: 'CANCELLING',
      to: 'CANCELLED',
      actor: 'orchestrator',
      at: now,
      note: 'Runtime cleanup completed; unfinished run cancelled.',
    });
  } else {
    state.history.push({
      from: state.currentState,
      to: state.currentState,
      actor: 'orchestrator',
      at: now,
      note: `Runtime cleanup completed; terminal state ${state.currentState} preserved.`,
    });
  }

  state.updatedAt = now;
  writeJson(run.statePath, state);
  writeCleanupArtifact(run);
  clearCurrentPointer(context, run.runId);

  if (options.purge) {
    fs.rmSync(run.runDir, { recursive: true, force: true });
  }
  return state;
}

function printList(context) {
  const agents = listMarkdownFiles(
    path.join(context.rootDir, '.claude', 'agents'),
  ).map((name) => name.replace(/\.md$/, ''));
  const skills = listSkillDirectories(
    path.join(context.rootDir, '.claude', 'skills'),
  );
  const currentRun = readCurrentRunId(context);

  console.log('Claude pipeline');
  console.log(`Default: ${context.config.defaults.pipeline}`);
  console.log(
    'Entrypoints: /pipeline-subagents, /pipeline-team-agents, /clean-subagents, /clean-team',
  );
  console.log(`Modes: ${Array.from(MODES).join(', ')}`);
  console.log(`Levels: ${Array.from(LEVELS).join(', ')}`);
  console.log(`Launcher: ${commandPrefix(context)}`);
  console.log(`Agents: ${agents.join(', ') || 'none'}`);
  console.log(`Skills: ${skills.join(', ') || 'none'}`);
  console.log(`Current run: ${currentRun || 'none'}`);
}

function printStatus(run) {
  const state = run.state;
  console.log(`Run: ${state.runId}`);
  console.log(`Title: ${state.title}`);
  console.log(`Pipeline: ${state.pipeline}`);
  console.log(`Mode/level: ${state.mode}/${state.level}`);
  console.log(`Status/state: ${state.status}/${state.currentState}`);
  console.log(`Active role: ${state.activeRole}`);
  console.log(
    `Cleanup: ${state.cleanup?.status || 'NOT_STARTED'} (${state.cleanup?.result || 'NOT_RUN'})`,
  );
  console.log(
    `Iterations: debugging=${state.iterations.debugging}, qa=${state.iterations.qa}, review=${state.iterations.review}`,
  );
  console.log(`Path: ${state.runPath}`);
}

function printHelp(context) {
  const launcher = commandPrefix(context);
  console.log(`Usage:
  ${launcher} list
  ${launcher} check-definitions
  ${launcher} portability-check
  ${launcher} start <subagents|team-agents> --slug <slug> --title <title> [--mode hybrid] [--level standard] [--request <text>]
  ${launcher} status [--run <run-id>]
  ${launcher} transition --to <state> --actor <role> [--run <run-id>] [--note <text>]
  ${launcher} cleanup begin <subagents|team-agents> [--run <run-id>] [--reason <text>] [--note <text>]
  ${launcher} cleanup partial <subagents|team-agents> [--run <run-id>] [--note <text>]
  ${launcher} cleanup finish <subagents|team-agents> [--run <run-id>] [--note <text>] [--purge]
  ${launcher} validate [--run <run-id>] [--completion]
  ${launcher} self-test`);
}

function selfTest(sourceContext) {
  const temporaryRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'claude-pipeline-'),
  );

  try {
    const assert = (condition, message) => {
      if (!condition) {
        fail(message);
      }
    };
    const expectFailure = (callback, pattern, message) => {
      let matched = false;
      try {
        callback();
      } catch (error) {
        matched = pattern.test(error.message);
      }
      assert(matched, message);
    };
    const createRun = (context, pipeline, slug, title = slug) =>
      startRun(context, {
        pipeline,
        slug,
        title,
        mode: 'hybrid',
        level: 'standard',
        request: `Self-test scenario: ${title}.`,
      });

    const targetPipelineDir = path.join(temporaryRoot, '.claude', 'pipeline');
    fs.mkdirSync(path.dirname(targetPipelineDir), { recursive: true });
    fs.cpSync(
      path.join(sourceContext.rootDir, '.claude', 'pipeline'),
      targetPipelineDir,
      { recursive: true },
    );
    const targetAgentsDir = path.join(temporaryRoot, '.claude', 'agents');
    fs.cpSync(
      path.join(sourceContext.rootDir, '.claude', 'agents'),
      targetAgentsDir,
      { recursive: true },
    );
    const targetSkillsDir = path.join(temporaryRoot, '.claude', 'skills');
    fs.cpSync(
      path.join(sourceContext.rootDir, '.claude', 'skills'),
      targetSkillsDir,
      { recursive: true },
    );
    fs.copyFileSync(
      path.join(sourceContext.rootDir, 'package.json'),
      path.join(temporaryRoot, 'package.json'),
    );

    const context = createContext(temporaryRoot);
    const created = createRun(
      context,
      'subagents',
      'self-test',
      'Pipeline self test',
    );

    const structuralErrors = validateRun(context, created);
    assert(
      structuralErrors.length === 0,
      `Self-test structural validation failed: ${structuralErrors.join('; ')}`,
    );

    transitionRun(context, created, {
      to: 'PLANNING',
      actor: 'project-manager',
      note: 'Self-test valid transition.',
    });

    expectFailure(
      () =>
      transitionRun(context, created, {
        to: 'QA',
        actor: 'qa-tester',
        note: 'This transition must fail.',
      }),
      /Invalid transition/,
      'Self-test did not reject an invalid state transition.',
    );

    for (const [artifact, content] of Object.entries({
      'BRIEF.md': '# Brief\n\n## Goal\n\nSelf-test goal.\n',
      'ARCHITECTURE.md': '# Architecture\n\n## Design\n\nSelf-test design.\n',
      'IMPLEMENTATION_PLAN.md':
        '# Implementation Plan\n\n## Tasks\n\n- [x] Self-test task.\n',
      'PROGRESS.md': '# Progress\n\n- Self-test implementation complete.\n',
      'QA.md': '# QA\n\n## Status\n\n`PASS`\n',
      'SECURITY.md':
        '# Security Review\n\n## Status\n\n`NOT_REQUIRED`\n',
      'REVIEW.md': '# Code Review\n\n## Status\n\n`PASS`\n',
      'DOCUMENTATION.md':
        '# Documentation\n\n## Status\n\n`NOT_REQUIRED`\n',
      'FINAL_SUMMARY.md':
        '# Final Summary\n\n## Outcome\n\nSelf-test complete.\n',
    })) {
      fs.writeFileSync(path.join(created.runDir, artifact), content, 'utf8');
    }

    const route = [
      ['ARCHITECTURE', 'code-architect'],
      ['ARCHITECTURE_REVIEW', 'senior-engineer'],
      ['IMPLEMENTATION', 'code-architect'],
      ['QA', 'qa-tester'],
      ['SECURITY_REVIEW', 'security-reviewer'],
      ['CODE_REVIEW', 'code-reviewer'],
      ['DOCUMENTATION', 'documenter'],
      ['FINALIZING', 'orchestrator'],
      ['COMPLETE', 'orchestrator'],
    ];

    for (const [to, actor] of route) {
      transitionRun(context, created, {
        to,
        actor,
        note: `Self-test transition to ${to}.`,
      });
    }

    assert(
      created.state.currentState === 'COMPLETE',
      'Self-test did not complete the run.',
    );

    beginCleanup(context, created, {
      pipeline: 'subagents',
      reason: 'Normal completion cleanup.',
    });
    finishCleanup(context, created, {
      pipeline: 'subagents',
      note: 'Completed run cleanup verified.',
      purge: false,
    });
    assert(
      created.state.currentState === 'COMPLETE',
      'Cleanup changed a completed run state.',
    );
    assert(
      created.state.cleanup.status === 'CLEANED' &&
        fs.existsSync(created.runDir),
      'Completed run cleanup did not preserve its archive.',
    );
    assert(
      readCurrentRunId(context) === null,
      'Completed run cleanup did not clear the current pointer.',
    );

    const partialRun = createRun(
      context,
      'subagents',
      'cleanup-partial',
      'Subagents partial cleanup',
    );
    beginCleanup(context, partialRun, {
      pipeline: 'subagents',
      reason: 'Cancel active subagents run.',
    });
    markCleanupPartial(context, partialRun, {
      pipeline: 'subagents',
      note: 'One owned background worker is still active.',
    });
    assert(
      partialRun.state.currentState === 'CANCELLING' &&
        partialRun.state.cleanup.status === 'PARTIAL',
      'Partial cleanup did not preserve CANCELLING state.',
    );
    assert(
      readCurrentRunId(context) === partialRun.runId &&
        fs.existsSync(partialRun.runDir),
      'Partial cleanup did not preserve the pointer and archive.',
    );
    beginCleanup(context, partialRun, {
      pipeline: 'subagents',
      reason: 'Retry partial cleanup.',
    });
    finishCleanup(context, partialRun, {
      pipeline: 'subagents',
      note: 'All owned subagents are stopped.',
      purge: false,
    });
    assert(
      partialRun.state.currentState === 'CANCELLED' &&
        partialRun.state.cleanup.status === 'CLEANED',
      'Subagents cleanup retry did not end in CANCELLED/CLEANED.',
    );
    assert(
      fs.existsSync(partialRun.runDir) && readCurrentRunId(context) === null,
      'Successful subagents cleanup did not keep archive and clear pointer.',
    );

    const teamRun = createRun(
      context,
      'team-agents',
      'cleanup-team',
      'Agent Teams cleanup',
    );
    expectFailure(
      () =>
        beginCleanup(context, teamRun, {
          pipeline: 'subagents',
          reason: 'This pipeline type must be rejected.',
        }),
      /pipeline mismatch/,
      'Cleanup did not reject a pipeline-type mismatch.',
    );
    beginCleanup(context, teamRun, {
      pipeline: 'team-agents',
      reason: 'Cancel active Agent Team run.',
    });
    finishCleanup(context, teamRun, {
      pipeline: 'team-agents',
      note: 'Teammates and native team resources are closed.',
      purge: false,
    });
    assert(
      teamRun.state.currentState === 'CANCELLED' &&
        fs.existsSync(teamRun.runDir),
      'Team cleanup did not cancel the run and preserve its archive.',
    );

    const purgeRun = createRun(
      context,
      'team-agents',
      'cleanup-purge',
      'Explicit cleanup purge',
    );
    beginCleanup(context, purgeRun, {
      pipeline: 'team-agents',
      reason: 'Verify explicit purge.',
    });
    finishCleanup(context, purgeRun, {
      pipeline: 'team-agents',
      note: 'Runtime cleanup succeeded before purge.',
      purge: true,
    });
    assert(
      !fs.existsSync(purgeRun.runDir) && readCurrentRunId(context) === null,
      'Explicit purge did not remove only the selected archive.',
    );

    const missingPointerRun = createRun(
      context,
      'subagents',
      'cleanup-missing-pointer',
      'Cleanup with missing current pointer',
    );
    fs.rmSync(context.currentPointer, { force: true });
    expectFailure(
      () => resolveRun(context),
      /No run selected/,
      'Missing current pointer did not require an explicit run ID.',
    );
    const explicitlyResolved = resolveRun(context, missingPointerRun.runId);
    beginCleanup(context, explicitlyResolved, {
      pipeline: 'subagents',
      reason: 'Explicit run cleanup without current pointer.',
    });
    finishCleanup(context, explicitlyResolved, {
      pipeline: 'subagents',
      note: 'Explicit run cleanup succeeded.',
      purge: false,
    });
    assert(
      explicitlyResolved.state.currentState === 'CANCELLED' &&
        !fs.existsSync(context.currentPointer),
      'Explicit cleanup failed when the current pointer was missing.',
    );

    const teamsDirectory = path.join(temporaryRoot, '.claude', 'teams');
    fs.mkdirSync(teamsDirectory, { recursive: true });
    assert(
      !validateDefinitions(context).some((error) =>
        error.includes('native Claude team state'),
      ),
      'An empty project-local .claude/teams directory was rejected.',
    );
    fs.writeFileSync(
      path.join(teamsDirectory, 'native-state.json'),
      '{}\n',
      'utf8',
    );
    assert(
      validateDefinitions(context).some((error) =>
        error.includes('native Claude team state'),
      ),
      'Non-empty project-local Claude team state was not rejected.',
    );

    console.log('Self-test PASS');
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

function main() {
  const [command = 'help', ...rest] = process.argv.slice(2);
  const { positionals, flags } = parseArguments(rest);
  const context = createContext();

  switch (command) {
    case 'list':
      printList(context);
      return;
    case 'check-definitions': {
      const errors = validateDefinitions(context);
      if (errors.length > 0) {
        fail(`Definition validation failed:\n- ${errors.join('\n- ')}`);
      }
      console.log('Definition validation PASS.');
      return;
    }
    case 'portability-check': {
      const errors = validatePortability(context);
      if (errors.length > 0) {
        fail(`Portability validation failed:\n- ${errors.join('\n- ')}`);
      }
      console.log('Portability validation PASS.');
      return;
    }
    case 'start': {
      const pipeline = positionals[0] || context.config.defaults.pipeline;
      const result = startRun(context, {
        pipeline,
        slug: flags.slug,
        title: flags.title,
        mode: flags.mode || context.config.defaults.mode,
        level: flags.level || context.config.defaults.level,
        request: flags.request,
      });
      console.log(
        `${result.created ? 'Created' : 'Resuming'} run ${result.runId} at ${result.state.runPath}`,
      );
      return;
    }
    case 'status':
      printStatus(resolveRun(context, flags.run));
      return;
    case 'transition': {
      const run = resolveRun(context, flags.run);
      const state = transitionRun(context, run, {
        to: flags.to,
        actor: flags.actor,
        note: flags.note,
      });
      console.log(`Transitioned ${state.runId} to ${state.currentState}.`);
      return;
    }
    case 'cleanup': {
      const action = positionals[0];
      const pipeline = positionals[1];
      const run = resolveRun(context, flags.run);
      if (action === 'begin') {
        const state = beginCleanup(context, run, {
          pipeline,
          reason: flags.reason,
          note: flags.note,
        });
        console.log(
          `Cleanup started for ${state.runId}; state is ${state.currentState}.`,
        );
        return;
      }
      if (action === 'partial') {
        const state = markCleanupPartial(context, run, {
          pipeline,
          note: flags.note,
        });
        console.log(
          `Cleanup remains partial for ${state.runId}; retry is required.`,
        );
        return;
      }
      if (action === 'finish') {
        const state = finishCleanup(context, run, {
          pipeline,
          note: flags.note,
          purge: Boolean(flags.purge),
        });
        console.log(
          `Cleanup finished for ${state.runId}; state is ${state.currentState}; archive ${flags.purge ? 'purged' : 'kept'}.`,
        );
        return;
      }
      fail('Cleanup action must be begin, partial, or finish.');
    }
    case 'validate': {
      const run = resolveRun(context, flags.run);
      const errors = validateRun(context, run, {
        completion: Boolean(flags.completion),
      });
      if (errors.length > 0) {
        fail(`Validation failed:\n- ${errors.join('\n- ')}`);
      }
      console.log(`Validation PASS for ${run.runId}.`);
      return;
    }
    case 'self-test':
      selfTest(context);
      return;
    case 'help':
    case '--help':
    case '-h':
      printHelp(context);
      return;
    default:
      printHelp(context);
      fail(`Unknown command: ${command}`);
  }
}

try {
  main();
} catch (error) {
  console.error(`claude:pipeline: ${error.message}`);
  process.exitCode = 1;
}
