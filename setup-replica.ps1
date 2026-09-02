$cfgPath = "C:\Program Files\MongoDB\Server\8.3\bin\mongod.cfg"

if (Test-Path $cfgPath) {
    Write-Host "Reading $cfgPath..."
    $content = Get-Content -Path $cfgPath -Raw
    
    # Replace #replication: with replication config
    if ($content -match "#replication:") {
        $content = $content -replace "#replication:", "replication:`n  replSet: rs0"
        Set-Content -Path $cfgPath -Value $content -Force
        Write-Host "Updated mongod.cfg successfully!"
    } elseif (-not ($content -match "replSet: rs0")) {
        $content += "`nreplication:`n  replSet: rs0`n"
        Set-Content -Path $cfgPath -Value $content -Force
        Write-Host "Appended replication to mongod.cfg successfully!"
    } else {
        Write-Host "mongod.cfg already contains replication config."
    }

    Write-Host "Restarting MongoDB service..."
    Restart-Service -Name "MongoDB" -Force
    Start-Sleep -Seconds 3

    Write-Host "Initiating replica set..."
    & mongosh --eval "try { rs.initiate(); } catch(e) { printjson(e); }"
    Start-Sleep -Seconds 2
    & mongosh --eval "rs.status()"
    
    Write-Host "DONE! Press Enter to exit."
    Read-Host
} else {
    Write-Host "Error: $cfgPath not found!"
    Read-Host
}
