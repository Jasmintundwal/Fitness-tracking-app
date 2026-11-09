# PulseFit Local Web Server (PowerShell)
# Runs a zero-dependency local HTTP web server on port 8080

$port = 8080
$path = $PSScriptRoot

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   PulseFit Fitness Tracker - Local HTTP Web Server" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Serving files from: $path" -ForegroundColor Gray
Write-Host "Listening at: http://localhost:$port" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop the server." -ForegroundColor Gray
Write-Host ""

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

Start-Process "http://localhost:$port/index.html"

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $localPath = [System.IO.Path]::Combine($path, $request.Url.LocalPath.TrimStart('/').Replace('/', '\'))
        if ([System.IO.Directory]::Exists($localPath)) {
            $localPath = [System.IO.Path]::Combine($localPath, "index.html")
        }

        if ([System.IO.File]::Exists($localPath)) {
            $ext = [System.IO.Path]::GetExtension($localPath).ToLower()
            $mime = switch ($ext) {
                ".html" { "text/html; charset=utf-8" }
                ".css"  { "text/css; charset=utf-8" }
                ".js"   { "application/javascript; charset=utf-8" }
                ".json" { "application/json; charset=utf-8" }
                ".svg"  { "image/svg+xml" }
                ".png"  { "image/png" }
                ".ico"  { "image/x-icon" }
                ".sql"  { "text/plain; charset=utf-8" }
                default { "application/octet-stream" }
            }

            $bytes = [System.IO.File]::ReadAllBytes($localPath)
            $response.ContentType = $mime
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.OutputStream.Write($msg, 0, $msg.Length)
        }
        $response.OutputStream.Close()
    }
} finally {
    $listener.Stop()
}
