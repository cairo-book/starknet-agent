#!/usr/bin/env node

// USAGE:
//  oz-docs [-c COMPONENT] [-p PORT] [--verbose] [watch [PATTERNS...]]
//  oz-docs [-c COMPONENT] [--exact] update-version

const path = require('path');
const fs = require('fs');
const proc = require('child_process');
const crypto = require('crypto');
const yaml = require('js-yaml');
const findUp = require('find-up');
const chokidar = require('chokidar');
const chalk = require('chalk');
const isPortReachable = require('is-port-reachable');
const startCase = require('lodash.startcase');
const servbot = require('@frangio/servbot').default;

const env_paths = require('env-paths');

const paths = env_paths('openzeppelin-docs-preview', { suffix: '' });

const {
  c: componentDir = 'docs',
  p: port = '8080',
  exact = false,
  verbose = false,
  _: [command = 'build', ...args],
} = require('minimist')(process.argv.slice(2));

// Clone docs repo

const componentDirs = Array.isArray(componentDir)
  ? componentDir
  : [componentDir];

if (command === 'init') {
  componentDirs.forEach(init);
} else if (command === 'update-version') {
  componentDirs.forEach(updateVersion);
} else {
  const docsDir = getDocsDir();

  setupDocsDir(docsDir);

  const playbook = makePlaybook(docsDir, componentDirs);

  if (command === 'build') {
    build(docsDir, playbook);
    console.error('The site is available at ./build/site');
  } else if (command === 'watch') {
    startServer(port);

    // We will manually run prepare-docs on changes.
    process.env.DISABLE_PREPARE_DOCS = 'true';

    chokidar.watch(args).on(
      'all',
      debounce((ev, file) => {
        console.error(
          chalk.blue(`Detected source changes, rebuilding docs...`),
        );
        proc.spawnSync('npm', ['run', 'prepare-docs'], {
          stdio: 'inherit',
          cwd: path.dirname(file),
        });
      }, 500),
    );

    componentDirs.forEach((c) => watch(c, docsDir, playbook));
  } else {
    console.error(`Unknown command ${command}`);
    process.exit(1);
  }
}

function makePlaybook(docsDir, componentDirs) {
  const components = componentDirs.map((c) =>
    yaml.safeLoad(fs.readFileSync(path.join(c, 'antora.yml'))),
  );

  const playbook = yaml.safeLoad(
    fs.readFileSync(path.join(docsDir, 'playbook.yml')),
  );
  playbook.content.sources = componentDirs.map(getSource);
  playbook.site.start_page = `${components[0].name}::${components[0].start_page || 'index.adoc'}`;
  if (playbook.urls) {
    playbook.urls.html_extension_style = 'default';
    playbook.urls.redirect_facility = 'static';
  }
  playbook.antora.extensions = [
    {
      require: './asciidoc-output-extension.js',
    },
  ];

  const localPlaybookFile = path.resolve(docsDir, 'local-playbook.yml');
  fs.writeFileSync(localPlaybookFile, yaml.safeDump(playbook));
  return localPlaybookFile;
}

function getSource(componentDir) {
  const gitDir = findUp.sync('.git', { type: 'directory' });

  if (gitDir === undefined) {
    throw new Error('Must be inside a git repository');
  }

  const repoDir = path.dirname(gitDir);
  const startPath = path.relative(repoDir, componentDir);

  return {
    url: repoDir,
    start_path: startPath,
    branches: 'HEAD',
  };
}

function getDocsDir() {
  const hash = crypto.createHash('sha1').update(process.cwd()).digest('hex');
  return path.join(paths.cache, hash);
}

function getDocsRevision(docsDir) {
  return proc.execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: docsDir,
    encoding: 'utf8',
  });
}

