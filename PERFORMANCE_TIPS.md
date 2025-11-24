# Performance Optimization Guide

## What Was Fixed

### 1. Next.js Configuration ([next.config.js](next.config.js))
- **SWC Minification**: Enabled for faster builds
- **Package Import Optimization**: Optimized imports for `lucide-react`, `recharts`, and `@tanstack/react-query`
- **Webpack Optimization**: Disabled unnecessary optimizations in dev mode for faster builds
- **Watch Options**: Configured to reduce file system polling

### 2. TypeScript Configuration ([tsconfig.json](tsconfig.json))
- **Incremental Builds**: Already enabled, keeps compilation fast
- **Skip Lib Check**: Enabled to skip type checking of declaration files
- **Better Excludes**: Added `.next`, `out`, and `dist` to exclude list

### 3. Development Environment ([.env.development.local](.env.development.local))
- **Telemetry Disabled**: Reduces startup overhead
- **Fast Refresh**: Enabled for instant updates
- **Memory Allocation**: Increased Node.js memory limit

### 4. Cache Cleared
- Removed the `.next` directory to start fresh

## Expected Results

After these changes, you should see:
- **Faster initial startup**: First load should be 50-70% faster
- **Faster hot reload**: Changes should reflect in 1-2 seconds
- **Lower memory usage**: Better resource utilization

## If Still Slow

### Check for Port Conflicts
```bash
# Check if port 3000 is busy
netstat -ano | findstr :3000

# Kill process if needed
taskkill /PID <PID> /F
```

### Disable Windows Defender Real-Time Scanning
Add your project folder to Windows Defender exclusions:
1. Windows Security → Virus & threat protection → Settings
2. Add exclusion → Folder
3. Select `d:\Perelman-ATS-claude`

### Use WSL2 (Alternative)
Windows Subsystem for Linux typically has better Node.js performance.

### Check Node.js Version
```bash
node --version
```
Recommended: Node.js 18.17+ or 20.5+

### Reduce File Watchers
If you have many files, consider:
- Close unused editors/IDEs
- Disable unnecessary extensions
- Use `.gitignore` patterns in `.next` directory

### Measure Performance
```bash
# See what's taking time
$env:NEXT_TELEMETRY_DEBUG=1; npm run dev
```

## Quick Fixes to Try

1. **Restart your machine** - Clears system caches
2. **Close other applications** - Frees up memory
3. **Run `npm install`** - Ensures dependencies are correct
4. **Check antivirus** - May be scanning files in real-time

## Monitoring

The dev server will show compilation times. Watch for:
- Initial compile: Should be < 10 seconds
- Hot reload: Should be < 2 seconds
- Page navigation: Should be instant

If any of these are slow, there may be other issues at play.
