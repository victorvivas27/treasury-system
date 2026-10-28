param(
    [string]$Repository = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path,
    [string]$AgentUserHome = [Environment]::GetFolderPath('UserProfile'),
    [string]$ApprovedManifest = (Join-Path $Repository '.agent-security/pending-manifest-v4.json'),
    [Parameter(Mandatory = $true)][ValidatePattern('^[a-fA-F0-9]{64}$')][string]$ApprovedManifestSha256,
    [Parameter(Mandatory = $true)][string]$CodexExecutable
)
$ErrorActionPreference = 'Stop'
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
if (-not ([Security.Principal.WindowsPrincipal]::new($identity)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Administrator elevation is required. No trust protections were installed.'
}
if ((Resolve-Path -LiteralPath $AgentUserHome).Path -ne [Environment]::GetFolderPath('UserProfile')) {
    throw 'Run elevated as the agent user, not with another administrator account, so user-scope policy targets the correct profile.'
}
$repositoryPath = (Resolve-Path -LiteralPath $Repository).Path
$codexPath = (Resolve-Path -LiteralPath $CodexExecutable).Path
if ([IO.Path]::GetExtension($codexPath) -ne '.exe') { throw 'A native Codex executable is required; script shims are forbidden.' }
$nodePath = (Get-Command node.exe -ErrorAction Stop).Source
$manifestBytes = [IO.File]::ReadAllBytes((Resolve-Path -LiteralPath $ApprovedManifest).Path)
$manifestDigest = [BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash($manifestBytes)).Replace('-', '').ToLowerInvariant()
if ($manifestDigest -ne $ApprovedManifestSha256) { throw 'Approved manifest digest mismatch; do not authorize a new snapshot automatically' }
$approved = [Text.Encoding]::UTF8.GetString($manifestBytes) | ConvertFrom-Json
if ($approved.schema -ne 1 -or $approved.repository -ne $repositoryPath) { throw 'Approved manifest belongs to a different repository' }
$commonData = [Environment]::GetFolderPath('CommonApplicationData')
$programFiles = [Environment]::GetFolderPath('ProgramFiles')
$trust = Join-Path $commonData 'TreasuryAgentTrust/treasury-system'
$requirementsDirectory = Join-Path $commonData 'OpenAI/Codex'
$requirements = Join-Path $requirementsDirectory 'requirements.toml'
$codexHomePath = Join-Path ([Environment]::GetFolderPath('UserProfile')) '.codex'
$managed = Join-Path $codexHomePath 'managed_config.toml'
if ($trust.StartsWith($repositoryPath + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Trust store must be outside the workspace' }
foreach ($destination in @($trust, $requirements, $managed)) {
    if (Test-Path -LiteralPath $destination) { throw "Existing installation/policy must be reviewed and merged by an administrator: $destination" }
}

$admin = [Security.Principal.SecurityIdentifier]::new('S-1-5-32-544')
$system = [Security.Principal.SecurityIdentifier]::new('S-1-5-18')
$users = [Security.Principal.SecurityIdentifier]::new('S-1-5-32-545')
function Protect-Item([string]$LiteralPath) {
    $item = Get-Item -LiteralPath $LiteralPath -Force
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Reparse point rejected: $LiteralPath" }
    $acl = Get-Acl -LiteralPath $LiteralPath
    $acl.SetAccessRuleProtection($true, $false)
    foreach ($entry in @($acl.Access)) { $acl.RemoveAccessRuleSpecific($entry) }
    $acl.SetOwner($admin)
    $inheritance = if ($item.PSIsContainer) { [Security.AccessControl.InheritanceFlags]'ContainerInherit,ObjectInherit' } else { [Security.AccessControl.InheritanceFlags]::None }
    foreach ($sid in @($admin, $system)) {
        $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($sid, 'FullControl', $inheritance, 'None', 'Allow'))
    }
    $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($users, 'ReadAndExecute', $inheritance, 'None', 'Allow'))
    Set-Acl -LiteralPath $LiteralPath -AclObject $acl
}
function Protect-Tree([string]$LiteralPath) {
    Protect-Item $LiteralPath
    if ((Get-Item -LiteralPath $LiteralPath).PSIsContainer) {
        foreach ($item in Get-ChildItem -LiteralPath $LiteralPath -Recurse -Force) { Protect-Item $item.FullName }
    }
}
function Protect-MutableParent([string]$LiteralPath) {
    # Keep ordinary development/authentication writes, but prevent an agent
    # changing this ACL or replacing protected children via DELETE_CHILD.
    $acl = Get-Acl -LiteralPath $LiteralPath
    $acl.SetAccessRuleProtection($true, $false)
    foreach ($entry in @($acl.Access)) { $acl.RemoveAccessRuleSpecific($entry) }
    $acl.SetOwner($admin)
    foreach ($sid in @($admin, $system)) {
        $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($sid, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow'))
    }
    $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($identity.User, 'Modify', 'ContainerInherit,ObjectInherit', 'None', 'Allow'))
    $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($users, 'ReadAndExecute', 'ContainerInherit,ObjectInherit', 'None', 'Allow'))
    $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($users, 'DeleteSubdirectoriesAndFiles', 'None', 'None', 'Deny'))
    Set-Acl -LiteralPath $LiteralPath -AclObject $acl
}

