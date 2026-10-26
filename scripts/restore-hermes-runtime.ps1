param([Parameter(Mandatory = $true)][string]$From)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$target = Join-Path $projectRoot 'vendor\hermes-runtime'
$source = (Resolve-Path -LiteralPath $From).Path
$expected = Get-Content -LiteralPath (Join-Path $target 'manifest.json') -Raw | ConvertFrom-Json
$actual = Get-Content -LiteralPath (Join-Path $source 'manifest.json') -Raw | ConvertFrom-Json
foreach ($field in @('project', 'revision', 'python', 'pythonArchiveSha256')) {
    if ($actual.$field -ne $expected.$field) { throw "Runtime manifest mismatch: $field" }
}
foreach ($relative in @('python\python.exe', 'python\LICENSE.txt', 'hermes\run_agent.py', 'hermes\LICENSE', 'dependencies.json', 'NOTICE.txt')) {
    if (-not (Test-Path -LiteralPath (Join-Path $source $relative) -PathType Leaf)) {
        throw "Required runtime file is missing: $relative"
    }
}
$expectedDependencies = Get-Content -LiteralPath (Join-Path $target 'dependencies.json') -Raw | ConvertFrom-Json
$actualDependencies = Get-Content -LiteralPath (Join-Path $source 'dependencies.json') -Raw | ConvertFrom-Json
$expectedList = @($expectedDependencies | ForEach-Object { "$($_.name)==$($_.version)" } | Sort-Object)
$actualList = @($actualDependencies | ForEach-Object { "$($_.name)==$($_.version)" } | Sort-Object)
if (@(Compare-Object $expectedList $actualList).Count -gt 0) { throw 'Python dependency manifest mismatch' }
if ([string]::Equals($source.TrimEnd('\'), $target.TrimEnd('\'), [StringComparison]::OrdinalIgnoreCase)) {
    Write-Output 'Runtime is already present; fixed-version manifests checked.'
    exit 0
}
foreach ($part in @('python', 'hermes')) {
    $destination = Join-Path $target $part
    if (Test-Path -LiteralPath $destination) { throw "Destination already exists; restore to a clean checkout: $part" }
}
foreach ($part in @('python', 'hermes')) {
    Copy-Item -LiteralPath (Join-Path $source $part) -Destination (Join-Path $target $part) -Recurse
}
Write-Output 'Hermes runtime restored. Run the application and validate before distributing a package.'
