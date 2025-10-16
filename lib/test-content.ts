import { TestContent } from './types';

export const staticTests: TestContent[] = [
  // Famous Quotes (15)
  {
    id: 'quote-001',
    category: 'quote',
    text: 'The only way to do great work is to love what you do.',
    source: 'Steve Jobs',
  },
  {
    id: 'quote-002',
    category: 'quote',
    text: 'In the middle of difficulty lies opportunity.',
    source: 'Albert Einstein',
  },
  {
    id: 'quote-003',
    category: 'quote',
    text: 'Life is what happens when you are busy making other plans.',
    source: 'John Lennon',
  },
  {
    id: 'quote-004',
    category: 'quote',
    text: 'The future belongs to those who believe in the beauty of their dreams.',
    source: 'Eleanor Roosevelt',
  },
  {
    id: 'quote-005',
    category: 'quote',
    text: 'It is during our darkest moments that we must focus to see the light.',
    source: 'Aristotle',
  },
  {
    id: 'quote-006',
    category: 'quote',
    text: 'The best time to plant a tree was twenty years ago. The second best time is now.',
    source: 'Chinese Proverb',
  },
  {
    id: 'quote-007',
    category: 'quote',
    text: 'Success is not final, failure is not fatal: it is the courage to continue that counts.',
    source: 'Winston Churchill',
  },
  {
    id: 'quote-008',
    category: 'quote',
    text: 'The mind is everything. What you think you become.',
    source: 'Buddha',
  },
  {
    id: 'quote-009',
    category: 'quote',
    text: 'Be yourself; everyone else is already taken.',
    source: 'Oscar Wilde',
  },
  {
    id: 'quote-010',
    category: 'quote',
    text: 'Two things are infinite: the universe and human stupidity; and I am not sure about the universe.',
    source: 'Albert Einstein',
  },
  {
    id: 'quote-011',
    category: 'quote',
    text: 'The only impossible journey is the one you never begin.',
    source: 'Tony Robbins',
  },
  {
    id: 'quote-012',
    category: 'quote',
    text: 'Do not go where the path may lead, go instead where there is no path and leave a trail.',
    source: 'Ralph Waldo Emerson',
  },
  {
    id: 'quote-013',
    category: 'quote',
    text: 'The greatest glory in living lies not in never falling, but in rising every time we fall.',
    source: 'Nelson Mandela',
  },
  {
    id: 'quote-014',
    category: 'quote',
    text: 'Your time is limited, so do not waste it living someone else life.',
    source: 'Steve Jobs',
  },
  {
    id: 'quote-015',
    category: 'quote',
    text: 'If you want to lift yourself up, lift up someone else.',
    source: 'Booker T. Washington',
  },

  // Prose and Literature (15)
  {
    id: 'prose-001',
    category: 'prose',
    text: 'It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness.',
    source: 'A Tale of Two Cities',
  },
  {
    id: 'prose-002',
    category: 'prose',
    text: 'All happy families are alike; each unhappy family is unhappy in its own way.',
    source: 'Anna Karenina',
  },
  {
    id: 'prose-003',
    category: 'prose',
    text: 'The sun shone, having no alternative, on the nothing new.',
    source: 'Murphy',
  },
  {
    id: 'prose-004',
    category: 'prose',
    text: 'In a hole in the ground there lived a hobbit. Not a nasty, dirty, wet hole, filled with the ends of worms and an oozy smell.',
    source: 'The Hobbit',
  },
  {
    id: 'prose-005',
    category: 'prose',
    text: 'The past is a foreign country; they do things differently there.',
    source: 'The Go-Between',
  },
  {
    id: 'prose-006',
    category: 'prose',
    text: 'It is a truth universally acknowledged that a single man in possession of a good fortune must be in want of a wife.',
    source: 'Pride and Prejudice',
  },
  {
    id: 'prose-007',
    category: 'prose',
    text: 'Many years later, as he faced the firing squad, Colonel Aureliano Buendia was to remember that distant afternoon when his father took him to discover ice.',
    source: 'One Hundred Years of Solitude',
  },
  {
    id: 'prose-008',
    category: 'prose',
    text: 'Ships at a distance have every man wish on board. For some they come in with the tide. For others they sail forever on the horizon, never out of sight, never landing.',
    source: 'Their Eyes Were Watching God',
  },
  {
    id: 'prose-009',
    category: 'prose',
    text: 'If you really want to hear about it, the first thing you will probably want to know is where I was born, and what my lousy childhood was like.',
    source: 'The Catcher in the Rye',
  },
  {
    id: 'prose-010',
    category: 'prose',
    text: 'The snow in the mountains was melting and Bunny had been dead for several weeks before we came to understand the gravity of our situation.',
    source: 'The Secret History',
  },
  {
    id: 'prose-011',
    category: 'prose',
    text: 'They shoot the white girl first. With the rest they can take their time.',
    source: 'Paradise',
  },
  {
    id: 'prose-012',
    category: 'prose',
    text: 'The sky above the port was the color of television, tuned to a dead channel.',
    source: 'Neuromancer',
  },
  {
    id: 'prose-013',
    category: 'prose',
    text: 'Where is Papa going with that ax? said Fern to her mother as they were setting the table for breakfast.',
    source: 'Charlotte\'s Web',
  },
  {
    id: 'prose-014',
    category: 'prose',
    text: 'There was a hand in the darkness, and it held a knife.',
    source: 'The Graveyard Book',
  },
  {
    id: 'prose-015',
    category: 'prose',
    text: 'When he was nearly thirteen, my brother Jem got his arm badly broken at the elbow.',
    source: 'To Kill a Mockingbird',
  },

  // Technical Writing (10)
  {
    id: 'tech-001',
    category: 'technical',
    text: 'The function returns a promise that resolves when all asynchronous operations have completed successfully.',
  },
  {
    id: 'tech-002',
    category: 'technical',
    text: 'To initialize the database connection, first import the configuration module and then call the connect method with appropriate credentials.',
  },
  {
    id: 'tech-003',
    category: 'technical',
    text: 'Modern web applications leverage component-based architectures to improve code reusability and maintainability across large codebases.',
  },
  {
    id: 'tech-004',
    category: 'technical',
    text: 'Type safety helps prevent runtime errors by catching type mismatches during the compilation phase rather than at execution time.',
  },
  {
    id: 'tech-005',
    category: 'technical',
    text: 'The algorithm iterates through the array using a for loop, comparing each element with its adjacent neighbor to determine the optimal sort order.',
  },
  {
    id: 'tech-006',
    category: 'technical',
    text: 'Authentication tokens should be stored securely in HTTP-only cookies to prevent cross-site scripting attacks from accessing sensitive user data.',
  },
  {
    id: 'tech-007',
    category: 'technical',
    text: 'To optimize performance, consider implementing lazy loading for images and code splitting for JavaScript bundles to reduce initial page load time.',
  },
  {
    id: 'tech-008',
    category: 'technical',
    text: 'The API endpoint accepts POST requests with JSON payloads and returns a response object containing the operation status and any relevant error messages.',
  },
  {
    id: 'tech-009',
    category: 'technical',
    text: 'Database migrations allow developers to version control schema changes and ensure consistent database structure across different environments.',
  },
  {
    id: 'tech-010',
    category: 'technical',
    text: 'Version control systems like Git enable teams to collaborate effectively by tracking changes, managing branches, and resolving merge conflicts.',
  },

  // Common English Phrases (10)
  {
    id: 'common-001',
    category: 'common',
    text: 'the quick brown fox jumps over the lazy dog',
  },
  {
    id: 'common-002',
    category: 'common',
    text: 'a journey of a thousand miles begins with a single step',
  },
  {
    id: 'common-003',
    category: 'common',
    text: 'actions speak louder than words in most situations',
  },
  {
    id: 'common-004',
    category: 'common',
    text: 'practice makes perfect when learning new skills',
  },
  {
    id: 'common-005',
    category: 'common',
    text: 'every cloud has a silver lining somewhere within',
  },
  {
    id: 'common-006',
    category: 'common',
    text: 'time flies when you are having fun with friends',
  },
  {
    id: 'common-007',
    category: 'common',
    text: 'knowledge is power in the modern information age',
  },
  {
    id: 'common-008',
    category: 'common',
    text: 'better late than never when arriving at destinations',
  },
  {
    id: 'common-009',
    category: 'common',
    text: 'the early bird catches the worm before others',
  },
  {
    id: 'common-010',
    category: 'common',
    text: 'home is where the heart is most comfortable',
  },
];

