# Dialog

Dialog is a local-first, rich-text note-taking application built with Tauri, React, and Tiptap. It focuses on providing a seamless writing experience with support for mixed media, including custom audio capsules.

## Features

- **Rich Text Editing**: Powered by [Tiptap](https://tiptap.dev/), supporting varied content types.
- **Local-First Architecture**: Your data resides on your device.
    - **Layer 1**: Quick access via [Dexie.js](https://dexie.org/) (IndexedDB).
    - **Layer 2**: Persistent storage as JSON files in your local file system.
- **Audio Capsules**: Record and embed audio directly into your documents.
- **Sidebar Navigation**: Organize and switch between documents easily.
- **Command Menu**: Access formatting and features via slash commands.

## Tech Stack

- **Core**: [Tauri v2](https://tauri.app/) (Rust)
- **Frontend**: [React v19](https://react.dev/), TypeScript, [Vite](https://vitejs.dev/)
- **Styling**: [TailwindCSS v4](https://tailwindcss.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Database**: Dexie (IndexedDB wrapper)
- **Icons**: [Lucide React](https://lucide.dev/)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (Latest LTS recommended)
- [Rust](https://www.rust-lang.org/tools/install) (Required for Tauri)

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/AirSodaz/dialog.git
    cd dialog
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

### Running Locally

To run the application in development mode (with hot reloading):

```bash
npm run tauri dev
```

This command will start the Vite frontend server and launch the Tauri application window.

### Building for Production

To build the application for your OS:

```bash
npm run tauri build
```

## Project Structure

- `/src` - React frontend source code.
    - `/components` - UI components (Editor, Sidebar, etc.).
    - `/db` - Database configuration (Dexie).
    - `/extensions` - Tiptap extensions (e.g., AudioNode).
    - `/store` - Zustand state stores.
- `/src-tauri` - Rust backend code and Tauri configuration.
