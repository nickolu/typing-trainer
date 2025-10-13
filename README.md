# Typing Trainer

A modern, local-first typing speed trainer built with Next.js, TypeScript, and Tailwind CSS.

## Features (Phase 1)

### Feature 1: Typing Test
- 30-second timed typing test
- Real-time countdown timer
- Live character-by-character comparison
- Visual feedback for correct/incorrect characters
- Word completion tracking
- Tab key support to skip to next word
- Backspace to fix mistakes

### Feature 2: Test Results
- Words Per Minute (WPM) calculation
- Accuracy percentage
- Detailed statistics (correct/incorrect words)
- Test results saved to local IndexedDB
- "Try Again" and "New Test" options

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Database**: IndexedDB via Dexie
- **Fonts**: Inter (UI), JetBrains Mono (test content)
- **Icons**: Lucide React

## Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
typing-trainer/
├── app/                          # Next.js app directory
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home page (typing test)
│   ├── results/[id]/            # Results page
│   └── globals.css              # Global styles
├── components/
│   ├── typing-test/             # Typing test components
│   │   ├── TypingTest.tsx      # Main test container
│   │   ├── TestDisplay.tsx     # Words display
│   │   ├── TestTimer.tsx       # Countdown timer
│   │   └── WordDisplay.tsx     # Individual word
│   └── results/                 # Results components
│       ├── ResultsView.tsx     # Results container
│       └── StatsCard.tsx       # Statistics card
├── lib/
│   ├── db/                      # IndexedDB setup
│   │   ├── schema.ts           # Dexie schema
│   │   └── index.ts            # DB operations
│   ├── test-engine/             # Test logic
│   │   └── calculations.ts     # WPM, accuracy, etc.
│   ├── test-content.ts          # 50 static tests
│   ├── types.ts                 # TypeScript types
│   └── utils.ts                 # Utility functions
└── store/
    └── test-store.ts            # Zustand state management
```

## How It Works

### Test Flow
1. User lands on homepage
2. Random test is loaded from 50 static tests
3. User starts typing to begin the test
4. Timer counts down from 30 seconds
5. Real-time feedback shows correct/incorrect characters
6. Test auto-completes when timer expires
7. Results are calculated and saved to IndexedDB
8. User is redirected to results page

### Data Storage
- All test results are stored locally in IndexedDB
- No server or cloud storage required
- Works completely offline
- Data persists across sessions

## Test Content Categories

- **Quotes** (15): Famous quotes from notable figures
- **Prose** (15): Literary excerpts and opening lines
- **Technical** (10): Programming and tech writing
- **Common** (10): Common English phrases

## Key Features

### Visual Feedback
- **Pending words**: Dim gray
- **Current word**: Bright white with cursor
- **Correct characters**: Dimmed after typing
- **Incorrect characters**: Red background
- **Completed correct**: Green with strikethrough
- **Completed incorrect**: Red with strikethrough

### Keyboard Controls
- **Regular typing**: Type normally to input text
- **Space**: Complete current word and move to next
- **Backspace**: Delete last character
- **Tab**: Skip to next word (marks current as incomplete)

## Future Phases

### Phase 2: Deep Analysis (Feature 3)
- Character sequence timing analysis
- Slowest 2-char and 3-char sequences

### Phase 3: Test History (Feature 4)
- View all past test results
- Progress tracking over time

### Phase 4: Visualization & Settings (Features 5 & 6)
- Progress charts and trends
- Customizable test duration
- Test labels and categories

### Phase 5: Dynamic Content (Features 7 & 8)
- LLM-generated test content
- Targeted practice for weak sequences

### Phase 6: Advanced Features (Features 9 & 10)
- No-corrections mode
- Common mistakes analysis
- Typo pattern detection

## Design Decisions

### Local-First Architecture
- IndexedDB as primary storage
- No cloud dependency
- Future-ready for optional cloud sync
- Database schema designed for multi-user (future)

### Performance
- Keystroke timing uses `performance.now()` for precision
- Calculations done in-memory during test
- Only final results written to database
- Top 10 sequences to minimize overhead

### UI/UX
- Dark theme inspired by modern IDEs
- Minimal, flat design
- Focus on readability and clarity
- Monospace font for test content
- High contrast for accessibility

## Development

### Commands
```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## License

Personal use project - no license specified.