function debounce(fn, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

function build(docsDir, playbook) {
  proc.spawnSync('npm', ['run', 'build:custom', playbook], {
    cwd: docsDir,
    stdio: 'inherit',
  });
}

async function startServer(port) {
  function error(msg = '') {
    console.error(
      chalk.red(`There has been an error in the server process.\n${msg}`),
    );
    process.exit(1);
  }

  const portBusy = await isPortReachable(port, { timeout: 100 });

  if (portBusy) {
    error(
      `Is port ${port} available? Consider using a different port with '-p PORT'.`,
    );
  } else {
    const root = 'build/site';
    const server = servbot({
      verbose,
      root,
      reload: true,
    });
    server.listen(port);
    chokidar.watch(root).on('all', () => server.reload());

    process.on('exit', () => server.close());
  }
}

function setupDocsDir(docsDir) {
  // We create a build directory in cwd and a symlink from the docs dir to it,
  // so that the built docs are placed here.
  fs.mkdirSync('build/site', { recursive: true });

  if (fs.existsSync(docsDir)) {
    const rev1 = getDocsRevision(docsDir);

    proc.spawnSync('git', ['pull'], {
      stdio: 'inherit',
      cwd: docsDir,
    });

    const rev2 = getDocsRevision(docsDir);

    if (rev1 !== rev2) {
      proc.spawnSync('npx', ['yarn'], {
        cwd: docsDir,
        stdio: 'inherit',
      });
    }
  } else {
    proc.spawnSync(
      'git',
      [
        'clone',
        'https://github.com/OpenZeppelin/docs.openzeppelin.com.git',
        '--depth=1',
        docsDir,
      ],
      {
        stdio: 'inherit',
      },
    );

    proc.spawnSync('npx', ['yarn'], {
      cwd: docsDir,
      stdio: 'inherit',
    });

    fs.symlinkSync(path.resolve('build'), path.join(docsDir, 'build'));
  }
}

function getDocsVersion() {
  const pkgVersion = require(process.cwd() + '/package.json').version;

  const [x, y, z] = pkgVersion.split('.');

  const suffix = z.match(/-[^.]*/)?.[0];
  const prerelease = suffix !== undefined;

  let version = x === '0' || exact ? `${x}.${y}` : `${x}.x`;
  if (prerelease) {
    version += suffix;
  }

  return { version, prerelease };
}

function writeIfMissing(file, contents) {
  try {
    fs.writeFileSync(file, contents, { flag: 'wx' });
  } catch (e) {
    // ignore an error caused by an existing file
    if (e.code !== 'EEXIST') {
      throw e;
    }
  }
}

function updateVersion(componentDir) {
  const { version, prerelease } = getDocsVersion();

  const compPath = path.join(componentDir, 'antora.yml');
  const comp = yaml.safeLoad(fs.readFileSync(compPath));
  comp.version = version;
  comp.prerelease = prerelease;
  fs.writeFileSync(compPath, yaml.safeDump(comp));

  // If we're in an 'npm version' command, and if npm is creating a git tag, we
  // add the changed file to the git index.
  const { npm_lifecycle_event: npm_event } = process.env;
  // npm and yarn seem to use two different variable names.
  const git_tag =
    process.env.npm_config_git_tag_version ||
    process.env.npm_config_version_git_tag;
  if (npm_event === 'version' && git_tag === 'true') {
    proc.spawnSync('git', ['add', compPath], {
      stdio: 'inherit',
    });
  }
}

function init(componentDir) {
  fs.mkdirSync(path.join(componentDir, 'modules/ROOT/pages'), {
    recursive: true,
  });

  const name = path.basename(process.cwd());
  const title = startCase(name);
  const { version, prerelease } = getDocsVersion();

  writeIfMissing(
    path.join(componentDir, 'antora.yml'),
    `\
name: ${name}
title: ${title}
version: ${version}
prerelease: ${prerelease}
nav:
  - modules/ROOT/nav.adoc
`,
  );

  writeIfMissing(
    path.join(componentDir, 'modules/ROOT/nav.adoc'),
    `* xref:index.adoc[Overview]\n`,
  );

  writeIfMissing(
    path.join(componentDir, 'modules/ROOT/pages/index.adoc'),
    `= ${title}\n`,
  );
}

function watch(componentDir, docsDir, playbook) {
  chokidar
    .watch(['**/*.yml', '**/*.adoc'], {
      cwd: componentDir,
    })
    .on(
      'all',
      debounce(() => {
        console.error(chalk.blue(`Detected docs changes, rebuilding site...`));
        build(docsDir, playbook);
        console.error(
          chalk.bold.green(`The site is available at http://localhost:${port}`),
        );
      }, 500),
    );
}
