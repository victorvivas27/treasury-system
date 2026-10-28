param(
    [Parameter(Mandatory = $true)][string]$TrustRoot,
    [switch]$Hook
)
$ErrorActionPreference = 'Stop'
try {
    $trusted = (Resolve-Path -LiteralPath $TrustRoot).Path
    $adminSid = 'S-1-5-32-544'
    $systemSid = 'S-1-5-18'
    foreach ($item in @($trusted) + @(Get-ChildItem -LiteralPath $trusted -Recurse -Force | Select-Object -ExpandProperty FullName)) {
        if ((Get-Item -LiteralPath $item -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Linked trust store rejected' }
        $acl = Get-Acl -LiteralPath $item
        $owner = $acl.GetOwner([Security.Principal.SecurityIdentifier]).Value
        if ($owner -notin @($adminSid, $systemSid)) { throw "Trust store is not administrator-owned: $item" }
        foreach ($rule in $acl.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier])) {
            $writeRights = [Security.AccessControl.FileSystemRights]::Write -bor [Security.AccessControl.FileSystemRights]::Delete -bor [Security.AccessControl.FileSystemRights]::DeleteSubdirectoriesAndFiles -bor [Security.AccessControl.FileSystemRights]::ChangePermissions -bor [Security.AccessControl.FileSystemRights]::TakeOwnership
            if ($rule.AccessControlType -eq 'Allow' -and ($rule.FileSystemRights -band $writeRights) -and $rule.IdentityReference.Value -notin @($adminSid, $systemSid)) { throw "Writable trust store rejected: $item" }
        }
    }
    $settings = Get-Content -LiteralPath (Join-Path $trusted 'installation.json') -Raw | ConvertFrom-Json
    & $settings.node (Join-Path $trusted 'agent-integrity.cjs') --verify $settings.repository (Join-Path $trusted 'manifest.json') | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Agent integrity verification failed' }
    # Do not grant approval here: preserve the runtime's ordinary approval policy.
    if ($Hook) { '{}' }
} catch {
    if ($Hook) {
        # An explicit denial blocks the action; hook errors alone can fail open.
        '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Agent trust verification failed; administrator review required"}}'
        exit 0
    }
    throw
}
