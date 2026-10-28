#!/usr/bin/env node

/**
 * Consulta repetible del estado de la flota de contenedores OCI.
 *
 * La conexion siempre es SSH al host y, desde ahi, `docker exec` al contenedor.
 * No se intenta conectar a los puertos 2201-2206: no estan expuestos a Internet.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CONFIG_PATH = path.join(SCRIPT_DIR, 'fleet-status.env');

const HOST_DEFAULTS = [
  {
    id: 'temporal-1',
    prefix: 'FLEET_TEMPORAL_1',
    address: '160.34.219.124',
    containers: [
      'temporal1-agent1',
      'temporal1-agent2',
      'temporal1-agent3',
      'temporal1-agent4',
    ],
  },
  {
    id: 'temporal-2',
    prefix: 'FLEET_TEMPORAL_2',
    address: '163.192.153.145',
    containers: [
      'temporal2-agent1',
      'temporal2-agent2',
      'temporal2-agent3',
      'temporal2-agent4',
      'temporal2-agent5',
      'temporal2-agent6',
    ],
  },
  {
    id: 'temporal-3',
    prefix: 'FLEET_TEMPORAL_3',
    address: '159.54.133.219',
    containers: [
      'temporal3-agent1',
      'temporal3-agent2',
      'temporal3-agent3',
    ],
  },
];

const RECORD_BEGIN = '__FLEET_RECORD_BEGIN__';
const RECORD_END = '__FLEET_RECORD_END__';

function usage() {
  return `Estado de la flota OCI

Uso:
  node scripts/fleet-status.mjs [opciones]

Opciones:
  --json              Emite un documento JSON en stdout (sin tabla).
  --config <archivo>  Carga la configuracion desde <archivo>.
  --help              Muestra esta ayuda.

Configuracion:
  Se lee scripts/fleet-status.env si existe. Las variables de entorno del
  proceso tienen prioridad sobre ese archivo. Ver scripts/fleet-status.env.example.
`;
}

function fail(message, code = 1) {
  console.error(`fleet-status: ${message}`);
  process.exit(code);
}

function parseArgs(argv) {
  const options = {
    json: false,
    help: false,
    configPath: process.env.FLEET_CONFIG || DEFAULT_CONFIG_PATH,
    configExplicit: Boolean(process.env.FLEET_CONFIG),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--json') {
      options.json = true;
    } else if (argument === '--help' || argument === '-h') {
      options.help = true;
    } else if (argument === '--config') {
      const value = argv[index + 1];
      if (!value) fail('--config requiere una ruta');
      options.configPath = path.resolve(value);
      options.configExplicit = true;
      index += 1;
    } else if (argument.startsWith('--config=')) {
      options.configPath = path.resolve(argument.slice('--config='.length));
      options.configExplicit = true;
    } else {
      fail(`opcion desconocida: ${argument}`);
    }
  }

  return options;
}

function parseEnvFile(content) {
  const values = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const withoutExport = line.startsWith('export ') ? line.slice(7).trim() : line;
    const separator = withoutExport.indexOf('=');
    if (separator <= 0) continue;

    const key = withoutExport.slice(0, separator).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;

    let value = withoutExport.slice(separator + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      const quote = value[0];
      value = value.slice(1, -1);
      if (quote === '"') {
        value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\"/g, '"');
      }
    } else {
      value = value.replace(/\s+#.*$/, '').trim();
    }
    values[key] = value;
  }
  return values;
}

function loadConfig(configPath, required) {
  const resolved = path.resolve(configPath);
  if (!fs.existsSync(resolved)) {
    if (required) fail(`no existe el archivo de configuracion: ${resolved}`);
    return {};
  }
  try {
    return parseEnvFile(fs.readFileSync(resolved, 'utf8'));
  } catch (error) {
    fail(`no se pudo leer ${resolved}: ${error.message}`);
  }
  return {};
}

function expandHome(value) {
  if (value === '~') return os.homedir();
  if (value.startsWith('~/') || value.startsWith('~\\')) {
    return path.join(os.homedir(), value.slice(2));
  }
  return value;
}

function cleanText(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\u0000/g, '')
    .replace(/\r/g, '')
    .replace(/[\t\n]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function truncate(value, maximum) {
  const text = cleanText(value) || '-';
  if (text.length <= maximum) return text;
  if (maximum <= 3) return text.slice(0, maximum);
  return `${text.slice(0, maximum - 3)}...`;
}

function parsePositiveInteger(value, fallback, name) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    fail(`${name} debe ser un entero positivo`);
  }
  return parsed ?? fallback;
}

function splitList(value) {
  return String(value)
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildHosts(setting) {
  const customJson = setting('FLEET_HOSTS_JSON', '').trim();
  let hosts;

  if (customJson) {
    try {
      hosts = JSON.parse(customJson);
    } catch (error) {
      fail(`FLEET_HOSTS_JSON no es JSON valido: ${error.message}`);
    }
    if (!Array.isArray(hosts) || hosts.length === 0) {
      fail('FLEET_HOSTS_JSON debe ser un arreglo no vacio');
    }
  } else {
    hosts = HOST_DEFAULTS.map((host) => ({
      id: host.id,
      address: setting(`${host.prefix}_HOST`, host.address),
      containers: splitList(
        setting(`${host.prefix}_CONTAINERS`, host.containers.join(' ')),
      ),
    }));
  }

  const seenIds = new Set();
  const seenContainers = new Set();
  const sshUser = setting('FLEET_SSH_USER', 'yizuz').trim();

  for (const host of hosts) {
    if (!host || typeof host !== 'object') fail('cada host debe ser un objeto');
    if (!host.id || !host.address) fail('cada host necesita id y address');
    if (seenIds.has(host.id)) fail(`id de host duplicado: ${host.id}`);
    seenIds.add(host.id);

    if (!Array.isArray(host.containers) || host.containers.length === 0) {
      fail(`el host ${host.id} necesita al menos un contenedor`);
    }
    host.containers = host.containers.map(String).filter(Boolean);
    for (const container of host.containers) {
      if (seenContainers.has(container)) fail(`contenedor duplicado: ${container}`);
      seenContainers.add(container);
    }

    host.address = String(host.address).trim();
    if (!host.address.includes('@') && sshUser) {
      host.address = `${sshUser}@${host.address}`;
    }
  }

  return hosts;
}

function resolveSshKey(setting) {
  const configured = setting('SSH_KEY', '').trim();
  if (configured) {
    const resolved = path.resolve(expandHome(configured));
    if (!fs.existsSync(resolved)) {
      fail(`SSH_KEY no existe: ${resolved}`);
    }
    return resolved;
  }

  const home = process.env.USERPROFILE || os.homedir();
  const defaultKey = path.join(home, '.ssh', 'id_ed25519');
  return fs.existsSync(defaultKey) ? defaultKey : null;
}

function encodeBase64(value) {
  return Buffer.from(String(value), 'utf8').toString('base64');
}

function buildRemoteScript(host, options) {
  const containerBlocks = host.containers
    .map((container) => encodeBase64(container))
    .join('\n');

  return `set +e
export LC_ALL=C

REPO_PATH=$(printf '%s' '${encodeBase64(options.repoPath)}' | base64 -d)
DOCKER_USER=$(printf '%s' '${encodeBase64(options.dockerUser)}' | base64 -d)
DOCKER_BIN=$(printf '%s' '${encodeBase64(options.dockerSudo ? 'sudo -n docker' : 'docker')}' | base64 -d)
TMUX_SOCKET_TEMPLATE=$(printf '%s' '${encodeBase64(options.tmuxSocketTemplate)}' | base64 -d)
LOG_TAIL=$(printf '%s' '${encodeBase64(options.logTail)}' | base64 -d)
DISK_PATH=$(printf '%s' '${encodeBase64(options.diskPath)}' | base64 -d)

HOST_UPTIME=$(awk '{s=int($1); d=int(s/86400); h=int((s%86400)/3600); m=int((s%3600)/60); if(d>0) printf "%dd %dh", d, h; else if(h>0) printf "%dh %dm", h, m; else printf "%dm", m}' /proc/uptime 2>/dev/null)
DISK_USED=$(df -P "$DISK_PATH" 2>/dev/null | awk 'NR==2 {gsub(/%/,"",$5); print $5}')
RAM_FREE=$(awk '/^MemFree:/ {printf "%d", int($2/1024); found=1} END {if(!found) print ""}' /proc/meminfo 2>/dev/null)

emit_field() {
  printf '%s\\t' "$1"
  printf '%s' "$2" | base64 | tr -d '\\r\\n'
  printf '\\n'
}

append_warning() {
  if [ -z "$warning" ]; then
    warning="$1"
  else
    warning="$warning; $1"
  fi
}

CONTAINERS=()
while IFS= read -r encoded; do
  [ -n "$encoded" ] || continue
  CONTAINERS+=("$(printf '%s' "$encoded" | base64 -d)")
done <<'FLEET_CONTAINERS_EOF'
${containerBlocks}
FLEET_CONTAINERS_EOF

for container in "\${CONTAINERS[@]}"; do
  warning=""
  error=""
  hostname_value=""
  container_uptime=""
  tmux_data=""
  git_data=""
  last_build_error=""

  inspect=$($DOCKER_BIN inspect -f '{{.State.Running}}|{{.State.Status}}|{{.State.StartedAt}}' "$container" 2>/dev/null)
  running=$(printf '%s' "$inspect" | cut -d'|' -f1)
  state=$(printf '%s' "$inspect" | cut -d'|' -f2)
  started=$(printf '%s' "$inspect" | cut -d'|' -f3)

  last_build_error=$($DOCKER_BIN logs --tail "$LOG_TAIL" "$container" 2>&1 | grep -Ei '(^|[^[:alpha:]])(error|failed|failure|fatal|exception)([^[:alpha:]]|$)|npm[[:space:]]+ERR!|ELIFECYCLE|Cannot find module|Module not found|command not found' | tail -n 1 | tr -d '\\r')

  if [ "$running" != "true" ]; then
    if [ -z "$inspect" ]; then
      error="no existe o Docker no responde"
    else
      error="contenedor detenido ($state)"
    fi

    printf '%s\\n' '${RECORD_BEGIN}'
    emit_field name "$container"
    emit_field status DOWN
    emit_field hostname ""
    emit_field container_uptime ""
    emit_field host_uptime "$HOST_UPTIME"
    emit_field disk_used_percent "$DISK_USED"
    emit_field ram_free_mib "$RAM_FREE"
    emit_field tmux ""
    emit_field branch ""
    emit_field commit ""
    emit_field commit_subject ""
    emit_field dirty_files ""
    emit_field last_build_error "$last_build_error"
    emit_field warning ""
    emit_field error "$error"
    printf '%s\\n' '${RECORD_END}'
    continue
  fi

  hostname_value=$($DOCKER_BIN exec "$container" hostname 2>/dev/null | head -n 1)
  [ -n "$hostname_value" ] || append_warning "no se pudo leer hostname"

  now_epoch=$(date +%s 2>/dev/null)
  started_epoch=$(date -d "$started" +%s 2>/dev/null)
  if [ -n "$now_epoch" ] && [ -n "$started_epoch" ]; then
    elapsed=$((now_epoch - started_epoch))
    if [ "$elapsed" -ge 0 ]; then
      days=$((elapsed / 86400))
      hours=$(((elapsed % 86400) / 3600))
      minutes=$(((elapsed % 3600) / 60))
      if [ "$days" -gt 0 ]; then
        container_uptime="$days d $hours h"
      elif [ "$hours" -gt 0 ]; then
        container_uptime="$hours h $minutes min"
      else
        container_uptime="$minutes min"
      fi
    fi
  fi
  [ -n "$container_uptime" ] || append_warning "no se pudo calcular uptime"

  [ -n "$HOST_UPTIME" ] || append_warning "no se pudo leer uptime del host"
  [ -n "$DISK_USED" ] || append_warning "no se pudo leer disco del host"
  [ -n "$RAM_FREE" ] || append_warning "no se pudo leer RAM libre del host"

  tmux_data=$($DOCKER_BIN exec -u "$DOCKER_USER" "$container" bash -lc '
    uid=$(id -u 2>/dev/null) || exit 0
    socket=$(printf "$1" "$uid")
    if [ ! -S "$socket" ]; then
      detected=$(tmux display-message -p "#{socket_path}" 2>/dev/null)
      [ -n "$detected" ] && socket="$detected"
    fi
    [ -S "$socket" ] || exit 0
    tmux -S "$socket" list-sessions -F "$(printf "S\\t#{session_name}")" 2>/dev/null
    tmux -S "$socket" list-panes -a -F "$(printf "P\\t#{session_name}\\t#{pane_current_command}\\t#{pane_title}\\t#{window_name}")" 2>/dev/null
  ' sh "$TMUX_SOCKET_TEMPLATE" 2>/dev/null)

  git_data=$($DOCKER_BIN exec -u "$DOCKER_USER" "$container" bash -lc '
    cd "$1" 2>/dev/null || exit 2
    branch=$(git symbolic-ref --quiet --short HEAD 2>/dev/null)
    if [ -z "$branch" ]; then
      branch="(detached)"
    fi
    commit=$(git log -1 --pretty=format:%h 2>/dev/null)
    [ -n "$commit" ] || exit 3
    subject=$(git log -1 --pretty=format:%s 2>/dev/null)
    dirty=$(git status --porcelain=v1 --untracked-files=normal 2>/dev/null | wc -l | tr -d " ")
    printf "G\\t%s\\t%s\\t%s\\t%s" "$branch" "$commit" "$subject" "$dirty"
  ' sh "$REPO_PATH" 2>/dev/null)
  [ -n "$git_data" ] || append_warning "no se pudo leer git en $REPO_PATH"

  printf '%s\\n' '${RECORD_BEGIN}'
  emit_field name "$container"
  emit_field status UP
  emit_field hostname "$hostname_value"
  emit_field container_uptime "$container_uptime"
  emit_field host_uptime "$HOST_UPTIME"
  emit_field disk_used_percent "$DISK_USED"
  emit_field ram_free_mib "$RAM_FREE"
  emit_field tmux "$tmux_data"
  emit_field branch "$git_data"
  emit_field commit "$git_data"
  emit_field commit_subject "$git_data"
  emit_field dirty_files "$git_data"
  emit_field last_build_error "$last_build_error"
  emit_field warning "$warning"
  emit_field error ""
  printf '%s\\n' '${RECORD_END}'
done

exit 0
`;
}

function runProcess(command, args, input, timeoutMs) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    let timedOut = false;

    const child = spawn(command, args, {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', (error) => {
      finish({
        code: null,
        signal: null,
        stdout,
        stderr,
        error: error.message,
        timedOut,
      });
    });
    child.on('close', (code, signal) => {
      finish({
        code,
        signal,
        stdout,
        stderr,
        error: timedOut ? `tiempo de espera agotado (${timeoutMs} ms)` : null,
        timedOut,
      });
    });

    child.stdin.on('error', () => {});
    child.stdin.end(input);
  });
}

function decodeBase64(value) {
  try {
    return Buffer.from(value, 'base64').toString('utf8');
  } catch {
    return '';
  }
}

function parseRemoteRecords(stdout) {
  const records = [];
  let current = null;

  for (const line of stdout.split(/\r?\n/)) {
    if (line === RECORD_BEGIN) {
      current = {};
      continue;
    }
    if (line === RECORD_END) {
      if (current) records.push(current);
      current = null;
      continue;
    }
    if (!current) continue;

    const separator = line.indexOf('\t');
    if (separator < 0) continue;
    const key = line.slice(0, separator);
    const encoded = line.slice(separator + 1);
    current[key] = decodeBase64(encoded);
  }

  return records;
}

function parseTmuxSessions(raw) {
  const sessions = new Map();

  for (const line of String(raw || '').split(/\r?\n/)) {
    if (line.startsWith('S\t')) {
      const name = line.slice(2).trim();
      if (name && !sessions.has(name)) {
        sessions.set(name, { name, isCline: false });
      }
      continue;
    }
    if (!line.startsWith('P\t')) continue;

    const parts = line.split('\t');
    const name = (parts[1] || '').trim();
    const metadata = parts.slice(2).join(' ').toLowerCase();
    if (!name) continue;
    if (!sessions.has(name)) sessions.set(name, { name, isCline: false });
    if (metadata.includes('cline')) sessions.get(name).isCline = true;
  }

  return [...sessions.values()];
}

function parseGitData(raw) {
  const line = String(raw || '').split(/\r?\n/).find((item) => item.startsWith('G\t'));
  if (!line) return null;

  const parts = line.split('\t');
  if (parts.length < 5) return null;
  const dirty = Number.parseInt(parts[parts.length - 1], 10);
  return {
    branch: parts[1] || null,
    commit: parts[2] || null,
    commitSubject: parts.slice(3, -1).join('\t') || null,
    dirtyFiles: Number.isInteger(dirty) ? dirty : null,
  };
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function baseContainer(host, name, reason = null) {
  return {
    host: host.id,
    sshHost: host.address,
    name,
    status: 'DOWN',
    hostname: null,
    containerUptime: null,
    hostUptime: null,
    diskUsedPercent: null,
    ramFreeMiB: null,
    tmuxSessions: [],
    git: {
      branch: null,
      commit: null,
      commitSubject: null,
      dirtyFiles: null,
    },
    lastBuildError: null,
    warnings: [],
    error: reason,
  };
}

async function collectHost(host, configuration) {
  const sshArgs = [
    '-o',
    'BatchMode=yes',
    '-o',
    `ConnectTimeout=${configuration.connectTimeout}`,
    '-o',
    `StrictHostKeyChecking=${configuration.strictHostKeyChecking}`,
    '-o',
    'ServerAliveInterval=15',
    '-o',
    'ServerAliveCountMax=2',
    '-o',
    'LogLevel=ERROR',
  ];

  if (configuration.sshPort) {
    sshArgs.push('-p', String(configuration.sshPort));
  }
  if (configuration.sshKey) {
    sshArgs.push('-i', configuration.sshKey, '-o', 'IdentitiesOnly=yes');
  }
  sshArgs.push(host.address, 'bash -s');

  const remoteScript = buildRemoteScript(host, configuration);
  const result = await runProcess(
    configuration.sshCommand,
    sshArgs,
    remoteScript,
    configuration.commandTimeout,
  );

  const records = parseRemoteRecords(result.stdout);
  if (process.env.FLEET_DEBUG === 'true') {
    process.stderr.write(`--- salida remota cruda de ${host.id} ---\n${result.stdout}\n`);
  }
  const byName = new Map(records.map((record) => [record.name, record]));
  const hostError = result.error
    ? result.error
    : result.code !== 0
      ? cleanText(result.stderr) || `ssh termino con codigo ${result.code}`
      : null;

  const containers = host.containers.map((name) => {
    const record = byName.get(name);
    if (!record) {
      return baseContainer(host, name, hostError || 'el host no devolvio datos del contenedor');
    }

    const status = record.status === 'UP' ? 'UP' : 'DOWN';
    const warnings = String(record.warning || '')
      .split(';')
      .map((item) => cleanText(item))
      .filter(Boolean);
    const error = cleanText(record.error) || null;

    if (hostError && status === 'UP') {
      warnings.push(`ssh: ${cleanText(hostError)}`);
    }

    const git = parseGitData(record.branch);
    return {
      host: host.id,
      sshHost: host.address,
      name,
      status,
      hostname: cleanText(record.hostname) || null,
      containerUptime: cleanText(record.container_uptime) || null,
      hostUptime: cleanText(record.host_uptime) || null,
      diskUsedPercent: numberOrNull(record.disk_used_percent),
      ramFreeMiB: numberOrNull(record.ram_free_mib),
      tmuxSessions: parseTmuxSessions(record.tmux),
      git: git || {
        branch: null,
        commit: null,
        commitSubject: null,
        dirtyFiles: null,
      },
      lastBuildError: cleanText(record.last_build_error) || null,
      warnings,
      error,
    };
  });

  return { host, containers, hostError };
}

function renderTable(containers) {
  const hostUptimes = new Map();
  for (const container of containers) {
    if (!hostUptimes.has(container.host)) {
      hostUptimes.set(container.host, container.hostUptime || '-');
    }
  }

  const columns = [
    { title: 'HOST', width: 11, value: (row) => row.host },
    { title: 'CONTENEDOR', width: 20, value: (row) => row.name },
    { title: 'EST', width: 5, value: (row) => row.status },
    { title: 'HOSTNAME', width: 18, value: (row) => row.hostname || '-' },
    { title: 'CONT.UP', width: 10, value: (row) => row.containerUptime || '-' },
    { title: 'DISCO', width: 7, value: (row) => (row.diskUsedPercent === null ? '-' : `${row.diskUsedPercent}%`) },
    { title: 'RAM', width: 10, value: (row) => (row.ramFreeMiB === null ? '-' : `${row.ramFreeMiB} MiB`) },
    {
      title: 'TMUX',
      width: 24,
      value: (row) =>
        row.tmuxSessions.length === 0
          ? '-'
          : row.tmuxSessions.map((session) => `${session.name}${session.isCline ? '*' : ''}`).join(', '),
    },
    { title: 'RAMA', width: 20, value: (row) => row.git.branch || '-' },
    {
      title: 'COMMIT',
      width: 34,
      value: (row) =>
        row.git.commit
          ? `${row.git.commit}${row.git.commitSubject ? ` ${row.git.commitSubject}` : ''}`
          : '-',
    },
    { title: 'SUCIOS', width: 7, value: (row) => (row.git.dirtyFiles === null ? '-' : row.git.dirtyFiles) },
    {
      title: 'ULT.ERROR',
      width: 56,
      value: (row) => row.error || row.lastBuildError || row.warnings.join('; ') || '-',
    },
  ];

  const header = columns.map((column) => column.title.padEnd(column.width)).join('  ');
  const separator = columns.map((column) => '-'.repeat(column.width)).join('  ');
  const rows = containers.map((container) =>
    columns
      .map((column) => truncate(column.value(container), column.width).padEnd(column.width))
      .join('  '),
  );

  console.log(header);
  console.log(separator);
  for (const row of rows) console.log(row);
  console.log('');
  const uptimes = [...hostUptimes.entries()]
    .map(([host, uptime]) => `${host}=${uptime}`)
    .join(' | ');
  console.log(`Uptime host: ${uptimes}`);
  console.log('TMUX: * indica una sesion detectada como Cline.');
}

function renderReport(report) {
  const { summary } = report;
  console.log(
    `Flota: ${summary.total} contenedores | ${summary.up} UP | ${summary.down} DOWN | ${summary.hosts} hosts | ${summary.ok ? 'OK' : 'CON ERRORES'}`,
  );
  console.log('');
  renderTable(report.containers);

  const problems = report.containers.filter(
    (container) => container.status !== 'UP' || container.warnings.length > 0 || container.error,
  );
  if (problems.length > 0) {
    console.log('');
    console.log('Avisos:');
    for (const problem of problems) {
      const detail = problem.error || problem.warnings.join('; ') || problem.lastBuildError || 'estado DOWN';
      console.log(`  - ${problem.name}: ${detail}`);
    }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }

  const fileConfig = loadConfig(options.configPath, options.configExplicit);
  const setting = (name, fallback = '') => {
    if (process.env[name] !== undefined && process.env[name] !== '') return process.env[name];
    if (fileConfig[name] !== undefined && fileConfig[name] !== '') return fileConfig[name];
    return fallback;
  };

  const hosts = buildHosts(setting);
  const configuration = {
    repoPath: setting('FLEET_REPO_PATH', '/workspace/ciudadan_app_monorepo'),
    dockerUser: setting('FLEET_DOCKER_USER', 'yizuz'),
    dockerSudo: setting('FLEET_DOCKER_SUDO', 'true') !== 'false',
    tmuxSocketTemplate: setting('FLEET_TMUX_SOCKET_TEMPLATE', '/tmp/tmux-%s/default'),
    diskPath: setting('FLEET_HOST_DISK_PATH', '/'),
    logTail: String(parsePositiveInteger(setting('FLEET_LOG_TAIL', '500'), 500, 'FLEET_LOG_TAIL')),
    connectTimeout: parsePositiveInteger(
      setting('FLEET_SSH_CONNECT_TIMEOUT', '10'),
      10,
      'FLEET_SSH_CONNECT_TIMEOUT',
    ),
    commandTimeout: parsePositiveInteger(
      setting('FLEET_SSH_COMMAND_TIMEOUT', '120000'),
      120000,
      'FLEET_SSH_COMMAND_TIMEOUT',
    ),
    strictHostKeyChecking: setting('FLEET_SSH_STRICT_HOST_KEY_CHECKING', 'accept-new'),
    sshCommand: setting('FLEET_SSH_COMMAND', 'ssh'),
    sshPort: setting('FLEET_SSH_PORT', ''),
    sshKey: resolveSshKey(setting),
  };

  const hostResults = await Promise.all(
    hosts.map((host) => collectHost(host, configuration)),
  );
  const containers = hostResults.flatMap((result) => result.containers);
  const down = containers.filter((container) => container.status !== 'UP').length;
  const up = containers.length - down;
  const collectionErrors = containers.filter(
    (container) => container.error || container.warnings.length > 0,
  ).length;
  const unreachableHosts = hostResults.filter((result) => result.hostError).length;
  const ok = down === 0 && collectionErrors === 0;

  const report = {
    generatedAt: new Date().toISOString(),
    ok,
    summary: {
      total: containers.length,
      up,
      down,
      collectionErrors,
      hosts: hosts.length,
      unreachableHosts,
    },
    containers,
  };

  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    renderReport(report);
  }

  process.exitCode = ok ? 0 : 1;
}

main().catch((error) => {
  fail(error.stack || error.message || String(error));
});
