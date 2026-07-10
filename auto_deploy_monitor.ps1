$resultsFile = "d:\AI Study\ai-tutor-backend\models\runs\face-study4\results.csv"
$bestPt = "d:\AI Study\ai-tutor-backend\models\runs\face-study4\weights\best.pt"
$deployPt = "d:\AI Study\ai-tutor-backend\models\yolov8n-face.pt"
$statusFile = "d:\AI Study\training_status.txt"

function Check-Training {
    # Check results.csv
    if (Test-Path $resultsFile) {
        $content = Get-Content $resultsFile
        $epochs = $content.Count - 1
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Completed epochs: $epochs"
    } else {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Results file not found"
        return $false
    }

    # Check training process
    $trainingProc = $null
    Get-Process python* -ErrorAction SilentlyContinue | ForEach-Object {
        $cmdline = (Get-CimInstance Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine
        if ($cmdline -like '*train_yolov8*') { $trainingProc = $_ }
    }

    if ($trainingProc) {
        $mem = (Get-CimInstance Win32_Process -Filter "ProcessId = $($trainingProc.Id)").WorkingSetSize
        Write-Host "  Training running - PID: $($trainingProc.Id), Memory: $([math]::Round($mem/1MB))MB"
        return $false
    } else {
        Write-Host "  Training process NOT found"
        return $true
    }
}

Write-Host "=== Monitoring started ==="
$deployed = $false

while (-not $deployed) {
    $done = Check-Training

    if ($done) {
        Write-Host ""
        Write-Host "=== TRAINING COMPLETED ==="

        # Wait a moment for files to be written
        Start-Sleep -Seconds 5

        # Check best.pt
        if (Test-Path $bestPt) {
            $f = Get-Item $bestPt
            Write-Host "best.pt found: $($f.Length) bytes, modified: $($f.LastWriteTime)"

            # Deploy
            Copy-Item $bestPt $deployPt -Force
            Write-Host "Copied best.pt -> yolov8n-face.pt"

            # Verify
            if (Test-Path $deployPt) {
                $d = Get-Item $deployPt
                Write-Host "Deployed model: $($d.Length) bytes, modified: $($d.LastWriteTime)"
                $deployed = $true
            } else {
                Write-Host "ERROR: Deployment verification failed"
            }
        } else {
            Write-Host "ERROR: best.pt not found"
        }
    }

    if (-not $deployed) {
        Write-Host "  Waiting 5 minutes..."
        Start-Sleep -Seconds 300
    }
}

# Read final metrics
Write-Host ""
Write-Host "=== DEPLOYMENT COMPLETE ==="
$lastLine = (Get-Content $resultsFile)[-1]
Write-Host "Final metrics line: $lastLine"

# Write status file
$status = @"
Status: COMPLETE
Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
Final epoch line: $lastLine
Best model deployed: $deployPt
"@
$status | Out-File $statusFile -Encoding UTF8
Write-Host "Status written to $statusFile"
