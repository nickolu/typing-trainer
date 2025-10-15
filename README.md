# Typing Trainer

A modern, local-first typing speed trainer built with Next.js, TypeScript, and Tailwind CSS. Improve your typing speed and accuracy with AI-generated content, targeted practice, and detailed analytics.

## ✨ Features

### 🎯 Core Typing Experience
- **Customizable timed tests** (15s, 30s, 60s, 2min)
- **Smooth animated cursor** that never flashes between words
- **Real-time character-by-character feedback** with color coding
- **Auto-scroll** to keep current word centered
- **Keyboard shortcuts**: Tab to skip words, Backspace to correct
- **No-Corrections Mode**: Disable backspace for focused accuracy training

### 📊 Detailed Analytics
- **WPM & Accuracy tracking** with precise calculations
- **Sequence timing analysis**: Identify your slowest 2-char and 3-char sequences
- **Mistake analysis**: Character confusions and commonly mistyped words
- **Progress charts**: Visualize WPM and accuracy trends over time
- **Test history**: Browse, sort, and filter all past tests

### 🤖 AI-Powered Content
- **Multiple content styles**: Prose, quotes, technical, or common phrases
- **Custom prompts**: Fine-tune AI generation with additional instructions
- **Model selection**: Choose between GPT-4o Mini, GPT-4o, or GPT-4 Turbo
- **Temperature control**: Adjust creativity (0.0 - 1.0)

### 🎯 Targeted Practice
- **Generate custom practice** from any test result
- **Manual selection**: Choose up to 20 sequences or words to practice
- **Smart categories**:
  - Slow 2-char and 3-char sequences
  - Problem sequences (frequent mistakes)
  - Character confusions (e.g., "e" → "r")
  - Commonly mistyped words
- **Visual highlighting**: Purple highlights show practice targets during typing
- **Practice mode banner**: See what you're focusing on
- **Toggle highlighting**: Enable/disable highlights during practice

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS with custom theme
- **State Management**: Zustand with localStorage persistence
- **Database**: IndexedDB via Dexie (local-first)
- **AI Integration**: OpenAI API (server-side)
- **Charts**: Recharts for data visualization
- **Fonts**: Inter (UI), JetBrains Mono (test content)
- **Icons**: Lucide React

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- OpenAI API key (optional, only needed for AI-generated content)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd typing-trainer

# Install dependencies
npm install

# Create .env.local file (optional, for AI features)
echo "OPENAI_API_KEY=your-api-key-here" > .env.local

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

**Note:** The app works fully without an API key using 50 built-in static tests. AI features require an OpenAI API key.

## Project Structure

```
typing-trainer/
├── app/
│   ├── page.tsx                      # Home page (typing test)
│   ├── results/[id]/page.tsx        # Individual result page
│   ├── stats/page.tsx               # Stats page with charts and history
│   ├── api/
│   │   ├── generate-content/        # AI content generation
│   │   ├── generate-practice/       # Targeted practice generation
│   │   └── generate-mistake-practice/ # Mistake-focused practice
│   └── globals.css                  # Global styles
├── components/
│   ├── typing-test/
│   │   ├── TypingTest.tsx          # Main test container
│   │   ├── TestDisplay.tsx         # Word grid with highlighting
│   │   ├── TestTimer.tsx           # Countdown timer
│   │   ├── WordDisplay.tsx         # Individual word rendering
│   │   └── TypingCursor.tsx        # Smooth animated cursor
│   ├── results/
│   │   ├── ResultsView.tsx         # Results container
│   │   ├── StatsCard.tsx           # Stat cards
│   │   ├── SequenceAnalysis.tsx    # Sequence timing display
│   │   ├── MistakeAnalysis.tsx     # Mistake patterns
│   │   └── TargetedPracticeModal.tsx # Practice selection modal
│   ├── settings/
│   │   ├── SettingsToolbar.tsx     # Settings controls
│   │   └── ContentOptionsModal.tsx # AI content options
│   ├── charts/
│   │   ├── WPMChart.tsx            # WPM progress line chart
│   │   └── AccuracyChart.tsx       # Accuracy area chart
│   └── history/
│       └── HistoryTable.tsx        # Test history table
├── lib/
│   ├── db/
│   │   ├── schema.ts               # Dexie database schema
│   │   └── index.ts                # DB operations
│   ├── test-engine/
│   │   ├── calculations.ts         # WPM, accuracy, sequences
│   │   └── mistake-analysis.ts     # Mistake pattern analysis
│   ├── llm/
│   │   └── openai.ts               # OpenAI integration
│   ├── test-content.ts             # 50 static tests
│   ├── types.ts                    # TypeScript types
│   └── utils.ts                    # Utility functions
└── store/
    ├── test-store.ts               # Test state management
    └── settings-store.ts           # Settings with persistence
```

## How It Works

