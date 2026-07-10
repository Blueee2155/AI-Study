$resultsFile = "d:\AI Study\ai-tutor-backend\models\runs\face-study4\results.csv"
$bestPt = "d:\AI Study\ai-tutor-backend\models\runs\face-study4\weights\best.pt"
$targetPt = "d:\AI Study\ai-tutor-backend\models\yolov8n-face.pt"
$logFile = "d:\AI Study\ai-tutor-backend\models\runs\face-study4\monitor.log"
$pid = 21212
$totalEpochs = 50

function Log($msg) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$ts - $msg" | Tee-Object -FilePath $logFile -Append
}

Log "Monitor started. PID=$pid, Target epochs=$totalEpochs"

while ($true) {
    # Check process
    $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
    
    # Count epochs
    $lines = Get-Content $resultsFile | Where-Object { $_.Trim() -ne "" }
    $epochCount = $lines.Count - 1  # minus header
    
    $lastLine = ($lines | Select-Object -Last 1)
    Log "Epoch $epochCount/$totalEpochs completed. Process running: $($proc -ne $null)"
    
    $done = $false
    if ($epochCount -ge $totalEpochs) {
        Log "Training completed: reached $totalEpochs epochs."
        $done = $true
    } elseif ($proc -eq $null) {
        Log "Training process no longer running. Training finished at epoch $epochCount."
        $done = $true
    }
    
    if ($done) {
        Log "=== Final Results ==="
        Log "Last line: $lastLine"
        
        # Copy best weights
        if (Test-Path $bestPt) {
            Copy-Item $bestPt $targetPt -Force
            Log "Copied best.pt -> yolov8n-face.pt"
        } else {
            Log "WARNING: best.pt not found at $bestPt"
        }
        
        # Write completion marker
        $markerFile = "d:\AI Study\ai-tutor-backend\models\runs\face-study4\monitor_done.flag"
        $lastLine | Out-File -FilePath $markerFile -Encoding utf8
        Log "Monitor complete. Flag file written."
        break
    }
    
    Start-Sleep -Seconds 300  # 5 minutes
}
