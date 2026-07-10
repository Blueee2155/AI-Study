$bestPt = "d:\AI Study\ai-tutor-backend\models\runs\face-study4\weights\best.pt"
$deployPt = "d:\AI Study\ai-tutor-backend\models\yolov8n-face.pt"

Write-Host "=== Deploying model ==="

# 1. Confirm best.pt exists
if (Test-Path $bestPt) {
    $f = Get-Item $bestPt
    Write-Host "best.pt found: $($f.Length) bytes, modified: $($f.LastWriteTime)"
} else {
    Write-Host "ERROR: best.pt not found!"
    exit 1
}

# 2. Copy to deploy path
Copy-Item $bestPt $deployPt -Force
Write-Host "Copied best.pt -> yolov8n-face.pt"

# 3. Verify
if (Test-Path $deployPt) {
    $d = Get-Item $deployPt
    Write-Host "Verified: $($d.FullName)"
    Write-Host "  Size: $($d.Length) bytes"
    Write-Host "  Modified: $($d.LastWriteTime)"
    Write-Host "=== DEPLOYMENT SUCCESS ==="
} else {
    Write-Host "ERROR: Deployment verification failed!"
    exit 1
}

# Also read current training status
$resultsFile = "d:\AI Study\ai-tutor-backend\models\runs\face-study4\results.csv"
$lines = (Get-Content $resultsFile).Count
Write-Host "Training status: $($lines - 1) epochs completed in results.csv"
Write-Host "Last line: $((Get-Content $resultsFile)[-1])"