### Basic Test Flow
1. Choose test duration (15s, 30s, 60s, or 2min)
2. Optionally enable AI content or select a content style
3. Start typing to begin the test
4. Timer counts down while you type
5. Real-time feedback shows correct/incorrect characters
6. Test auto-completes when timer expires
7. View detailed results with analytics
8. Generate targeted practice or start a new test

### Targeted Practice Flow
1. Complete a test and view results
2. Review sequence analysis and mistake analysis
3. Click "Generate Targeted Practice"
4. Select up to 20 sequences/words to focus on
5. AI generates custom content with high frequency of selected items
6. Practice mode shows banner with targets
7. Optional highlighting shows practice targets during typing
8. Complete practice test and see improvement

### Data Storage
- **Local-first**: All test results stored in IndexedDB
- **No cloud dependency**: Works completely offline
- **Privacy-focused**: Data never leaves your device
- **Persistent**: Data saved across browser sessions
- **Future-ready**: Schema designed for optional cloud sync

## Content Options

### Static Content (50 built-in tests)
- **Quotes** (15): Famous quotes from notable figures
- **Prose** (15): Literary excerpts and opening lines
- **Technical** (10): Programming and tech writing
- **Common** (10): Common English phrases

### AI-Generated Content (requires API key)
- **Prose**: Literary-style text
- **Quotes**: Inspirational quote-style text
- **Technical**: Programming/tech documentation style
- **Common**: Everyday conversational language
- **Custom**: Use your own prompts for specific topics

## Visual Feedback

### Color Coding
- **Pending words**: Dim gray
- **Current word**: Bright white with smooth animated cursor
- **Correct characters**: Dimmed after typing
- **Incorrect characters**: Red background
- **Completed correct**: Green
- **Completed incorrect**: Red
- **Practice highlights**: Purple background (toggleable)

### Keyboard Controls
- **Regular typing**: Type normally to input text
- **Space**: Complete current word and move to next
- **Backspace**: Delete last character (or disabled in No-Corrections Mode)
- **Tab**: Skip to next word (marks current as incomplete)

## Screenshots

> Coming soon: Add screenshots of the typing test, results page, and targeted practice modal

## Design Decisions

### Local-First Architecture
- **IndexedDB as primary storage** - All data stored locally in your browser
- **No cloud dependency** - Works completely offline
- **Privacy-focused** - Data never leaves your device
- **Future-ready** - Schema designed for optional cloud sync
- **Multi-user capable** - Database schema supports multiple users (future)

### Performance Optimizations
- **Precise timing**: `performance.now()` for microsecond-accurate keystroke tracking
- **In-memory calculations**: WPM and accuracy computed during test
- **Minimal DB writes**: Only final results saved to database
- **Efficient rendering**: `useMemo` and `useCallback` to prevent unnecessary re-renders
- **Smart highlighting**: Character-level highlighting with optimized search
- **Smooth cursor**: CSS transitions for 60fps cursor movement
- **ResizeObserver**: Responsive cursor positioning without layout thrashing

### UI/UX Philosophy
- **Dark theme** inspired by VSCode and modern IDEs
- **Keyboard-first** navigation - minimal mouse usage required
- **Immediate feedback** - Real-time visual feedback as you type
- **Minimal, flat design** - Focus on content, not chrome
- **High contrast** - Accessibility-focused color choices
- **Monospace font** (JetBrains Mono) for test content consistency
- **Auto-scroll** - Current word always visible
- **Progressive enhancement** - Static content works, AI is optional

### Technical Architecture
- **Type-safe**: TypeScript strict mode throughout
- **Component-driven**: Small, focused, reusable components
- **State management**: Zustand for predictable state updates
- **Server-side AI**: API keys never exposed to client
- **Error boundaries**: Graceful error handling with user-friendly messages

## Development

### Commands
```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Development Tips
- Hot reload enabled - changes appear instantly
- TypeScript strict mode catches errors early
- ESLint configured with Next.js best practices
- Zustand DevTools available in browser console
- IndexedDB can be inspected in browser DevTools

## Future Enhancements

Potential features for future development:

### Analytics & Insights
- Aggregate sequence statistics across all tests
- Improvement trends for specific sequences over time
- Personal best tracking and celebrations
- Daily/weekly/monthly progress summaries

### Additional Modes
- Programming mode with syntax highlighting
- Multi-language support (Spanish, French, etc.)
- Custom word lists import
- Timed burst mode (type as much as possible)

### Social Features
- Optional cloud sync for multi-device access
- Anonymous leaderboards (opt-in)
- Challenge friends with specific tests
- Share test results

### Advanced Analytics
- Visual keyboard heatmap
- Finger-specific statistics
- Real-time WPM display during test
- Typing session replay/animation

### Accessibility
- Screen reader support
- Colorblind-friendly themes
- Font size customization
- High contrast mode

## Contributing

This is a personal project, but suggestions and feedback are welcome! Feel free to:
- Open issues for bugs or feature requests
- Fork and experiment with your own features
- Share your typing improvement journey

## License

Personal use project - no license specified.
