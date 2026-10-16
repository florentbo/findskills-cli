import { it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

it('the installed npm tarball initializes and exposes MCP tools', { timeout: 120_000 }, async () => {
  const workdir = mkdtempSync(join(tmpdir(), 'findskills-package-'));
  const client = new Client({ name: 'package-test', version: '1.0.0' });
  let stderr = '';
  try {
    // Override to reproduce a released artifact, e.g. findskills-mcp@0.1.25.
    const spec = process.env.FINDSKILLS_PACKAGE_SPEC || packageRoot;
    const [packed] = JSON.parse(execFileSync(npm, [
      'pack', spec, '--ignore-scripts', '--json', '--pack-destination', workdir,
    ], { cwd: packageRoot, encoding: 'utf8', timeout: 30_000 }));
    execFileSync(npm, [
      'install', join(workdir, packed.filename), '--ignore-scripts',
      '--no-audit', '--no-fund', '--package-lock=false',
    ], { cwd: workdir, stdio: 'pipe', timeout: 60_000 });

    const installedRoot = join(workdir, 'node_modules', 'findskills-mcp');
    const pkg = JSON.parse(readFileSync(join(installedRoot, 'package.json'), 'utf8'));
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [join(installedRoot, pkg.bin['findskills-mcp'])],
      cwd: workdir,
      stderr: 'pipe',
    });
    transport.stderr.on('data', chunk => { stderr += chunk.toString(); });
    await client.connect(transport, { timeout: 10_000 });
    const { tools } = await client.listTools();
    assert.ok(tools.some(tool => tool.name === 'search_skills'));
  } catch (error) {
    throw new Error(`${error.message}\nServer stderr:\n${stderr}`, { cause: error });
  } finally {
    await client.close();
    rmSync(workdir, { recursive: true, force: true });
  }
});
