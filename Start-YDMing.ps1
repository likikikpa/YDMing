# Run from PowerShell: .\Start-YDMing.ps1
# Requires Node.js with npm; compatible with Windows PowerShell 5.1 and PowerShell 7.
[CmdletBinding()]
param(
    [ValidateRange(1, 65535)]
    [int]$Port = 5173,
    [switch]$NoBrowser,
    [switch]$SkipBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$serverProcess = $null
$url = "http://127.0.0.1:$Port"

function Test-YDMing {
    try {
        $page = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
        return $page.StatusCode -eq 200 -and $page.Content -match '<title>\s*YDMing(?:\s|<)'
    } catch {
        return $false
    }
}

function Test-PortInUse {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $connection = $client.ConnectAsync('127.0.0.1', $Port)
        return $connection.Wait(500) -and $client.Connected
    } catch {
        return $false
    } finally {
        $client.Dispose()
    }
}

Push-Location -LiteralPath $PSScriptRoot
try {
    if (Test-YDMing) {
        Write-Host "YDMing is already running at $url"
        if (-not $NoBrowser) { Start-Process $url }
        return
    }
    if (Test-PortInUse) {
        throw "Port $Port is in use. Try .\Start-YDMing.ps1 -Port $($Port + 1)"
    }

    $node = Get-Command node.exe -ErrorAction SilentlyContinue
    $npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if (-not $node -or -not $npm) {
        throw 'Install Node.js 24 LTS with npm, reopen PowerShell, and run this script again.'
    }
    & $node.Source (Join-Path $PSScriptRoot 'scripts/check-runtime.mjs')
    if ($LASTEXITCODE -ne 0) { throw 'The installed Node.js version is unsupported.' }

    if (-not (Test-Path -LiteralPath 'node_modules')) {
        Write-Host 'Installing dependencies (internet required on first launch)...'
        & $npm.Source ci
        if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
    }
    if (-not $SkipBuild) {
        Write-Host 'Building YDMing...'
        & $npm.Source run build
        if ($LASTEXITCODE -ne 0) { throw 'The build failed.' }
    }
    if (-not (Test-Path -LiteralPath 'dist/index.html')) {
        throw 'No production build found. Run this script without -SkipBuild.'
    }

    $logDirectory = Join-Path ([System.IO.Path]::GetTempPath()) ('YDMing-' + [Guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $logDirectory | Out-Null
    $stdoutPath = Join-Path $logDirectory 'server.log'
    $stderrPath = Join-Path $logDirectory 'server-error.log'
    $previousHost = $env:HOST
    $previousPort = $env:PORT
    try {
        $env:HOST = '127.0.0.1'
        $env:PORT = [string]$Port
        $serverScript = '"' + (Join-Path $PSScriptRoot 'server.mjs') + '"'
        $serverProcess = Start-Process -FilePath $node.Source -ArgumentList $serverScript -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath
    } finally {
        $env:HOST = $previousHost
        $env:PORT = $previousPort
    }

    $deadline = [DateTime]::UtcNow.AddSeconds(20)
    $ready = $false
    while ([DateTime]::UtcNow -lt $deadline) {
        if ($serverProcess.HasExited) { break }
        if (Test-YDMing) { $ready = $true; break }
        Start-Sleep -Milliseconds 200
    }
    if (-not $ready) {
        $details = Get-Content -LiteralPath $stderrPath -Raw -ErrorAction SilentlyContinue
        throw "YDMing did not start. Logs: $logDirectory`n$details"
    }

    Write-Host "YDMing is ready: $url"
    Write-Host 'Keep this PowerShell window open. Press Ctrl+C to stop YDMing.'
    if (-not $NoBrowser) { Start-Process $url }
    while (-not $serverProcess.WaitForExit(250)) { }
    if ($serverProcess.ExitCode -ne 0) {
        throw "YDMing stopped unexpectedly. Logs: $logDirectory"
    }
} catch {
    Write-Error -Message $_.Exception.Message -ErrorAction Continue
    exit 1
} finally {
    if ($null -ne $serverProcess -and -not $serverProcess.HasExited) {
        Stop-Process -Id $serverProcess.Id -ErrorAction SilentlyContinue
    }
    if ($null -ne $serverProcess) { $serverProcess.Dispose() }
    Pop-Location
}
