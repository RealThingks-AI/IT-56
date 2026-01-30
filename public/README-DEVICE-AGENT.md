# AppMaster Device Update Agent

## Overview
This PowerShell script collects Windows Update information from devices and sends it to AppMaster for tracking and compliance monitoring.

## Features
- ✅ Collects device information (hostname, serial number, OS version)
- ✅ Scans for pending Windows updates
- ✅ Lists recently installed updates
- ✅ Detects failed update installations
- ✅ Sends data securely to AppMaster API
- ✅ Shows compliance status

## Installation

### 1. Download the Script
Save `device-update-agent.ps1` to a location on each device (e.g., `C:\AppMaster\`)

### 2. Configure the API Key
The script is pre-configured with the API endpoint and key. Make sure the API key matches the one configured in your AppMaster Supabase project.

**Important:** The API key in the script should match the `DEVICE_AGENT_API_KEY` secret in your Supabase Edge Functions configuration.

### 3. Test Manually
Open PowerShell as Administrator and run:
```powershell
cd C:\AppMaster
.\device-update-agent.ps1
```

You should see output like:
```
========================================
 AppMaster Device Update Agent
========================================
Started at: 2025-12-02 10:30:00

[1/3] Collecting device information...
  Hostname: DESKTOP-ABC123
  Serial Number: 1234567890
  OS Version: 23H2 (Build 22631)
  IP Address: 192.168.1.100

[2/3] Scanning for updates...
  Checking pending updates...
  Found 5 pending updates
  Checking installed updates...
  Found 50 recently installed updates
  Checking failed updates...
  Found 0 failed updates

Update Summary:
  Pending: 5
  Installed: 50
  Failed: 0

[3/3] Sending data to AppMaster...
  Endpoint: https://zxtpfrgsfuiwdppgiliv.supabase.co/functions/v1/ingest-device-updates

SUCCESS!
  Device ID: abc123-def456-...
  Hostname: DESKTOP-ABC123
  Compliance: non-compliant
  Updates Processed: 55

========================================
Completed at: 2025-12-02 10:32:15
========================================
```

### 4. Schedule Daily Execution

**Option A: Using Task Scheduler (Recommended)**

1. Open Task Scheduler (`taskschd.msc`)
2. Click "Create Task" (not "Create Basic Task")
3. **General tab:**
   - Name: `AppMaster Device Update Agent`
   - Description: `Daily sync of Windows Update status to AppMaster`
   - Select "Run whether user is logged on or not"
   - Check "Run with highest privileges"
4. **Triggers tab:**
   - New → Daily at 9:00 AM
   - Repeat task every: 1 day
5. **Actions tab:**
   - New → Start a program
   - Program: `powershell.exe`
   - Arguments: `-ExecutionPolicy Bypass -File "C:\AppMaster\device-update-agent.ps1"`
6. **Conditions tab:**
   - Uncheck "Start the task only if the computer is on AC power"
7. **Settings tab:**
   - Check "Run task as soon as possible after a scheduled start is missed"
8. Click OK and enter admin credentials

**Option B: Using Group Policy (Domain Environment)**

Deploy via GPO to all devices:
```
Computer Configuration → Preferences → Control Panel Settings → Scheduled Tasks
```

## Viewing Results

After the script runs, check the AppMaster System Updates page:
- Navigate to: **HelpDesk → System Updates → Active Machines**
- Your device will appear with:
  - Compliance status (compliant/non-compliant)
  - Pending update count
  - Failed update count
  - Last check-in time

## Troubleshooting

### Script fails with "Execution Policy" error
Run PowerShell as Administrator:
```powershell
Set-ExecutionPolicy RemoteSigned -Scope LocalMachine
```

### Script fails with "Access Denied"
- Ensure PowerShell is running as Administrator
- Check Windows Update service is running: `Get-Service wuauserv`

### No data appearing in AppMaster
1. Check script output for errors
2. Verify API key matches the one configured in Supabase Edge Functions
3. Ensure device has internet access
4. Check Task Scheduler history for execution status
5. View edge function logs in Supabase dashboard for detailed error messages

### Script fails with "Unauthorized: Invalid API key"
The API key in the script doesn't match the `DEVICE_AGENT_API_KEY` secret configured in Supabase. Contact your system administrator to get the correct API key.

### Script takes too long
- The Windows Update search can take 2-5 minutes on first run
- Subsequent runs are faster (30-60 seconds)
- This is normal Windows Update API behavior

## Security Notes

- The API key is embedded in the script - protect it like a password
- Script requires Administrator privileges to access Windows Update API
- All data is sent over HTTPS
- No sensitive user data is collected (only update status and device info)

## What Data is Collected

### Device Information
- Hostname
- Serial number
- OS version and build
- Last boot time
- IP address

### Update Status
- **Pending updates**: Updates waiting to be installed (with KB numbers, titles, severity)
- **Installed updates**: Recently installed updates (last 50)
- **Failed updates**: Updates that failed to install (last 10 events)

## Uninstallation

1. Delete the scheduled task from Task Scheduler
2. Remove the script file from `C:\AppMaster\`
3. (Optional) Remove device record from AppMaster web interface

## Support

For issues or questions:
- Check edge function logs in Supabase dashboard
- Review the script output for detailed error messages
- Contact your system administrator
