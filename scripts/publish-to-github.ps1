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

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Stop-WithHelp 'Git is not installed. Install Git for Windows, reopen PowerShell, and run this script again.'
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Stop-WithHelp "GitHub CLI is required for secure sign-in and repository creation.`nInstall it with: winget install --id GitHub.cli`nThen reopen PowerShell and run: gh auth login`nFinally rerun this script. Do not paste any access token into chat."
}

gh auth status | Out-Null
if ($LASTEXITCODE -ne 0) {
  Stop-WithHelp 'GitHub CLI is not signed in. Run `gh auth login`, finish sign-in in your browser, then rerun this script.'
}

$login = (gh api user --jq .login).Trim()
if ([string]::IsNullOrWhiteSpace($login)) {
  Stop-WithHelp 'Could not read the signed-in GitHub username. Run `gh auth status` and try again.'
}

$repoSlug = "$login/$RepoName"
$repoUrl = "https://github.com/$repoSlug.git"

if (-not (Test-Path '.git')) {
  git init --initial-branch=main | Out-Null
}

$currentBranch = (git branch --show-current).Trim()
if ($currentBranch -ne 'main') {
  git branch -M main
}

# Ensure a local commit identity exists without changing global Git settings.
$name = git config --local user.name
$email = git config --local user.email
if ([string]::IsNullOrWhiteSpace($name)) {
  git config --local user.name $login
}
if ([string]::IsNullOrWhiteSpace($email)) {
  git config --local user.email "$login@users.noreply.github.com"
}

# .env and secrets are excluded by .gitignore; .env.example is intentionally tracked.
git add --all
$hasCommit = $true
git rev-parse --verify HEAD *> $null
if ($LASTEXITCODE -ne 0) { $hasCommit = $false }
if (-not $hasCommit) {
  git commit -m 'chore: initialize Samaan store'
} elseif ((git status --porcelain).Trim()) {
  git commit -m 'chore: prepare project for GitHub'
}

# Create a PRIVATE repository by default, or reuse it if it already exists.
$exists = $false
gh repo view $repoSlug *> $null
if ($LASTEXITCODE -eq 0) { $exists = $true }

if (-not $exists) {
  gh repo create $RepoName --private --source . --remote origin --push
  if ($LASTEXITCODE -ne 0) {
    Stop-WithHelp 'GitHub could not create or push the repository. Check the message above; no force-push was attempted.'
  }
} else {
  $origin = git remote get-url origin 2>$null
  if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($origin) -and $origin -notmatch [regex]::Escape($repoSlug)) {
    Stop-WithHelp "The existing origin points to another repository: $origin`nFor safety, the script did not change it. Review `git remote -v` first."
  }
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($origin)) {
    git remote add origin $repoUrl
  }
  git push --set-upstream origin main
  if ($LASTEXITCODE -ne 0) {
    Stop-WithHelp 'Push failed. The script did not force-push. Review the Git error and repository history.'
  }
}

Write-Host "`nDone! Repository: https://github.com/$repoSlug" -ForegroundColor Green
Write-Host 'The repository was created as private if it did not already exist.'
