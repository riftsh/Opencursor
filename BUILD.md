# OpenCursor Build Guide

Complete guide for building OpenCursor from source for development and production.

---

## 📋 Prerequisites

Before building, ensure you have:

| Requirement | Version | Check Command |
|-------------|---------|---------------|
| Node.js | 18.x or higher | `node --version` |
| npm | 9.x or higher | `npm --version` |
| Git | 2.x or higher | `git --version` |
| Python | 3.8 or higher | `python --version` |
| yarn (optional) | 1.22+ | `yarn --version` |

**Platform-specific requirements:**
- **macOS**: Xcode Command Line Tools (`xcode-select --install`)
- **Linux**: build-essential (`sudo apt-get install build-essential`)
- **Windows**: Visual Studio Build Tools or Windows SDK

---

## 🚀 Quick Start (Development)

```bash
# 1. Clone and setup
git clone https://github.com/riftsh/Opencursor.git
cd Opencursor
git submodule update --init --recursive

# 2. Install dependencies
npm install

# 3. Build main editor
npm run compile-fast

# 4. Launch
./scripts/code.sh
```

---

## 🔧 Development Builds

### Option 1: Fast Build (Development)

Best for active development - skips optimizations for faster builds.

```bash
npm run compile-fast
```

**Time:** ~2-5 minutes  
**Use when:** Making code changes and testing frequently

### Option 2: Watch Mode (Active Development)

Automatically rebuilds when files change.

```bash
# Watch everything
npm run watch

# Watch only main editor
npm run watch-client

# Watch only extensions
npm run watch-extensions
```

**Use when:** Actively developing and need instant feedback

### Option 3: Full Build (Development)

Complete build with all optimizations disabled for debugging.

```bash
npm run compile
```

**Time:** ~5-10 minutes  
**Use when:** Need a complete build for testing

---

## 📦 Production Builds

### Full Production Build

Creates optimized, minified build ready for distribution.

```bash
# Step 1: Clean install
rm -rf node_modules out
npm install

# Step 2: Full compile
npm run compile

# Step 3: Minify
npm run minify-vscode

# Step 4: Package (creates .app, .exe, or .deb depending on platform)
npm run compile-build
```

**Time:** ~15-30 minutes  
**Output:** `out/` directory with packaged application

### Platform-Specific Production Builds

#### macOS (.app and .dmg)

```bash
npm run compile
npm run compile-build
# Output: out/OpenCursor-darwin-x64/OpenCursor.app
```

#### Windows (.exe)

```bash
npm run compile
npm run compile-build
# Output: out/OpenCursor-win32-x64/OpenCursor.exe
```

#### Linux (.deb, .rpm, .AppImage)

```bash
npm run compile
npm run compile-build
# Output: out/OpenCursor-linux-x64/opencursor
```

---

## 🧩 Extension Development

The OpenCursor AI extension lives in `opencursor-submodule-beta/`.

### Build Extension Only

```bash
cd opencursor-submodule-beta

# Install dependencies
npm install

# Build extension
cd extensions/vscode
npm run compile

# Or watch mode
npm run watch
```

### Link Extension to Main Editor

```bash
# After building extension, package it
cd opencursor-submodule-beta/extensions/vscode
npx vsce package

# Install in OpenCursor
# Open OpenCursor → Extensions → Install from VSIX
# Select the .vsix file generated
```

---

## 🔄 Rebuild After Changes

### Main Editor Changes

```bash
# Fast rebuild
npm run compile-fast

# Or watch mode (auto-rebuild)
npm run watch
```

### Extension Changes

```bash
cd opencursor-submodule-beta/extensions/vscode
npm run compile

# Reload window in OpenCursor to see changes
# Cmd+Shift+P → "Developer: Reload Window"
```

### CSS/Theme Changes

```bash
# Just rebuild client (fastest)
npm run watch-client
```

---

## 🐛 Troubleshooting Build Issues

### Common Errors

#### 1. "Out of memory" during build

```bash
# Increase Node memory limit
export NODE_OPTIONS="--max-old-space-size=8192"
npm run compile
```

#### 2. "Cannot find module" errors

```bash
# Clean reinstall
rm -rf node_modules
npm run postinstall
npm install
```

#### 3. Git submodule errors

```bash
# Reinitialize submodules
git submodule deinit -f .
git submodule update --init --recursive
```

#### 4. TypeScript compilation errors

```bash
# Clean and rebuild
npm run preinstall
npm install
npm run compile
```

#### 5. Extension not loading

```bash
# Ensure extension is built
cd opencursor-submodule-beta/extensions/vscode
npm install
npm run compile

# Then rebuild main editor
npm run compile-fast
```

---

## 📊 Build Performance Tips

| Scenario | Command | Time |
|----------|---------|------|
| Quick test | `npm run compile-fast` | ~2-3 min |
| Full dev build | `npm run compile` | ~5-8 min |
| Production build | `npm run compile && npm run compile-build` | ~15-25 min |
| Active development | `npm run watch` | Ongoing |

### Speed Up Builds

1. **Use `compile-fast`** for development (skips minification)
2. **Use `watch` mode** to avoid full rebuilds
3. **Use SSD** - build involves many file operations
4. **Increase Node memory** - prevents GC slowdowns
5. **Close other apps** - compilation is CPU/memory intensive

---

## 🎯 Build Checklist

Before committing or releasing:

- [ ] `npm run compile` succeeds
- [ ] Application launches without errors
- [ ] Extensions load properly
- [ ] Key bindings work (Cmd+L, Cmd+I)
- [ ] Sidebar icons render correctly
- [ ] No console errors in DevTools

---

## 📚 Additional Resources

- [Contributing Guide](./CONTRIBUTING.md)
- [VS Code Build Documentation](https://github.com/microsoft/vscode/wiki/How-to-Contribute#build-and-run)
- [Extension API](https://code.visualstudio.com/api)

---

## 💬 Need Help?

- 🐛 [GitHub Issues](https://github.com/riftsh/Opencursor/issues)
- 💬 [Discord Community](https://discord.gg/7QMraJUsQt)

---

<div align="center">

**⭐ Star OpenCursor on GitHub if this guide helped you!**

[![GitHub Stars](https://img.shields.io/github/stars/riftsh/Opencursor?style=for-the-badge&logo=github)](https://github.com/riftsh/Opencursor/stargazers)

</div>
