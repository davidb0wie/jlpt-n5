param($docxPath)

Add-Type -AssemblyName System.IO.Compression.FileSystem

$zip = [System.IO.Compression.ZipFile]::OpenRead($docxPath)
$entry = $zip.Entries | Where-Object { $_.Name -eq 'document.xml' }
$stream = $entry.Open()
$reader = New-Object System.IO.StreamReader($stream)
$content = $reader.ReadToEnd()
$reader.Close()
$stream.Close()
$zip.Dispose()

# Extract text from XML (remove tags)
$content = $content -replace '<[^>]+>', ' '
$content = $content -replace '\s+', ' '
$content = $content.Trim()

Write-Output $content
