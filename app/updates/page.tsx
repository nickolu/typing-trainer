'use client';

export default function UpdatesPage() {
  const updates = [
    {
      date: 'November 1, 2025',
      title: 'Retry the Same Test Content',
      description: 'You can now retry the same test content. Practice the same passage multiple times. Track your improvement. This will let you compete with other users on the same content in a future update.'
    },
    {
      date: 'October 28, 2025',
      title: 'Enhanced Word Tracking & UI Improvements',
      description: 'We now track detailed information about every word you complete. This gives you better insights into your performance. Strict mode failures are clearer. You can see exactly what went wrong.'
    },
    {
      date: 'October 28, 2025',
      title: 'Better Test Generation & Content Selection',
      description: 'We added a "clear all selections" button. The content menu is clearer. When "Save Results" is disabled, we explain why. Setting up your test is faster.'
    },
    {
      date: 'October 28, 2025',
      title: 'Strict Mode Enhancement: Mistake Delays',
      description: 'Strict mode now adds a small delay after mistakes. This helps you build better muscle memory. The pause lets you reflect on errors. You will type more accurately.'
    },
    {
      date: 'October 28, 2025',
      title: 'Restart Test Feature',
      description: 'You can now restart a test mid-way. Click the restart button to start fresh. Made too many mistakes? Want a do-over? One click restarts your test.'
    },
    {
      date: 'October 23, 2025',
      title: 'Test History: Repeat Trials Tracking',
      description: 'We track your history for repeat trials of the same test. See how you improve over time. Identify where you grow. Master your typing skills.'
    },
    {
      date: 'October 22, 2025',
      title: 'Time Trials Mode',
      description: 'Time Trials mode is here. Race against the clock. Type as much as you can in a fixed time. Build speed. Beat your personal best.'
    },
    {
      date: 'October 22, 2025',
      title: 'Enhanced Analytics Display',
      description: 'We redesigned your post-test analytics. Common mistakes, slowest sequences, and problematic words are easier to read. You can see your performance at a glance. Know where to focus your practice.'
    },
    {
      date: 'October 22, 2025',
      title: 'Firefox Quick Find Fix',
      description: 'We fixed a bug in Firefox. Single quotes and spaces now register in your test. They no longer trigger browser actions. Every keystroke counts.'
    },
    {
      date: 'October 22, 2025',
      title: 'Main Navigation Launch',
      description: 'We added main navigation. Move between stats, settings, and tests easily. Navigation is faster and simpler.'
    },
    {
      date: 'October 22, 2025',
      title: 'One-Click Content Selection',
      description: 'Content menu items with no sub-options now select in one click. No extra steps. Choose what you want and start typing.'
    },
    {
      date: 'October 21, 2025',
      title: 'Settings Page',
      description: 'We launched a Settings page. Control speedometer visibility and WPM markers. Customize your typing experience.'
    },
    {
      date: 'October 21, 2025',
      title: 'Adjustable Labels & Secure Data Storage',
      description: 'You can now adjust labels after completing a test. Organize and categorize your practice sessions. We upgraded to secure cloud storage with user authentication. Your data is more secure.'
    },
    {
      date: 'October 21, 2025',
      title: 'Global Leaderboard',
      description: 'We launched a global leaderboard. See how you compare with typists worldwide. Compare your WPM, accuracy, and consistency. Climb the ranks.'
    },
    {
      date: 'October 21, 2025',
      title: 'Three-Tier Correction Mode',
      description: 'We added three correction mode options. Choose unrestricted typing, partial corrections, or strict mode. Pick the error handling that matches your goals. Practice the way you want.'
    },
    {
      date: 'October 21, 2025',
      title: 'Stats Page Redesign',
      description: 'We redesigned the stats page. It is more compact and shows more data. Problematic words now use a two-column layout. Your performance data is easier to understand.'
    }
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Updates</h1>
          <p className="text-editor-muted">See what&apos;s new and improved in your typing practice app!</p>
        </div>

        {/* Updates Timeline */}
        <div className="space-y-8">
          {updates.map((update, index) => (
            <div key={index}>
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-editor-fg mb-1">{update.title}</h2>
                <span className="text-lg font-medium text-editor-fg">{update.date}</span>
              </div>
              <p className="text-editor-muted leading-relaxed mb-6">{update.description}</p>
              {index < updates.length - 1 && (
                <div className="border-t border-editor-muted"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
