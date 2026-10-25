const http = require('node:http');

const dockerApi = process.env.DOCKER_API_URL || 'http://docker-socket-proxy:2375';
const port = Number(process.env.PORT || 9105);

function escapeLabel(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

async function dockerGet(path) {
  const response = await fetch(`${dockerApi}${path}`, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Docker API returned ${response.status}`);
  return response.json();
}

async function collectMetrics() {
  const containers = await dockerGet('/containers/json');
  const lines = [
    '# HELP docker_container_cpu_usage_cores Container CPU usage in CPU cores.',
    '# TYPE docker_container_cpu_usage_cores gauge',
    '# HELP docker_container_memory_usage_bytes Container memory working set in bytes.',
    '# TYPE docker_container_memory_usage_bytes gauge',
    '# HELP docker_container_memory_limit_bytes Container memory limit in bytes.',
    '# TYPE docker_container_memory_limit_bytes gauge'
  ];

  await Promise.all(containers.map(async (container) => {
    const stats = await dockerGet(`/containers/${container.Id}/stats?stream=false`).catch(() => null);
    if (!stats) return;

    const containerName = (container.Names?.[0] || container.Id).replace(/^\//, '');
    const label = `container_name="${escapeLabel(containerName)}"`;
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
    const cpuCount = stats.cpu_stats.online_cpus || stats.cpu_stats.cpu_usage.percpu_usage?.length || 1;
    const cpuCores = systemDelta > 0 ? Math.max(0, cpuDelta / systemDelta * cpuCount) : 0;
    const memoryStats = stats.memory_stats.stats || {};
    const cacheBytes = memoryStats.inactive_file || memoryStats.total_inactive_file || 0;
    const memoryBytes = Math.max(0, (stats.memory_stats.usage || 0) - cacheBytes);
    const memoryLimit = stats.memory_stats.limit || 0;

    lines.push(`docker_container_cpu_usage_cores{${label}} ${cpuCores}`);
    lines.push(`docker_container_memory_usage_bytes{${label}} ${memoryBytes}`);
    lines.push(`docker_container_memory_limit_bytes{${label}} ${memoryLimit}`);
  }));

  return `${lines.join('\n')}\n`;
}

http.createServer(async (request, response) => {
  if (request.url !== '/metrics') {
    response.writeHead(404).end();
    return;
  }

  try {
    response.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4; charset=utf-8' });
    response.end(await collectMetrics());
  } catch (error) {
    console.error('Metrics collection failed:', error.message);
    response.writeHead(503).end('Docker metrics unavailable\n');
  }
}).listen(port, '0.0.0.0', () => {
  console.log(`Docker container metrics listening on ${port}`);
});