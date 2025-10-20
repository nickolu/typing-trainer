// Benchmark test configuration
export const BENCHMARK_CONFIG = {
  duration: 120, // Fixed at 120 seconds (2 minutes) for all benchmark tests
  label: 'benchmark', // Auto-label for all benchmark tests
};

// Benchmark test content
export interface BenchmarkContent {
  id: string;
  title: string;
  text: string;
}

// 12 placeholder benchmark content items
export const BENCHMARK_CONTENT: BenchmarkContent[] = [
  {
    id: 'benchmark-001',
    title: 'Benchmark Test 1',
    text: 'The essence of software development lies in the ability to transform abstract ideas into concrete solutions. Every line of code represents a decision, a choice made by a developer to solve a specific problem in a particular way. The craft of programming requires not only technical knowledge but also creativity, patience, and the ability to think logically about complex systems. Modern applications are built on layers of abstraction, each layer hiding complexity while exposing simple interfaces. This architectural approach enables teams to collaborate effectively, building upon the work of others without needing to understand every implementation detail. The best code is not merely functional but also readable, maintainable, and elegant in its simplicity.',
  },
  {
    id: 'benchmark-002',
    title: 'Benchmark Test 2',
    text: 'In the realm of digital communication, the written word takes on new dimensions and possibilities. Messages traverse the globe in milliseconds, connecting people across vast distances and cultural boundaries. The internet has democratized information access, allowing anyone with a connection to learn, share, and create content. This transformation has profound implications for education, business, and social interaction. Yet with great power comes great responsibility. Digital literacy has become as essential as traditional literacy, requiring individuals to critically evaluate sources, protect their privacy, and communicate effectively across various platforms. The ability to type efficiently and accurately is no longer just a useful skill but a fundamental requirement.',
  },
  {
    id: 'benchmark-003',
    title: 'Benchmark Test 3',
    text: 'The process of learning to type faster involves developing muscle memory through consistent practice and repetition. Our brains gradually automate the connection between thought and keystroke, allowing our fingers to dance across the keyboard without conscious effort. This automaticity frees our cognitive resources to focus on composition and creativity rather than the mechanical act of typing. Professional typists can reach speeds exceeding one hundred words per minute, a testament to the power of dedicated practice. However, speed alone is not the goal; accuracy and consistency are equally important. A fast typist who makes frequent mistakes will ultimately be slower than a methodical typist who rarely needs to correct errors.',
  },
  {
    id: 'benchmark-004',
    title: 'Benchmark Test 4',
    text: 'Throughout history, communication technologies have shaped human civilization in profound ways. From the invention of writing systems to the printing press, each innovation expanded the reach and impact of ideas. The telegraph compressed time and space, allowing messages to travel at the speed of electricity. The telephone added the human voice to long-distance communication. Radio and television brought audio and visual media to mass audiences. The internet represents the culmination of these technologies, combining text, voice, video, and interactive elements into a single platform. Each generation adapts to new communication tools, developing skills and conventions that previous generations never imagined. Touch typing is one such skill, born from the typewriter and perfected for the digital age.',
  },
  {
    id: 'benchmark-005',
    title: 'Benchmark Test 5',
    text: 'The keyboard itself has an interesting history, with the QWERTY layout designed over a century ago for mechanical typewriters. The arrangement of letters was optimized to prevent mechanical jams rather than maximize typing speed. Despite numerous alternative layouts claiming superior efficiency, QWERTY remains dominant due to network effects and the cost of retraining. Modern ergonomic keyboards attempt to reduce strain and improve comfort through split designs and curved key arrangements. Some enthusiasts prefer mechanical keyboards for their tactile feedback and durability. Others embrace compact layouts that eliminate unnecessary keys. The debate over the ideal keyboard continues, but the fundamental skill of touch typing transcends these hardware differences.',
  },
  {
    id: 'benchmark-006',
    title: 'Benchmark Test 6',
    text: 'Effective communication requires more than just fast typing; it demands clarity, coherence, and consideration for the audience. In professional settings, written communication often serves as a permanent record, making accuracy and precision paramount. Email, reports, documentation, and presentations all require careful attention to detail. Proofreading and editing are essential steps in the writing process, catching errors that might undermine credibility. The ability to express complex ideas in simple, accessible language is a valuable skill that distinguishes exceptional communicators. Technical writers specialize in translating specialized knowledge into user-friendly documentation. Content creators craft engaging narratives that inform and entertain. In all these contexts, typing proficiency provides the foundation for productive work.',
  },
  {
    id: 'benchmark-007',
    title: 'Benchmark Test 7',
    text: 'The digital workplace has transformed how we collaborate and create value. Remote work, once a rarity, has become commonplace, enabled by cloud computing, video conferencing, and collaborative software. Team members scattered across time zones coordinate through asynchronous communication, relying heavily on written messages. Project management tools track tasks and deadlines, while version control systems manage code changes. Documentation wikis preserve institutional knowledge. In this environment, typing speed directly impacts productivity. Faster typing means faster communication, faster coding, faster note-taking, and faster documentation. Yet speed must be balanced with thoughtfulness. The most valuable contributions often require careful consideration rather than rapid response.',
  },
  {
    id: 'benchmark-008',
    title: 'Benchmark Test 8',
    text: 'Programming languages provide structured ways for humans to communicate with computers, translating high-level intentions into machine-executable instructions. Each language has its own syntax, semantics, and idioms that programmers must master. Some languages prioritize performance and control, while others emphasize expressiveness and safety. The choice of language depends on the problem domain, team expertise, and project requirements. Regardless of language, all programming involves typing substantial amounts of text. Code editors provide features like syntax highlighting, auto-completion, and error detection to aid the coding process. Integrated development environments combine editing, debugging, and testing tools. Despite these aids, typing proficiency remains essential for translating algorithmic thinking into working code.',
  },
  {
    id: 'benchmark-009',
    title: 'Benchmark Test 9',
    text: 'Data structures and algorithms form the theoretical foundation of computer science, providing efficient solutions to common computational problems. Arrays, linked lists, trees, and graphs each offer different trade-offs between memory usage and access speed. Sorting algorithms range from simple but slow methods to complex but efficient approaches. Hash tables provide constant-time lookups through clever use of hash functions. Understanding these fundamentals enables developers to make informed decisions about program architecture. Performance analysis using big-O notation quantifies algorithmic efficiency as input sizes grow. These concepts, often taught in university courses, remain relevant throughout a programming career. The ability to implement these structures and algorithms requires both conceptual understanding and practical typing skills.',
  },
  {
    id: 'benchmark-010',
    title: 'Benchmark Test 10',
    text: 'User interface design bridges the gap between human intention and machine capability. Good design is invisible, allowing users to accomplish their goals without conscious thought about the interface itself. Poor design creates friction, frustration, and errors. Designers must understand human psychology, perceptual limitations, and motor control. Color theory, typography, layout, and interaction patterns all contribute to the user experience. Accessibility considerations ensure that interfaces work for people with diverse abilities. Responsive design adapts interfaces to different screen sizes and input methods. Prototyping tools allow designers to quickly iterate on concepts. The entire design process involves extensive written communication, from user research findings to technical specifications.',
  },
  {
    id: 'benchmark-011',
    title: 'Benchmark Test 11',
    text: 'Testing and quality assurance are critical components of software development, ensuring that products meet requirements and function correctly. Unit tests verify individual components in isolation. Integration tests check that components work together properly. End-to-end tests simulate real user workflows. Performance tests measure speed and resource usage under various loads. Security tests probe for vulnerabilities. Automated testing frameworks run these checks continuously, catching regressions before they reach production. Test-driven development advocates writing tests before implementation code, using failing tests to drive design decisions. Code review processes catch issues that automated tests miss. All these quality practices involve substantial written communication and documentation.',
  },
  {
    id: 'benchmark-012',
    title: 'Benchmark Test 12',
    text: 'Continuous learning is essential in the rapidly evolving technology industry. New languages, frameworks, and tools emerge constantly, while established technologies receive regular updates. Developers must balance deep expertise in current technologies with broad awareness of emerging trends. Online courses, technical blogs, conference talks, and documentation all contribute to professional development. Reading code written by others provides insights into different approaches and patterns. Writing about technical topics reinforces understanding and helps others learn. Open source contributions provide opportunities to collaborate with developers worldwide. Professional networks offer support and knowledge sharing. The ability to quickly absorb written information and articulate technical concepts requires strong typing skills.',
  },
];

// Get a random benchmark content
export function getRandomBenchmarkContent(): BenchmarkContent {
  const randomIndex = Math.floor(Math.random() * BENCHMARK_CONTENT.length);
  return BENCHMARK_CONTENT[randomIndex];
}

// Get benchmark content by ID
export function getBenchmarkContentById(id: string): BenchmarkContent | undefined {
  return BENCHMARK_CONTENT.find(content => content.id === id);
}
