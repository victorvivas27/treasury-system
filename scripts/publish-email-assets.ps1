# Publishes only the five decorative PNGs. Does not deploy frontend or backend.
# Requires explicit approval before execution; the bucket is dedicated to public artwork.
$ErrorActionPreference = 'Stop'
$project = 'treasury-system-app-vivas'
$bucket = 'gs://treasury-system-app-vivas-email-assets'
$assetRoot = Join-Path $PSScriptRoot '../frontend/public/email/v1'
$filenames = @('icono-tesoreria.png', 'support-chat.png', 'principal_login.png', 'password-changed.png', 'password-reset.png')
foreach ($filename in $filenames) {
    $assetPath = Join-Path $assetRoot $filename
    if (-not (Test-Path -LiteralPath $assetPath -PathType Leaf)) {
        throw "Missing image: $assetPath"
    }
}

# Abort on an existing bucket: never change the access policy of a pre-existing bucket.
& gcloud storage buckets create $bucket --project=$project --location=southamerica-west1 --uniform-bucket-level-access
if ($LASTEXITCODE -ne 0) { throw 'Could not create the dedicated public-artwork bucket. No access policy was changed.' }

foreach ($filename in $filenames) {
    $assetPath = Join-Path $assetRoot $filename
    & gcloud storage cp $assetPath "$bucket/email/v1/$filename" --project=$project --content-type=image/png --cache-control='public,max-age=31536000,immutable' --no-clobber
    if ($LASTEXITCODE -ne 0) { throw "Upload failed: $filename. The bucket has not been made public." }
}

& gcloud storage buckets add-iam-policy-binding $bucket --project=$project --member=allUsers --role=roles/storage.objectViewer
if ($LASTEXITCODE -ne 0) { throw 'Public read access was not enabled. Check the organization policy before continuing.' }

Write-Output 'Published only email artwork: https://storage.googleapis.com/treasury-system-app-vivas-email-assets/email/v1/'