// Helper function to get a random test (optionally filtered by category)
export function getRandomTest(category?: TestContent['category']): TestContent {
  const tests = category ? getTestsByCategory(category) : staticTests;
  const randomIndex = Math.floor(Math.random() * tests.length);
  return tests[randomIndex];
}

// Helper function to get a test by ID
export function getTestById(id: string): TestContent | undefined {
  return staticTests.find((test) => test.id === id);
}

// Helper function to get tests by category
export function getTestsByCategory(
  category: TestContent['category']
): TestContent[] {
  return staticTests.filter((test) => test.category === category);
}

// Helper function to calculate required words for a given duration
// Assumes average typing speed of 50 WPM
export function calculateRequiredWords(durationSeconds: number): number {
  const ASSUMED_WPM = 120;
  const durationMinutes = durationSeconds / 60;
  const requiredWords = Math.ceil(ASSUMED_WPM * durationMinutes);

  // Ensure at least 50 words for very short tests
  return Math.max(50, requiredWords);
}

// Helper function to convert test text to words array
// For 30-second tests, we need ~150 words (assumes 40-60 WPM typing speed)
export function textToWords(text: string, minWords: number = 150): string[] {
  const words = text.split(/\s+/).filter((word) => word.length > 0);

  // If we already have enough words, return as-is
  if (words.length >= minWords) {
    return words;
  }

  // Otherwise, repeat the text until we have enough words
  const result: string[] = [];
  while (result.length < minWords) {
    result.push(...words);
  }

  // Return exactly minWords
  return result.slice(0, minWords);
}
