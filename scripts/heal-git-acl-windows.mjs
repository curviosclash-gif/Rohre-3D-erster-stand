#!/usr/bin/env node
import { existsSync } from 'node:fs';
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';

const DENY_SID_DEFAULT = 'S-1-5-21-81707007-567096520-2204353533-1984080185';
const denySid = String(process.env.CURVIOS_GIT_DENY_SID || DENY_SID_DEFAULT).trim();

function log(message) {
    process.stdout.write(`[git-acl-heal] ${message}\n`);
}

function warn(message) {
    process.stderr.write(`[git-acl-heal] ${message}\n`);
}

function resolveRepoRoot() {
    try {
        return execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
    } catch {
        return '';
    }
}

function runPowerShellAclHeal(gitDirPath, sid) {
    const script = `
$ErrorActionPreference = 'Stop'
$path = '${gitDirPath.replace(/'/g, "''")}'
$sid = '${sid.replace(/'/g, "''")}'
if (-not (Test-Path -LiteralPath $path)) {
    Write-Output 'skip:missing_git_dir'
    exit 0
}
$acl = Get-Acl -LiteralPath $path
$allDenyRules = @(
    $acl.Access | Where-Object {
        $_.AccessControlType -eq [System.Security.AccessControl.AccessControlType]::Deny
    }
)
function Is-WriteDenyRule($rule) {
    $rightsText = [string]$rule.FileSystemRights
    return $rightsText -match 'Write|Create|Modify|Delete|ChangePermissions|TakeOwnership|FullControl'
}
$denyRulesBySid = @(
    $allDenyRules | Where-Object {
        $_.IdentityReference.Value -eq $sid -and (Is-WriteDenyRule $_)
    }
)
$denyRulesHeuristic = @(
    $allDenyRules | Where-Object {
        $identity = $_.IdentityReference.Value
        $isWellKnownAdmin = $identity -eq 'NT AUTHORITY\\SYSTEM' -or $identity -eq 'BUILTIN\\Administrators'
        $looksLikeUserSid = $identity -like 'S-1-5-21-*'
        (-not $isWellKnownAdmin) -and $looksLikeUserSid -and (Is-WriteDenyRule $_)
    }
)
$denyRules = @($denyRulesBySid + $denyRulesHeuristic | Select-Object -Unique)
if ($denyRules.Count -eq 0) {
    Write-Output 'ok:no_explicit_deny'
    exit 0
}
foreach ($rule in $denyRules) {
    [void]$acl.RemoveAccessRuleSpecific($rule)
}
Set-Acl -LiteralPath $path -AclObject $acl
$afterAcl = Get-Acl -LiteralPath $path
$remaining = @(
    $afterAcl.Access | Where-Object {
        $_.AccessControlType -eq [System.Security.AccessControl.AccessControlType]::Deny -and (
            $_.IdentityReference.Value -eq $sid -or $_.IdentityReference.Value -like 'S-1-5-21-*'
        ) -and (Is-WriteDenyRule $_)
    }
).Count
if ($remaining -gt 0) {
    throw "deny_sid_still_present:$remaining"
}
$removedIdentities = @($denyRules | ForEach-Object { $_.IdentityReference.Value } | Select-Object -Unique)
Write-Output ('ok:removed_deny_rules=' + $denyRules.Count + ';identities=' + ($removedIdentities -join ','))
`;

    return spawnSync(
        'powershell',
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script],
        { encoding: 'utf8' }
    );
}

function main() {
    if (process.platform !== 'win32') {
        log('skip (non-windows platform)');
        return;
    }
    const repoRoot = resolveRepoRoot();
    if (!repoRoot) {
        log('skip (not inside a git worktree)');
        return;
    }
    const gitDir = path.join(repoRoot, '.git');
    if (!existsSync(gitDir)) {
        log(`skip (.git not found at ${gitDir})`);
        return;
    }

    const result = runPowerShellAclHeal(gitDir, denySid);
    if (result.status !== 0) {
        const stderr = String(result.stderr || '').trim();
        const stdout = String(result.stdout || '').trim();
        warn('failed to heal ACL deny on .git');
        if (stdout) warn(stdout);
        if (stderr) warn(stderr);
        warn(`continue without hard-fail; commit may still fail with index.lock permission errors (sid=${denySid}).`);
        return;
    }

    const output = String(result.stdout || '').trim();
    if (output) {
        log(output);
    } else {
        log('ok');
    }
}

main();
