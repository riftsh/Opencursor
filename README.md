# OpenCursor

## [![Repography logo](https://images.repography.com/logo.svg)](https://repography.com) / Top contributors
[![Top contributors](https://images.repography.com/127308565/riftsh/Opencursor/top-contributors/CkfvCn0pURm9p51o1mdRv7kBzuoGRJCaaRc_OGuVctA/UcQsmb9RYSGB32vlYLfqJPaJAH7cehqh27kaXVZMnGE_table.svg)](https://github.com/riftsh/Opencursor/graphs/contributors)


> **🚧 WORK IN PROGRESS - v1.0.3**
> This project is actively being developed. **No major features are available yet** - we're still building the foundation. Check our [ROADMAP](./ROADMAP.md) for what's planned (50+ bugs tracked, 2000+ features planned, 100+ UI changes coming).

An open-source AI code editor forked from VS Code. Bring your own API keys.

## What is this?

OpenCursor is a VS Code fork with built-in AI features. Unlike Cursor or GitHub Copilot, we don't lock you into a subscription. Use your own OpenAI, Anthropic, or Gemini API keys.

**Key points:**
- BYOK (Bring Your Own Key) - use your own API keys
- Works offline with Ollama for local AI
- Free and open source under Apache 2.0

## Building

**Requirements:**
- Node.js 18+
- npm or yarn
- Git
- Python 3.8+

**Quick build:**
```bash
git clone https://github.com/riftsh/Opencursor.git
cd Opencursor
git submodule update --init --recursive
npm install
npm run compile-fast
./scripts/code.sh
```

**Production build:**
```bash
npm run compile
npm run compile-build
```

See [BUILD.md](./BUILD.md) for detailed build instructions and troubleshooting.

## Features

- `Cmd+L` / `Ctrl+L` - Open AI chat
- `Cmd+I` / `Ctrl+I` - Inline code editing
- Deep codebase understanding
- Tab autocomplete
- Terminal integration

## Project Structure

This repo (`Open-cursor-main`) is the VS Code editor shell. The AI functionality is in the `opencursor-submodule-beta` directory (forked from Continue.dev).

## Install Extensions

OpenCursor supports most VS Code extensions. Open the extensions panel (`Cmd+Shift+X`) and search. Note: Some Microsoft proprietary extensions won't work - use alternatives from [Open VSX](https://open-vsx.org/).

## Contributing

Maintainer: **Devflex-ai**

- Issues: https://github.com/riftsh/Opencursor/issues
- Discussions: https://github.com/riftsh/Opencursor/discussions

Contributions welcome. See BUILD.md for setup.

## License

Apache 2.0
