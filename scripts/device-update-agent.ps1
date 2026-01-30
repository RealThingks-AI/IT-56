# RT-IT-Hub Device Update Agent
# This script collects Windows Update information and sends it to RT-IT-Hub

# === CONFIGURATION ===
$API_ENDPOINT = "https://iarndwlbrmjbsjvugqvr.supabase.co/functions/v1/ingest-device-updates"
$API_KEY = "YOUR_API_KEY_HERE"  # Your device agent API key

# === FUNCTIONS ===

function Get-PendingUpdates {
    try {
        Write-Host "  Checking pending updates..." -ForegroundColor Gray
        $updateSession = New-Object -ComObject Microsoft.Update.Session
        $updateSearcher = $updateSession.CreateUpdateSearcher()
        $searchResult = $updateSearcher.Search("IsInstalled=0 and Type='Software'")
        
        $updates = @()
        foreach ($update in $searchResult.Updates) {
            $kbNumber = "Unknown"
            if ($update.KBArticleIDs.Count -gt 0) {
                $kbNumber = "KB" + $update.KBArticleIDs[0]
            }
            
            $severity = "Unknown"
            if ($update.MsrcSeverity) {
                $severity = $update.MsrcSeverity
            }
            
            $updates += @{
                kb_number = $kbNumber
                title = $update.Title
                severity = $severity
                size_mb = [math]::Round($update.MaxDownloadSize / 1MB, 2)
            }
        }
        Write-Host "  Found $($updates.Count) pending updates" -ForegroundColor Gray
        return $updates
    }
    catch {
        Write-Warning "Error getting pending updates: $_"
        return @()
    }
}

function Get-InstalledUpdates {
    try {
        Write-Host "  Checking installed updates..." -ForegroundColor Gray
        $updates = @()
        $hotfixes = Get-HotFix | Select-Object -First 50 | Sort-Object InstalledOn -Descending
        
        foreach ($hotfix in $hotfixes) {
            if ($hotfix.HotFixID -and $hotfix.InstalledOn) {
                $updates += @{
                    kb_number = $hotfix.HotFixID
                    title = $hotfix.Description
                    installed_date = $hotfix.InstalledOn.ToString("yyyy-MM-ddTHH:mm:ss")
                }
            }
        }
        Write-Host "  Found $($updates.Count) recently installed updates" -ForegroundColor Gray
        return $updates
    }
    catch {
        Write-Warning "Error getting installed updates: $_"
        return @()
    }
}

function Get-FailedUpdates {
    try {
        Write-Host "  Checking failed updates..." -ForegroundColor Gray
        $updates = @()
        $events = Get-WinEvent -FilterHashtable @{
            LogName = 'System'
            ProviderName = 'Microsoft-Windows-WindowsUpdateClient'
            ID = 20
        } -MaxEvents 10 -ErrorAction SilentlyContinue
        
        foreach ($event in $events) {
            if ($event.Message -match 'KB(\d+)') {
                $kbNumber = "KB" + $Matches[1]
                $updates += @{
                    kb_number = $kbNumber
                    title = "Failed update"
                    error_code = $event.Id.ToString()
                }
            }
        }
        Write-Host "  Found $($updates.Count) failed updates" -ForegroundColor Gray
        return $updates
    }
    catch {
        Write-Warning "Error getting failed updates: $_"
        return @()
    }
}

# === MAIN SCRIPT ===

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " RT-IT-Hub Device Update Agent" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Started at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host ""

# Collect device information
Write-Host "[1/3] Collecting device information..." -ForegroundColor Yellow
try {
    $computerInfo = Get-ComputerInfo
    $hostname = $env:COMPUTERNAME
    $serialNumber = (Get-CimInstance Win32_BIOS).SerialNumber
    $osVersion = $computerInfo.OSDisplayVersion
    $osBuild = $computerInfo.OSBuildNumber
    $lastBootTime = (Get-CimInstance Win32_OperatingSystem).LastBootUpTime.ToString("yyyy-MM-ddTHH:mm:ss")
    $ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" } | Select-Object -First 1).IPAddress

    Write-Host "  Hostname: $hostname" -ForegroundColor Gray
    Write-Host "  Serial Number: $serialNumber" -ForegroundColor Gray
    Write-Host "  OS Version: $osVersion (Build $osBuild)" -ForegroundColor Gray
    Write-Host "  IP Address: $ipAddress" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "ERROR: Failed to collect device information: $_" -ForegroundColor Red
    exit 1
}

# Collect update information
Write-Host "[2/3] Scanning for updates..." -ForegroundColor Yellow
$pendingUpdates = Get-PendingUpdates
$installedUpdates = Get-InstalledUpdates
$failedUpdates = Get-FailedUpdates

Write-Host ""
Write-Host "Update Summary:" -ForegroundColor White
Write-Host "  Pending: $($pendingUpdates.Count)" -ForegroundColor $(if ($pendingUpdates.Count -gt 0) { "Yellow" } else { "Green" })
Write-Host "  Installed: $($installedUpdates.Count)" -ForegroundColor Green
Write-Host "  Failed: $($failedUpdates.Count)" -ForegroundColor $(if ($failedUpdates.Count -gt 0) { "Red" } else { "Green" })
Write-Host ""

# Build payload
$payload = @{
    hostname = $hostname
    serial_number = $serialNumber
    os_version = $osVersion
    os_build = $osBuild
    last_boot_time = $lastBootTime
    ip_address = $ipAddress
    pending_updates = $pendingUpdates
    installed_updates = $installedUpdates
    failed_updates = $failedUpdates
} | ConvertTo-Json -Depth 10

# Send to RT-IT-Hub
Write-Host "[3/3] Sending data to RT-IT-Hub..." -ForegroundColor Yellow
Write-Host "  Endpoint: $API_ENDPOINT" -ForegroundColor Gray

try {
    $headers = @{
        "Authorization" = "Bearer $API_KEY"
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-RestMethod -Uri $API_ENDPOINT -Method Post -Headers $headers -Body $payload -TimeoutSec 30
    
    Write-Host ""
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host "  Device ID: $($response.device_id)" -ForegroundColor Gray
    Write-Host "  Hostname: $($response.hostname)" -ForegroundColor Gray
    Write-Host "  Compliance: $($response.compliance_status)" -ForegroundColor $(if ($response.compliance_status -eq "compliant") { "Green" } else { "Red" })
    Write-Host "  Updates Processed: $($response.updates_processed)" -ForegroundColor Gray
    Write-Host ""
}
catch {
    Write-Host ""
    Write-Host "ERROR: Failed to send data to RT-IT-Hub" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "  Response: $responseBody" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Check if your API key is correct" -ForegroundColor Gray
    Write-Host "  2. Verify internet connectivity" -ForegroundColor Gray
    Write-Host "  3. Ensure PowerShell is running as Administrator" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Completed at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
exit 0