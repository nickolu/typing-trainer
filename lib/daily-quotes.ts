import { getTodayPST } from './daily-challenge';

export interface DailyQuote {
  text: string;
  author: string;
  source?: string;
}

export const quotePool: DailyQuote[] = [
  // Literature
  { text: "All that is gold does not glitter, not all those who wander are lost; the old that is strong does not wither, deep roots are not reached by the frost.", author: "J.R.R. Tolkien", source: "The Fellowship of the Ring" },
  { text: "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.", author: "Jane Austen", source: "Pride and Prejudice" },
  { text: "To be, or not to be, that is the question: whether 'tis nobler in the mind to suffer the slings and arrows of outrageous fortune, or to take arms against a sea of troubles.", author: "William Shakespeare", source: "Hamlet" },
  { text: "It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness.", author: "Charles Dickens", source: "A Tale of Two Cities" },
  { text: "Not all those who wander are lost.", author: "J.R.R. Tolkien", source: "The Fellowship of the Ring" },
  { text: "There is some good in this world, and it's worth fighting for.", author: "J.R.R. Tolkien", source: "The Two Towers" },
  { text: "It does not do to dwell on dreams and forget to live.", author: "J.K. Rowling", source: "Harry Potter and the Philosopher's Stone" },
  { text: "We accept the love we think we deserve.", author: "Stephen Chbosky", source: "The Perks of Being a Wallflower" },
  { text: "So we beat on, boats against the current, borne back ceaselessly into the past.", author: "F. Scott Fitzgerald", source: "The Great Gatsby" },
  { text: "I took a deep breath and listened to the old brag of my heart: I am, I am, I am.", author: "Sylvia Plath", source: "The Bell Jar" },
  { text: "The only way out of the labyrinth of suffering is to forgive.", author: "John Green", source: "Looking for Alaska" },
  { text: "In the beginning was the Word, and the Word was with God, and the Word was God.", author: "John", source: "The Bible, John 1:1" },
  { text: "Call me Ishmael.", author: "Herman Melville", source: "Moby Dick" },
  { text: "It is our choices, Harry, that show what we truly are, far more than our abilities.", author: "J.K. Rowling", source: "Harry Potter and the Chamber of Secrets" },
  { text: "Whatever our souls are made of, his and mine are the same.", author: "Emily Bronte", source: "Wuthering Heights" },
  { text: "Do I dare disturb the universe? In a minute there is time for decisions and revisions which a minute will reverse.", author: "T.S. Eliot", source: "The Love Song of J. Alfred Prufrock" },
  { text: "Two roads diverged in a wood, and I took the one less traveled by, and that has made all the difference.", author: "Robert Frost", source: "The Road Not Taken" },
  { text: "I am not afraid of storms, for I am learning how to sail my ship.", author: "Louisa May Alcott", source: "Little Women" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Whenever you feel like criticizing anyone, just remember that all the people in this world haven't had the advantages that you've had.", author: "F. Scott Fitzgerald", source: "The Great Gatsby" },

  // Speeches
  { text: "I have a dream that my four little children will one day live in a nation where they will not be judged by the color of their skin but by the content of their character.", author: "Martin Luther King Jr.", source: "I Have a Dream speech, 1963" },
  { text: "Ask not what your country can do for you — ask what you can do for your country.", author: "John F. Kennedy", source: "Inaugural Address, 1961" },
  { text: "We shall fight on the beaches, we shall fight on the landing grounds, we shall fight in the fields and in the streets, we shall never surrender.", author: "Winston Churchill", source: "Speech to the House of Commons, 1940" },
  { text: "The only thing we have to fear is fear itself.", author: "Franklin D. Roosevelt", source: "First Inaugural Address, 1933" },
  { text: "I am not a crook.", author: "Richard Nixon", source: "Press Conference, 1973" },
  { text: "Mr. Gorbachev, tear down this wall!", author: "Ronald Reagan", source: "Speech at the Brandenburg Gate, 1987" },
  { text: "Injustice anywhere is a threat to justice everywhere.", author: "Martin Luther King Jr.", source: "Letter from Birmingham Jail, 1963" },
  { text: "The arc of the moral universe is long, but it bends toward justice.", author: "Martin Luther King Jr." },
  { text: "We are not enemies, but friends. We must not be enemies.", author: "Abraham Lincoln", source: "First Inaugural Address, 1861" },
  { text: "Four score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal.", author: "Abraham Lincoln", source: "Gettysburg Address, 1863" },

  // Philosophy
  { text: "The unexamined life is not worth living.", author: "Socrates" },
  { text: "I think, therefore I am.", author: "René Descartes", source: "Discourse on the Method" },
  { text: "He who has a why to live can bear almost any how.", author: "Friedrich Nietzsche" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act but a habit.", author: "Aristotle" },
  { text: "Happiness is not something ready-made. It comes from your own actions.", author: "Dalai Lama" },
  { text: "The greatest wealth is to live content with little.", author: "Plato" },
  { text: "To do is to be.", author: "Socrates" },
  { text: "Waste no more time arguing what a good man should be. Be one.", author: "Marcus Aurelius", source: "Meditations" },
  { text: "The impediment to action advances action. What stands in the way becomes the way.", author: "Marcus Aurelius", source: "Meditations" },
  { text: "You have power over your mind, not outside events. Realize this, and you will find strength.", author: "Marcus Aurelius", source: "Meditations" },
  { text: "Luck is what happens when preparation meets opportunity.", author: "Seneca" },
  { text: "It is not that I'm so smart. But I stay with the questions much longer.", author: "Albert Einstein" },
  { text: "Perfection is achieved, not when there is nothing more to add, but when there is nothing left to take away.", author: "Antoine de Saint-Exupéry", source: "Wind, Sand and Stars" },
  { text: "The mind is everything. What you think you become.", author: "Buddha" },
  { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "Do not go where the path may lead, go instead where there is no path and leave a trail.", author: "Ralph Waldo Emerson" },
  { text: "No man ever steps in the same river twice, for it's not the same river and he's not the same man.", author: "Heraclitus" },
  { text: "The only true wisdom is in knowing you know nothing.", author: "Socrates" },
  { text: "Reality is merely an illusion, albeit a very persistent one.", author: "Albert Einstein" },
  { text: "The whole is more than the sum of its parts.", author: "Aristotle" },

  // Science
  { text: "Imagination is more important than knowledge. Knowledge is limited. Imagination encircles the world.", author: "Albert Einstein" },
  { text: "Science is not only a disciple of reason but also one of romance and passion.", author: "Stephen Hawking" },
  { text: "I have not failed. I've just found ten thousand ways that won't work.", author: "Thomas Edison" },
  { text: "The important thing is not to stop questioning. Curiosity has its own reason for existing.", author: "Albert Einstein" },
  { text: "Nothing in life is to be feared, it is only to be understood. Now is the time to understand more, so that we may fear less.", author: "Marie Curie" },
  { text: "We are all connected; to each other biologically, to the earth chemically, and to the rest of the universe atomically.", author: "Neil deGrasse Tyson" },
  { text: "The good thing about science is that it's true whether or not you believe in it.", author: "Neil deGrasse Tyson" },
  { text: "What we know is a drop, what we don't know is an ocean.", author: "Isaac Newton" },
  { text: "If I have seen further it is by standing on the shoulders of giants.", author: "Isaac Newton" },
  { text: "Nature is written in mathematical language.", author: "Galileo Galilei" },
  { text: "The most beautiful thing we can experience is the mysterious. It is the source of all true art and science.", author: "Albert Einstein" },
  { text: "Physics is the only true science. All the rest is stamp collecting.", author: "Ernest Rutherford" },
  { text: "In science it often happens that scientists say, 'You know that's a really good argument; my position is mistaken,' and then they actually change their minds.", author: "Carl Sagan" },
  { text: "Somewhere, something incredible is waiting to be known.", author: "Carl Sagan" },
  { text: "The cosmos is within us. We are made of star-stuff.", author: "Carl Sagan", source: "Cosmos" },

  // Modern leaders and thinkers
  { text: "The only way to do great work is to love what you do. If you haven't found it yet, keep looking. Don't settle.", author: "Steve Jobs" },
  { text: "Your time is limited, so don't waste it living someone else's life.", author: "Steve Jobs" },
  { text: "Stay hungry, stay foolish.", author: "Steve Jobs" },
  { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
  { text: "The greatest glory in living lies not in never falling, but in rising every time we fall.", author: "Nelson Mandela" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
  { text: "You may not control all the events that happen to you, but you can decide not to be reduced by them.", author: "Maya Angelou" },
  { text: "You will face many defeats in life, but never let yourself be defeated.", author: "Maya Angelou" },
  { text: "I've learned that people will forget what you said, people will forget what you did, but people will never forget how you made them feel.", author: "Maya Angelou" },
  { text: "The secret of living well and longer is: eat half, walk double, laugh triple, and love without measure.", author: "Tibetan proverb" },
  { text: "Be the change you wish to see in the world.", author: "Mahatma Gandhi" },
  { text: "First they ignore you, then they laugh at you, then they fight you, then you win.", author: "Mahatma Gandhi" },
  { text: "Strength does not come from physical capacity. It comes from an indomitable will.", author: "Mahatma Gandhi" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "Success is not in what you have, but who you are.", author: "Bo Bennett" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { text: "Life is what happens when you're busy making other plans.", author: "John Lennon" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "You must be the change you wish to see in the world.", author: "Mahatma Gandhi" },
  { text: "Spread love everywhere you go. Let no one ever come to you without leaving happier.", author: "Mother Teresa" },
  { text: "When you reach the end of your rope, tie a knot in it and hang on.", author: "Franklin D. Roosevelt" },
  { text: "In the end, it's not the years in your life that count. It's the life in your years.", author: "Abraham Lincoln" },

  // Movies and pop culture
  { text: "May the Force be with you.", author: "Star Wars", source: "Star Wars: A New Hope (1977)" },
  { text: "You can't handle the truth!", author: "Jack Nicholson", source: "A Few Good Men (1992)" },
  { text: "Life is like a box of chocolates. You never know what you're gonna get.", author: "Forrest Gump", source: "Forrest Gump (1994)" },
  { text: "To infinity and beyond!", author: "Buzz Lightyear", source: "Toy Story (1995)" },
  { text: "With great power comes great responsibility.", author: "Uncle Ben", source: "Spider-Man (2002)" },
  { text: "Why so serious?", author: "The Joker", source: "The Dark Knight (2008)" },
  { text: "I'll be back.", author: "The Terminator", source: "The Terminator (1984)" },
  { text: "There's no place like home.", author: "Dorothy Gale", source: "The Wizard of Oz (1939)" },
  { text: "Elementary, my dear Watson.", author: "Sherlock Holmes", source: "The Adventures of Sherlock Holmes" },
  { text: "It's not who I am underneath, but what I do that defines me.", author: "Batman", source: "Batman Begins (2005)" },

  // Music
  { text: "Music gives a soul to the universe, wings to the mind, flight to the imagination, and life to everything.", author: "Plato" },
  { text: "Without music, life would be a mistake.", author: "Friedrich Nietzsche", source: "Twilight of the Idols" },
  { text: "One good thing about music, when it hits you, you feel no pain.", author: "Bob Marley" },
  { text: "Music can change the world because it can change people.", author: "Bono" },
  { text: "Where words fail, music speaks.", author: "Hans Christian Andersen" },

  // Motivational and self-improvement
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair" },
  { text: "Success usually comes to those who are too busy to be looking for it.", author: "Henry David Thoreau" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "The harder I work, the luckier I get.", author: "Samuel Goldwyn" },
  { text: "Opportunities don't happen. You create them.", author: "Chris Grosser" },
  { text: "Don't let yesterday take up too much of today.", author: "Will Rogers" },
  { text: "You learn more from failure than from success. Don't let it stop you.", author: "Unknown" },
  { text: "It's not whether you get knocked down, it's whether you get up.", author: "Vince Lombardi" },
  { text: "The man who has confidence in himself gains the confidence of others.", author: "Hasidic proverb" },
  { text: "The only limit to our realization of tomorrow will be our doubts of today.", author: "Franklin D. Roosevelt" },
  { text: "Dreaming, after all, is a form of planning.", author: "Gloria Steinem" },
  { text: "What lies behind us and what lies before us are tiny matters compared to what lies within us.", author: "Ralph Waldo Emerson" },
  { text: "Keep your face always toward the sunshine, and shadows will fall behind you.", author: "Walt Whitman" },

  // Humor and wit
  { text: "I have not failed. I've just found ten thousand ways that won't work.", author: "Thomas Edison" },
  { text: "If you want to make God laugh, tell him about your plans.", author: "Woody Allen" },
  { text: "The difference between stupidity and genius is that genius has its limits.", author: "Albert Einstein" },
  { text: "Age is an issue of mind over matter. If you don't mind, it doesn't matter.", author: "Mark Twain" },
  { text: "I can resist everything except temptation.", author: "Oscar Wilde", source: "Lady Windermere's Fan" },
  { text: "Be yourself; everyone else is already taken.", author: "Oscar Wilde" },
  { text: "A day without sunshine is like, you know, night.", author: "Steve Martin" },
  { text: "The trouble with having an open mind, of course, is that people will insist on coming along and trying to put things in it.", author: "Terry Pratchett" },
  { text: "I'm not superstitious, but I am a little stitious.", author: "Michael Scott", source: "The Office" },
  { text: "If at first you don't succeed, then skydiving definitely isn't for you.", author: "Steven Wright" },
];

// FNV-1a hash (same algorithm as daily-challenge.ts)
function fnv1aHash(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

// Seeded PRNG (mulberry32-style, same as daily-challenge.ts)
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s = Math.imul(s ^ (s >>> 13), 0x45d9f3b);
    s = (s ^ (s >>> 16)) >>> 0;
    return s / 0x100000000;
  };
}

/**
 * Returns the daily quote for a given date (or today in PST).
 * Uses the same deterministic seed system as getDailyPassage but with
 * a "quote-" salt so it always picks a different item than the passage.
 */
export function getDailyQuote(date?: string): DailyQuote {
  const targetDate = date ?? getTodayPST();

  // Use "quote-" salt to differentiate from passage seed
  const seed = fnv1aHash(`quote-${targetDate}`);
  const prng = seededRandom(seed);

  // Fisher-Yates shuffle
  const shuffled = [...quotePool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Use seed to pick a day-offset within the pool for cycling
  const dayHash = fnv1aHash(targetDate);
  const index = dayHash % quotePool.length;
  return shuffled[index];
}

/**
 * Converts a DailyQuote to a plain-text string suitable for typing tests.
 * Format: "quote text — Author"
 */
export function quoteToText(quote: DailyQuote): string {
  return `${quote.text} — ${quote.author}`;
}
