param([switch]$DryRun)

$ErrorActionPreference = 'Stop'
$imageProject = 'treasury-system-app-vivas'
$imageBucket = 'gs://treasury-system-app-vivas-email-assets'
$imageWorkspace = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$imageRoot = (Resolve-Path -LiteralPath (Join-Path $imageWorkspace 'frontend/public/app-images/v1')).Path
$imageManifestPath = Join-Path $imageWorkspace 'frontend/src/shared/assets/publicImages.manifest.json'
$imageManifest = Get-Content -LiteralPath $imageManifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
if ($imageManifest.baseUrl -ne 'https://storage.googleapis.com/treasury-system-app-vivas-email-assets/app/v1') {
    throw 'Unexpected public artwork destination.'
}

# Validate the complete batch before uploading any object. No IAM or email changes.
$imageUploads = @($imageManifest.images.PSObject.Properties | ForEach-Object {
    $imageRecord = $_.Value
    if ($imageRecord.file -notmatch '^[a-z0-9_-]+\.[a-f0-9]{12}\.webp$') { throw 'Unexpected artwork filename.' }
    $imagePath = (Resolve-Path -LiteralPath (Join-Path $imageRoot $imageRecord.file)).Path
    if (-not $imagePath.StartsWith($imageRoot + '\', [StringComparison]::OrdinalIgnoreCase)) {
        throw 'Artwork source is outside the expected directory.'
    }
    if ((Get-Item -LiteralPath $imagePath).Length -ne $imageRecord.bytes -or
        (Get-FileHash -LiteralPath $imagePath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $imageRecord.sha256) {
        throw "Artwork does not match manifest: $($imageRecord.file)"
    }
    [PSCustomObject]@{
        Source = $imagePath
        Destination = "$imageBucket/app/v1/$($imageRecord.file)"
        Bytes = $imageRecord.bytes
    }
})
if ($imageUploads.Count -ne 9) { throw 'Expected exactly nine public illustrations.' }
$imageUploads | Select-Object Destination, Bytes | Format-Table -AutoSize
if ($DryRun) { return }

foreach ($imageUpload in $imageUploads) {
    & gcloud storage cp $imageUpload.Source $imageUpload.Destination --project=$imageProject `
        --content-type=image/webp --cache-control='public,max-age=31536000,immutable' --no-clobber
    if ($LASTEXITCODE -ne 0) { throw "Upload failed: $($imageUpload.Destination)" }
}
Write-Output 'Published nine content-versioned illustrations. Existing email objects and bucket permissions were not changed.'
