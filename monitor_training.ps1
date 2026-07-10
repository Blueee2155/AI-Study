# Monitor training and deploy when complete
$resultsFile = "d:\AI Study\ai-tutor-backend\models\runs\face-study4\results.csv"
$bestPt = "d:\AI Study\ai-tutor-backend\models\runs\face-study4\weights\best.pt"
$deployPt = "d:\AI Study\ai-tutor-backend\models\yolov8n-face.pt"
$startTime = Get-Date

Write-Host "=== Training Monitor Started at $startTime ==="

while ($true) {
    $now = Get-Date
    Write-Host ""
    Write-Host "[$now] Checking status..."
    
    # Check epoch count
    if (Test-Path $resultsFile) {
        $lines = (Get-Content $resultsFile).Count
        $epochs = $lines - 1
        Write-Host "  Completed epochs: $epochs"
    }
    
    # Check if training process is running
    $isRunning = $false
    $procs = Get-Process python* -ErrorAction SilentlyContinue
    if ($procs) {
        foreach ($p in $procs) {
            $cmdline = (Get-CimInstance Win32_Process -Filter "ProcessId = $($p.Id)").CommandLine
            if ($cmdline -like '*train_yolov8*') {
                $isRunning = $true
                Write-Host "  Training process PID: $($p.Id), Mem: $([math]::Round($p.WorkingSet64/1MB))MB"
            }
        }
    }
    
    if ($isRunning) {
        Write-Host "  Status: Training in progress"
    } else {
        Write-Host "  Status: Training process NOT detected"
        
        # Double check - wait 30 seconds and check again
        Write-Host "  Waiting 30s to confirm..."
        Start-Sleep -Seconds 30
        
        $isRunning2 = $false
        $procs2 = Get-Process python* -ErrorAction SilentlyContinue
        if ($procs2) {
            foreach ($p in $procs2) {
                $cmdline = (Get-CimInstance Win32_Process -Filter "ProcessId = $($p.Id)").CommandLine
                if ($cmdline -like '*train_yolov8*') {
                    $isRunning2 = $true
                }
            }
        }
        
        if (-not $isRunning2) {
            Write-Host ""
            Write-Host "=== TRAINING COMPLETED ==="
            $elapsed = (Get-Date) - $startTime
            Write-Host "  Monitor elapsed time: $([math]::Round($elapsed.TotalMinutes, 1)) minutes"
            
            # Read final results
            if (Test-Path $resultsFile) {
                $finalLines = Get-Content $resultsFile
                $finalEpochs = $finalLines.Count - 1
                Write-Host "  Total epochs completed: $finalEpochs"
                Write-Host "  Final row: $($finalLines[-1])"
            }
            
            # Check and deploy best.pt
            if (Test-Path $bestPt) {
                $bestInfo = Get-Item $bestPt
                Write-Host "  best.pt found: $($bestInfo.Length) bytes, modified: $($bestInfo.LastWriteTime)"
                
                Write-Host "  Deploying model..."
                Copy-Item $bestPt $deployPt -Force
                
                $deployInfo = Get-Item $deployPt
                Write-Host "  Deployed: $($deployInfo.FullName)"
                Write-Host "  Size: $($deployInfo.Length) bytes"
                Write-Host "  Time: $($deployInfo.LastWriteTime)"
                Write-Host ""
                Write-Host "=== DEPLOYMENT COMPLETE ==="
            } else {
                Write-Host "  WARNING: best.pt not found!"
            }
            
            # Write status file for leader
            $statusContent = @"
TRAINING_COMPLETE
Epochs: $finalEpochs
FinalMetrics: $($finalLines[-1])
ModelDeployed: $deployPt
MonitorDuration: $([math]::Round($elapsed.TotalMinutes, 1)) minutes
CompletedAt: $(Get-Date)
"@
            $statusContent | Out-File "d:\AI Study\training_status.txt" -Encoding UTF8
            Write-Host "  Status written to training_status.txt"
            
            break
        } else {
            Write-Host "  False alarm, training still running"
        }
    }
    
    Write-Host "  Sleeping 5 minutes..."
    Start-Sleep -Seconds 300
}
