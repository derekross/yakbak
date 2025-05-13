# YakBak - Voice Message Social Platform

<div align="center">
  <img src="public/yakbak-logo.png" alt="YakBak Logo" width="200"/>
</div>

YakBak is a modern social platform built on the Nostr protocol that allows users to share and interact with voice messages. Built with React, TypeScript, and Nostr, it provides a seamless experience for voice-based social interactions.

## Features

- 🎤 Voice message recording and playback
- 💬 Threaded voice message conversations
- ⚡ Lightning Network zaps for voice messages
- ❤️ Reactions and engagement tracking
- 🔗 Nostr protocol integration
- 🎨 Modern UI with shadcn/ui components
- 🌐 Real-time updates and interactions

## Tech Stack

- **React 18.x**: For building the user interface
- **TypeScript**: For type-safe development
- **TailwindCSS 3.x**: For styling
- **Vite**: For fast development and building
- **shadcn/ui**: For accessible UI components
- **Nostrify**: For Nostr protocol integration
- **React Router**: For client-side routing
- **TanStack Query**: For data fetching and caching
- **Alby SDK**: For Lightning Network integration

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm or yarn
- A Nostr wallet (like Alby) for authentication and zaps

### Installation

1. Clone the repository:

```bash
git clone https://github.com/derekross/yakbak.git
cd yakbak
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Build for production:

```bash
npm run build
```

## Project Structure

```
src/
├── components/     # React components
│   ├── ui/        # shadcn/ui components
│   └── ...        # Custom components
├── hooks/         # Custom React hooks
├── lib/           # Utility functions
├── pages/         # Page components
└── public/        # Static assets
```

## Key Features

### Voice Messages

- Record voice messages directly in the browser
- Maximum recording time of 60 seconds
- Automatic upload to Blossom servers
- Threaded conversations with voice replies

### Nostr Integration

- Seamless authentication with Nostr
- Real-time event streaming
- Profile metadata support
- Threaded conversations

### Lightning Network Integration

- Send zaps to voice messages
- Customizable zap amounts
- Real-time zap tracking
- Nostr Wallet Connect

### UI Components

The project uses shadcn/ui components for a consistent and accessible user interface. Available components include:

- Accordion
- Alert
- Avatar
- Button
- Card
- Dialog
- Dropdown Menu
- Form
- Input
- Toast
- And many more...

## Development

### Testing

Run the test suite:

```bash
npm run ci
```

This will:

- Type check the code
- Build the project
- Run any tests

### Code Style

The project follows TypeScript best practices and uses ESLint for code quality. Run the linter:

```bash
npm run lint
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Nostr Protocol](https://github.com/nostr-protocol/nostr)
- [shadcn/ui](https://ui.shadcn.com/)
- [Alby](https://getalby.com/)
