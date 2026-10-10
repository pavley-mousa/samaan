param(
    [Parameter()]
    [ValidatePattern('^[A-Za-z0-9._-]+$')]
    [string]$RepoName = 'samaan'
)

$ErrorActionPreference = 'Stop'

function Stop-WithHelp([string]$Message) {
    Write-Host "`n$Message" -ForegroundColor Yellow
    exit 1
}

# This script is intended to live in <project>\scripts\publish-to-github.ps1.
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
if (-not (Test-Path (Join-Path $ProjectRoot 'package.json'))) {
    Stop-WithHelp "Could not find package.json at $ProjectRoot. Place this script inside the project's scripts folder."
}
Set-Location $ProjectRoot

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Stop-WithHelp 'Git is not installed. Install Git for Windows, reopen PowerShell, and run this script again.'
}
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Stop-WithHelp "GitHub CLI is required to create a private repository safely.`nInstall with: winget install --id GitHub.cli`nThen reopen PowerShell, run: gh auth login`nThen rerun this script. Do not paste any access token into chat."
}

gh auth status *> $null
if ($LASTEXITCODE -ne 0) {
    Stop-WithHelp 'GitHub CLI is not signed in. Run `gh auth login`, finish sign-in in your browser, then rerun this script.'
}
$login = (gh api user --jq .login).Trim()
if ([string]::IsNullOrWhiteSpace($login)) {
    Stop-WithHelp 'Could not read the signed-in GitHub username. Check `gh auth status` and try again.'
}
$repoSlug = "$login/$RepoName"
$repoUrl = "https://github.com/$repoSlug.git"

# Ensure local secrets, dependencies, and build output are ignored.
$ignorePath = Join-Path $ProjectRoot '.gitignore'
$requiredIgnore = @(
    '# Local secrets and credentials',
    '.env',
    '.env.*',
    '!.env.example',
    '**/.env',
    '**/.env.*',
    '!**/.env.example',
    'samaan.env',
    '**/samaan.env',
    '.npmrc',
    '**/.npmrc',
    '',
    '# Dependencies and generated output',
    'node_modules/',
    '**/node_modules/',
    '.next/',
    '**/.next/',
    'dist/',
    '**/dist/',
    'build/',
    'coverage/',
    '*.log',
    '.DS_Store',
    'Thumbs.db',
    '.idea/',
    '.vscode/',
    '.turbo/',
    '**/.turbo/'
)
$currentIgnore = if (Test-Path $ignorePath) { Get-Content $ignorePath } else { @() }
foreach ($line in $requiredIgnore) {
    if ($line -ne '' -and $currentIgnore -notcontains $line) {
        Add-Content -Path $ignorePath -Value $line -Encoding utf8
        $currentIgnore += $line
    }
}

if (-not (Test-Path '.git')) {
    git init --initial-branch=main | Out-Null
    if ($LASTEXITCODE -ne 0) { Stop-WithHelp 'Could not initialize the local Git repository.' }
}
$currentBranch = (git branch --show-current).Trim()
if ($currentBranch -ne 'main') {
    git branch -M main
    if ($LASTEXITCODE -ne 0) { Stop-WithHelp 'Could not set the branch name to main.' }
}

# Never commit local environment files, even if one was previously tracked.
$tracked = @(git ls-files)
foreach ($path in $tracked) {
    $base = [System.IO.Path]::GetFileName($path)
    $isSecretEnv = ($base -eq '.env') -or (($base -like '.env.*') -and ($base -ne '.env.example')) -or ($base -eq 'samaan.env') -or ($base -eq '.npmrc')
    if ($isSecretEnv) {
        git rm --cached --ignore-unmatch -- "$path" *> $null
    }
}

git add --all
if ($LASTEXITCODE -ne 0) { Stop-WithHelp 'Git could not stage the project files.' }

# Last safety check before any commit or push.
$stagedStatus = @(git diff --cached --name-status)
$staged = @($stagedStatus | ForEach-Object { ($_ -split "`t", 2)[-1] })
# A staged deletion of a previously-tracked .env is safe to remove from the repo;
# new/modified secret files are blocked from being committed.
$unsafe = @($stagedStatus | Where-Object {
    $parts = $_ -split "`t", 2
    $status = $parts[0]
    $path = if ($parts.Count -gt 1) { $parts[1] } else { '' }
    $base = [System.IO.Path]::GetFileName($path)
    $secretName = ($base -eq '.env') -or (($base -like '.env.*') -and ($base -ne '.env.example')) -or ($base -eq 'samaan.env') -or ($base -eq '.npmrc') -or ($base -eq 'node_modules')
    $secretName -and ($status -ne 'D')
})
if ($unsafe.Count -gt 0) {
    git reset --quiet
    Stop-WithHelp ("Safety check stopped the upload because secret/config files were staged: " + ($unsafe -join ', ') + ". They were not committed by this script.")
}
if ($staged.Count -eq 0 -and -not (git rev-parse --verify HEAD 2>$null)) {
    Stop-WithHelp 'No project files were found to commit.'
}

# Set commit identity locally only; do not alter the global Git configuration.
$name = (git config --local user.name).Trim()
$email = (git config --local user.email).Trim()
if ([string]::IsNullOrWhiteSpace($name)) { git config --local user.name $login }
if ([string]::IsNullOrWhiteSpace($email)) { git config --local user.email "$login@users.noreply.github.com" }

$hasCommit = $true
git rev-parse --verify HEAD *> $null
if ($LASTEXITCODE -ne 0) { $hasCommit = $false }
if (-not $hasCommit) {
    git commit -m 'chore: initialize Samaan store'
    if ($LASTEXITCODE -ne 0) { Stop-WithHelp 'Commit failed. Review the Git error above.' }
} elseif ((git status --porcelain).Trim()) {
    git commit -m 'chore: prepare Samaan project for GitHub'
    if ($LASTEXITCODE -ne 0) { Stop-WithHelp 'Commit failed. Review the Git error above.' }
}

# Create private if needed; reuse only the exact repository for this account.
$exists = $false
gh repo view $repoSlug *> $null
if ($LASTEXITCODE -eq 0) { $exists = $true }
if (-not $exists) {
    gh repo create $RepoName --private --source . --remote origin --push
    if ($LASTEXITCODE -ne 0) {
        Stop-WithHelp 'GitHub could not create or push the repository. Review the message above; the script never force-pushes.'
    }
} else {
    $origin = (git remote get-url origin 2>$null)
    if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($origin) -and $origin -notmatch [regex]::Escape($repoSlug)) {
        Stop-WithHelp "The existing origin points to another repository: $origin`nFor safety, the script did not change it. Review `git remote -v` first."
    }
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($origin)) {
        git remote add origin $repoUrl
        if ($LASTEXITCODE -ne 0) { Stop-WithHelp 'Could not add the GitHub remote.' }
    }
    git push --set-upstream origin main
    if ($LASTEXITCODE -ne 0) {
        Stop-WithHelp 'Push failed. The script did not force-push. Review the Git error and remote history.'
    }
}
Write-Host "`nDone! Repository: https://github.com/$repoSlug" -ForegroundColor Green
Write-Host 'The repository was created as private if it did not already exist. Local .env files are excluded.'
