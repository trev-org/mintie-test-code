import { access, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const problemsRoot = join(root, "problems");
const patternsRoot = join(root, "patterns");

const difficulties = new Set(["easy", "medium", "hard"]);
const complexity = /^O\(.+\)$/;

function requireString(value, field, file) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${file}: ${field} must be a non-empty string`);
  }
}

function requireStringArray(value, field, file) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${file}: ${field} must be a non-empty array`);
  }
  value.forEach((item) => requireString(item, `${field}[]`, file));
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function validatePatterns() {
  const directories = (await readdir(patternsRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const patterns = new Map();

  for (const directory of directories) {
    const file = join(patternsRoot, directory, "pattern.json");
    const pattern = await readJson(file);
    requireString(pattern.slug, "slug", file);
    requireString(pattern.title, "title", file);
    requireString(pattern.summary, "summary", file);
    requireStringArray(pattern.whenToUse, "whenToUse", file);
    requireStringArray(pattern.algorithmSteps, "algorithmSteps", file);
    requireString(pattern.timeComplexity, "timeComplexity", file);
    requireString(pattern.spaceComplexity, "spaceComplexity", file);
    requireStringArray(pattern.exampleProblemSlugs, "exampleProblemSlugs", file);
    if (pattern.slug !== directory) {
      throw new Error(`${file}: slug must match directory name`);
    }
    if (patterns.has(pattern.slug)) {
      throw new Error(`${file}: duplicate pattern slug ${pattern.slug}`);
    }
    patterns.set(pattern.slug, pattern);
  }

  return patterns;
}

async function validateProblems(patterns) {
  const directories = (await readdir(problemsRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const ids = new Set();
  const slugs = new Set();

  for (const directory of directories) {
    const file = join(problemsRoot, directory, "problem.json");
    const problem = await readJson(file);
    if (!Number.isInteger(problem.id) || problem.id <= 0) {
      throw new Error(`${file}: id must be a positive integer`);
    }
    requireString(problem.slug, "slug", file);
    requireString(problem.title, "title", file);
    requireString(problem.summary, "summary", file);
    requireString(problem.sourceUrl, "sourceUrl", file);
    requireString(problem.difficulty, "difficulty", file);
    requireStringArray(problem.algorithmSteps, "algorithmSteps", file);
    requireString(problem.timeComplexity, "timeComplexity", file);
    requireString(problem.spaceComplexity, "spaceComplexity", file);
    requireStringArray(problem.edgeCases, "edgeCases", file);
    requireStringArray(problem.relatedPatterns, "relatedPatterns", file);

    if (!difficulties.has(problem.difficulty)) {
      throw new Error(`${file}: unsupported difficulty ${problem.difficulty}`);
    }
    if (!complexity.test(problem.timeComplexity) || !complexity.test(problem.spaceComplexity)) {
      throw new Error(`${file}: complexities must use O(...) notation`);
    }
    if (!Array.isArray(problem.examples) || problem.examples.length === 0) {
      throw new Error(`${file}: examples must be a non-empty array`);
    }
    for (const example of problem.examples) {
      requireString(example.input, "examples[].input", file);
      requireString(example.output, "examples[].output", file);
      requireString(example.explanation, "examples[].explanation", file);
    }

    const expectedDirectory = `${String(problem.id).padStart(4, "0")}-${problem.slug}`;
    if (directory !== expectedDirectory) {
      throw new Error(`${file}: directory must be ${expectedDirectory}`);
    }
    if (ids.has(problem.id) || slugs.has(problem.slug)) {
      throw new Error(`${file}: duplicate id or slug`);
    }
    for (const pattern of problem.relatedPatterns) {
      if (!patterns.has(pattern)) {
        throw new Error(`${file}: unknown related pattern ${pattern}`);
      }
    }
    ids.add(problem.id);
    slugs.add(problem.slug);
    await Promise.all([
      access(join(problemsRoot, directory, "solution.ts")),
      access(join(problemsRoot, directory, "solution.test.ts")),
    ]);
  }

  if (directories.length !== 10) {
    throw new Error(`Expected 10 problems, found ${directories.length}`);
  }

  for (const [slug, pattern] of patterns) {
    for (const problemSlug of pattern.exampleProblemSlugs) {
      if (!slugs.has(problemSlug)) {
        throw new Error(`${slug}: unknown example problem ${problemSlug}`);
      }
    }
  }
}

const patterns = await validatePatterns();
await validateProblems(patterns);
console.log(`Validated 10 problems and ${patterns.size} patterns.`);
