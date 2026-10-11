param(
  [ValidateRange(30, 3600)]
  [int]$IntervalSeconds = 60
)

$ErrorActionPreference = "Continue"
$root = (& git rev-parse --show-toplevel 2>$null)
if ($LASTEXITCODE -ne 0 -or -not $root) {
  Write-Host "[Samaan Auto Sync] Open the Samaan Git repository in VS Code first."
  exit 1
}
$root = $root.Trim()
$lastStatus = ""

function Show-Status([string]$Message) {
  if ($script:lastStatus -ne $Message) {
    Write-Host "[Samaan Auto Sync] $Message"
    $script:lastStatus = $Message
  }
}

Write-Host "[Samaan Auto Sync] Running. Checking GitHub every $IntervalSeconds seconds."
Write-Host "[Samaan Auto Sync] This task only fast-forwards a clean local main branch; it never discards local changes."

while ($true) {
  try {
    $branch = (& git -C $root branch --show-current 2>$null)
    if ($LASTEXITCODE -ne 0) {
      Show-Status "Could not read the current Git branch."
    } elseif ($branch.Trim() -ne "main") {
      Show-Status "Paused because the current branch is '$($branch.Trim())'. Switch to main to auto-sync."
    } else {
      $localChanges = @(& git -C $root status --porcelain --untracked-files=normal 2>$null)
      if ($LASTEXITCODE -ne 0) {
        Show-Status "Could not inspect local changes; skipped syncing for safety."
      } elseif ($localChanges.Count -gt 0) {
        Show-Status "Paused: local changes detected. Commit or stash them before syncing; no files were changed."
      } else {
        & git -C $root fetch --quiet origin
        if ($LASTEXITCODE -ne 0) {
          Show-Status "GitHub fetch failed. Check your internet connection and Git authentication."
        } else {
          $aheadText = (& git -C $root rev-list --count "origin/main..HEAD" 2>$null)
          $aheadExit = $LASTEXITCODE
          $behindText = (& git -C $root rev-list --count "HEAD..origin/main" 2>$null)
          $behindExit = $LASTEXITCODE

          if ($aheadExit -ne 0 -or $behindExit -ne 0) {
            Show-Status "Could not compare branches; skipped syncing for safety."
          } elseif ([int]$aheadText -gt 0) {
            Show-Status "Paused: local main has commits not on GitHub. No automatic merge was attempted."
          } elseif ([int]$behindText -gt 0) {
            Show-Status "New GitHub updates found. Applying a safe fast-forward..."
            & git -C $root merge --ff-only origin/main
            if ($LASTEXITCODE -eq 0) {
              Show-Status "Updated successfully. VS Code files and the Next.js dev server should refresh."
            } else {
              Show-Status "Fast-forward was not possible, so no automatic merge was made."
            }
          } else {
            Show-Status "Everything is up to date."
          }
        }
      }
    }
  } catch {
    Show-Status "Unexpected sync issue: $($_.Exception.Message)"
  }

  Start-Sleep -Seconds $IntervalSeconds
}
