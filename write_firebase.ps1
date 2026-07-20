 = @{
    hosting = @{
        public = 'dist'
        ignore = @('firebase.json')
        rewrites = @(@{ source = '**'; destination = '/index.html' })
    }
}
 | ConvertTo-Json -Depth 5 | Set-Content -Path 'firebase.json' -Encoding utf8
@{ projects = @{ default = 'skb-goshala-chakrod' } } | ConvertTo-Json | Set-Content -Path '.firebaserc' -Encoding utf8
Write-Host 'Config files written successfully'
