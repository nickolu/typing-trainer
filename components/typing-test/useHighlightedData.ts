
  // Calculate which character indices should be highlighted for each word
  // and which inter-word spaces should be highlighted
export const useHighlightedData = (targetWords: string[], practiceSequences: string[], showHighlights: boolean) => {

    if (!showHighlights || practiceSequences.length === 0) {
        return {
        wordHighlights: new Map<number, Set<number>>(),
        spaceHighlights: new Set<number>(),
        };
    }

    // Build the full text with spaces
    const fullText = targetWords.join(' ');
    const wordHighlights = new Map<number, Set<number>>();
    const spaceHighlights = new Set<number>(); // Track which word indices have highlighted space after them

    // Find all occurrences of practice sequences in the full text
    for (const sequence of practiceSequences) {
        let searchIndex = 0;
        while (searchIndex < fullText.length) {
        const foundIndex = fullText.indexOf(sequence, searchIndex);
        if (foundIndex === -1) break;

        // Map the character positions back to word indices
        let currentWordIdx = 0;
        let charInWord = 0;

        for (let i = 0; i <= foundIndex + sequence.length - 1; i++) {
            if (i === fullText.length) break;

            if (fullText[i] === ' ') {
            // Check if this space is part of the highlighted sequence
            if (i >= foundIndex && i < foundIndex + sequence.length) {
                spaceHighlights.add(currentWordIdx);
            }
            currentWordIdx++;
            charInWord = 0;
            } else {
            if (i >= foundIndex && i < foundIndex + sequence.length) {
                // This character should be highlighted
                if (!wordHighlights.has(currentWordIdx)) {
                wordHighlights.set(currentWordIdx, new Set());
                }
                wordHighlights.get(currentWordIdx)!.add(charInWord);
            }
            charInWord++;
            }
        }

        searchIndex = foundIndex + 1;
        }
    }

    return { wordHighlights, spaceHighlights };
};
