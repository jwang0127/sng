$ErrorActionPreference = "Stop"

$appDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$indexPath = Join-Path $appDir "index.html"
$resolvedIndex = (Resolve-Path $indexPath).Path
$uri = [System.Uri]::new($resolvedIndex)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

function Import-WebView2Assemblies {
    $roots = @(
        "$env:ProgramFiles(x86)\Microsoft\EdgeWebView\Application",
        "$env:ProgramFiles\Microsoft\EdgeWebView\Application"
    ) | Where-Object { $_ -and (Test-Path $_) }

    foreach ($root in $roots) {
        $versionFolders = Get-ChildItem -Path $root -Directory | Sort-Object Name -Descending
        foreach ($folder in $versionFolders) {
            $winFormsDll = Join-Path $folder.FullName "Microsoft.Web.WebView2.WinForms.dll"
            $coreDll = Join-Path $folder.FullName "Microsoft.Web.WebView2.Core.dll"
            if ((Test-Path $winFormsDll) -and (Test-Path $coreDll)) {
                Add-Type -Path $coreDll -ErrorAction Stop
                Add-Type -Path $winFormsDll -ErrorAction Stop
                return $true
            }
        }
    }

    return $false
}

$loaded = $false
try {
    $loaded = Import-WebView2Assemblies
} catch {
    $loaded = $false
}

if ($loaded -and [type]::GetType("Microsoft.Web.WebView2.WinForms.WebView2, Microsoft.Web.WebView2.WinForms")) {
    $form = New-Object System.Windows.Forms.Form
    $form.Text = "德州扑克 SNG 大屏"
    $form.WindowState = [System.Windows.Forms.FormWindowState]::Maximized
    $form.BackColor = [System.Drawing.Color]::Black

    $webView = New-Object Microsoft.Web.WebView2.WinForms.WebView2
    $webView.Dock = [System.Windows.Forms.DockStyle]::Fill
    $form.Controls.Add($webView)

    $form.Add_Shown({
        $webView.Source = $uri
    })

    [System.Windows.Forms.Application]::EnableVisualStyles()
    [System.Windows.Forms.Application]::Run($form)
} else {
    Start-Process $resolvedIndex
}