# Refuse user-writable agent or interpreter binaries; do not trust a pnpm shim.
foreach ($executable in @($codexPath, $nodePath)) {
    if (-not $executable.StartsWith($programFiles + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Use a native executable installed under Program Files by an administrator: $executable"
    }
    $acl = Get-Acl -LiteralPath $executable
    if ($acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -notin @($admin.Value, $system.Value, 'S-1-5-80-956008885-3418522649-1831038044-1853292631-2271478464')) {
        throw "Install an administrator-owned native executable first: $executable"
    }
    foreach ($entry in $acl.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier])) {
        $write = [Security.AccessControl.FileSystemRights]::Write -bor [Security.AccessControl.FileSystemRights]::Delete -bor [Security.AccessControl.FileSystemRights]::ChangePermissions -bor [Security.AccessControl.FileSystemRights]::TakeOwnership
        if ($entry.AccessControlType -eq 'Allow' -and ($entry.FileSystemRights -band $write) -and $entry.IdentityReference.Value -notin @($admin.Value, $system.Value, 'S-1-5-80-956008885-3418522649-1831038044-1853292631-2271478464')) {
            throw "User-writable native executable rejected: $executable"
        }
    }
}

New-Item -ItemType Directory -Path $trust | Out-Null
Protect-Item (Split-Path -Parent $trust)
Protect-Item $trust
$approvedControls = @($approved.roots | Where-Object { $_.name -eq 'security-controls' })
if ($approvedControls.Count -ne 1) { throw 'Approved security controls are missing' }
foreach ($name in @('agent-integrity.cjs', 'protected-files.cjs', 'verify-agent-trust.ps1', 'start-trusted-agent.ps1', 'managed-defaults.toml', 'managed-requirements.toml')) {
    $bytes = [IO.File]::ReadAllBytes((Join-Path $PSScriptRoot $name))
    $digest = [BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash($bytes)).Replace('-', '').ToLowerInvariant()
    if ($digest -ne $approvedControls[0].files.$name) { throw "Unapproved security control: $name" }
    [IO.File]::WriteAllBytes((Join-Path $trust $name), $bytes)
    Protect-Item (Join-Path $trust $name)
}
[IO.File]::WriteAllBytes((Join-Path $trust 'manifest.json'), $manifestBytes)
Protect-Item (Join-Path $trust 'manifest.json')
& $nodePath (Join-Path $trust 'agent-integrity.cjs') --verify $repositoryPath (Join-Path $trust 'manifest.json')
if ($LASTEXITCODE -ne 0) { throw 'Sources differ from the approved snapshot; administrator review required' }
$settings = @{ schema = 1; repository = $repositoryPath; node = $nodePath; codex = $codexPath;
    codexHome = $codexHomePath; userHome = $AgentUserHome; userSid = $identity.User.Value }
$settings | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $trust 'installation.json') -Encoding UTF8

# Missing skill roots stay absent in the approved manifest. Adding one is an
# integrity failure, not an implicit authorization to enroll a new skill.
$policy = Get-Content -LiteralPath (Join-Path $trust 'managed-requirements.toml') -Raw
$quotedTrust = $trust.Replace("'", "''")
$powershellPath = Join-Path ([Environment]::GetFolderPath('System')) 'WindowsPowerShell/v1.0/powershell.exe'
$hookCommand = '"' + $powershellPath + '" -NoProfile -NonInteractive -File "' + (Join-Path $trust 'verify-agent-trust.ps1') + '" -TrustRoot "' + $trust + '" -Hook'
$policy += "`n[hooks]`nwindows_managed_dir = '$quotedTrust'`n"
$policy += "`n[[hooks.PreToolUse]]`nmatcher = '.*'`n[[hooks.PreToolUse.hooks]]`ntype = 'command'`ncommand = '$hookCommand'`ncommand_windows = '$hookCommand'`ntimeout = 30`n"
New-Item -ItemType Directory -Path $requirementsDirectory -Force | Out-Null
Protect-Item (Split-Path -Parent $requirementsDirectory)
Protect-Item $requirementsDirectory
[IO.File]::WriteAllText($requirements, $policy, [Text.UTF8Encoding]::new($false))
Copy-Item -LiteralPath (Join-Path $trust 'managed-defaults.toml') -Destination $managed
$manifest = Get-Content -LiteralPath (Join-Path $trust 'manifest.json') -Raw | ConvertFrom-Json
$aclPaths = @($repositoryPath, $codexHomePath, (Join-Path $repositoryPath '.git'), (Join-Path $repositoryPath '.git/config'))
foreach ($root in $manifest.roots) {
    if ($null -ne $root.files) {
        $aclPaths += $root.path
        if ((Get-Item -LiteralPath $root.path).PSIsContainer) {
            $aclPaths += @(Get-ChildItem -LiteralPath $root.path -Recurse -Force | Select-Object -ExpandProperty FullName)
        }
    }
}
$backup = @($aclPaths | Sort-Object -Unique | ForEach-Object { @{ path = $_; sddl = (Get-Acl -LiteralPath $_).Sddl } })
$backup | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $trust 'original-acls.json') -Encoding UTF8
$gitPath = Join-Path $programFiles 'Git/cmd/git.exe'
& $gitPath -C $repositoryPath config --local core.hooksPath .githooks
if ($LASTEXITCODE -ne 0) { throw 'Could not activate publication hooks' }
Protect-MutableParent $repositoryPath
Protect-MutableParent $codexHomePath
Protect-MutableParent (Join-Path $repositoryPath '.git')
foreach ($root in $manifest.roots) {
    if ($null -ne $root.files) { Protect-Tree $root.path }
}
Protect-Tree $trust
Protect-Item $requirements
Protect-Item $managed
Protect-Item (Join-Path $repositoryPath '.git/config')
& (Join-Path $trust 'verify-agent-trust.ps1') -TrustRoot $trust
Write-Output "Installed administrator-owned trust controls at $trust. Restart Codex through start-trusted-agent.ps1; validate managed policy on this client before relying on it."
