$resultsFile = "d:\AI Study\ai-tutor-backend\models\runs\face-study4\results.csv"
$bestPt = "d:\AI Study\ai-tutor-backend\models\runs\face-study4\weights\best.pt"
$targetPt = "d:\AI Study\ai-tutor-backend\models\yolov8n-face.pt"
$totalEpochs = 50
$pids = @(21212, 34812)

Write-Host "=== YOLOv8 Training Monitor Started ==="
Write-Host "Monitoring: $resultsFile"
Write-Host "Target epochs: $totalEpochs"
Write-Host ""

while ($true) {
    # Check if results file exists
    if (-not (Test-Path $resultsFile)) {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Results file not found yet, waiting..."
        Start-Sleep -Seconds 300
        continue
    }

    # Count lines (epoch count = lines - 1 for header)
    $lines = (Get-Content $resultsFile).Count
    $currentEpoch = $lines - 1
    $progress = [math]::Round(($currentEpoch / $totalEpochs) * 100, 1)

    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Epoch $currentEpoch / $totalEpochs ($progress%)"

    # Check if training completed (50 epochs reached)
    if ($currentEpoch -ge $totalEpochs) {
        Write-Host ""
        Write-Host "=== TRAINING COMPLETED! ==="
        Write-Host "All $totalEpochs epochs finished."
        break
    }

    # Check if training processes are still running
    $anyRunning = $false
    foreach ($procId in $pids) {
        try {
            $proc = Get-Process -Id $procId -ErrorAction Stop
            $anyRunning = $true
        } catch {
            # Process not found
        }
    }

    if (-not $anyRunning -and $currentEpoch -gt 0) {
        Write-Host ""
        Write-Host "=== TRAINING PROCESSES ENDED ==="
        Write-Host "No training processes running. Completed $currentEpoch epochs."
        break
    }

    # Wait 5 minutes before next check
    Start-Sleep -Seconds 300
}

# Read final results
Write-Host ""
Write-Host "=== Final Training Metrics ==="
$allLines = Get-Content $resultsFile
$header = $allLines[0]
$lastLine = $allLines[$allLines.Count - 1]
Write-Host "Header: $header"
Write-Host "Final:  $lastLine"

# Parse final metrics
$fields = $lastLine -split ','
Write-Host ""
Write-Host "Epoch: $($fields[0])"
Write-Host "Train box_loss: $($fields[1])"  # time is fields[1], losses start at [2]
# Actually let me re-parse with header
$headerFields = $header -split ','
$lastFields = $lastLine -split ','
Write-Host ""
Write-Host "--- Key Metrics ---"
for ($i = 0; $i -lt $headerFields.Count; $i++) {
    $name = $headerFields[$i].Trim()
    $val = $lastFields[$i].Trim()
    if ($name -match "mAP50|loss|precision|recall" -or $name -eq "epoch") {
        Write-Host "$name : $val"
    }
}

# Copy best.pt to models/yolov8n-face.pt
Write-Host ""
if (Test-Path $bestPt) {
    Copy-Item -Path $bestPt -Destination $targetPt -Force
    Write-Host "=== DEPLOYED: best.pt copied to $targetPt ==="
} else {
    Write-Host "WARNING: best.pt not found at $bestPt"
    # Try to find any .pt file in weights dir
    $weightsDir = "d:\AI Study\ai-tutor-backend\models\runs\face-study4\weights"
    if (Test-Path $weightsDir) {
        $ptFiles = Get-ChildItem -Path $weightsDir -Filter "*.pt"
        Write-Host "Available .pt files:"
        $ptFiles | ForEach-Object { Write-Host "  $($_.Name) ($([math]::Round($_.Length/1MB, 2)) MB)" }
        if ($ptFiles.Count -gt 0) {
            $src = $ptFiles | Where-Object { $_.Name -eq "best.pt" } | Select-Object -First 1
            if (-not $src) { $src = $ptFiles[0] }
            Copy-Item -Path $src.FullName -Destination $targetPt -Force
            Write-Host "DEPLOYED: $($src.Name) copied to $targetPt"
        }
    }
}

Write-Host ""
Write-Host "=== MONITORING COMPLETE ==="
