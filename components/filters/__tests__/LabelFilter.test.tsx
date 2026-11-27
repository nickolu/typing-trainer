import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TestResult } from '@/lib/types';
import { LabelFilter, filterByLabels } from '../LabelFilter';

function result(id: string, labels?: string[]): TestResult {
  return {
    id,
    createdAt: new Date(),
    duration: 30,
    testContentId: 'c',
    typedWords: [],
    wpm: 50,
    accuracy: 100,
    correctWordCount: 0,
    incorrectWordCount: 0,
    totalWords: 0,
    totalTypedWords: 0,
    keystrokeTimings: [],
    labels,
  };
}

const results = [
  result('1', ['finger-drill', 'finger-drill-balanced', 'keyboard-hhkb']),
  result('2', ['finger-drill', 'finger-drill-targeted', 'keyboard-hhkb']),
  result('3', ['keyboard-laptop']),
  result('4'),
];

describe('filterByLabels', () => {
  it('returns everything when nothing is selected', () => {
    expect(filterByLabels(results, [], 'any')).toHaveLength(4);
  });

  it('matches any selected label by default', () => {
    const out = filterByLabels(results, ['finger-drill-balanced', 'keyboard-laptop'], 'any');
    expect(out.map((r) => r.id)).toEqual(['1', '3']);
  });

  it('requires every selected label in all mode', () => {
    const out = filterByLabels(results, ['finger-drill', 'keyboard-hhkb'], 'all');
    expect(out.map((r) => r.id)).toEqual(['1', '2']);
    expect(filterByLabels(results, ['finger-drill-balanced', 'keyboard-laptop'], 'all')).toHaveLength(0);
  });

  it('excludes unlabeled results once a label is selected', () => {
    expect(filterByLabels(results, ['keyboard-laptop'], 'any').map((r) => r.id)).toEqual(['3']);
  });
});

describe('LabelFilter', () => {
  it('lists labels with counts, most used first, and toggles selection', () => {
    const onChange = vi.fn();
    render(
      <LabelFilter results={results} selected={[]} onChange={onChange} matchMode="any" onMatchModeChange={() => {}} />
    );
    const chips = screen.getAllByRole('button', { pressed: false });
    expect(chips[0]).toHaveTextContent('finger-drill(2)');
    fireEvent.click(screen.getByText('finger-drill-targeted'));
    expect(onChange).toHaveBeenCalledWith(['finger-drill-targeted']);
  });

  it('only offers the any/all switch when two or more labels are selected', () => {
    const onMode = vi.fn();
    const { rerender } = render(
      <LabelFilter results={results} selected={['finger-drill']} onChange={() => {}} matchMode="any" onMatchModeChange={onMode} />
    );
    expect(screen.queryByText('all')).not.toBeInTheDocument();
    rerender(
      <LabelFilter results={results} selected={['finger-drill', 'keyboard-hhkb']} onChange={() => {}} matchMode="any" onMatchModeChange={onMode} />
    );
    fireEvent.click(screen.getByText('all'));
    expect(onMode).toHaveBeenCalledWith('all');
  });

  it('renders nothing when no result has labels', () => {
    const { container } = render(
      <LabelFilter results={[result('x')]} selected={[]} onChange={() => {}} matchMode="any" onMatchModeChange={() => {}} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('keeps a chip (count 0) for a selected label missing from the results so it can be cleared', () => {
    render(
      <LabelFilter results={[result('x')]} selected={['keyboard-old']} onChange={() => {}} matchMode="any" onMatchModeChange={() => {}} />
    );
    expect(screen.getByRole('button', { pressed: true })).toHaveTextContent('keyboard-old(0)');
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('counts only truly hidden chips in the "more" toggle', () => {
    const many = Array.from({ length: 8 }, (_, i) => result(String(i), [`label-${i}`]));
    const { rerender } = render(
      <LabelFilter results={many} selected={[]} onChange={() => {}} matchMode="any" onMatchModeChange={() => {}} />
    );
    expect(screen.getByText('more (2)')).toBeInTheDocument();
    // Selecting both chips past the fold shows them, so nothing is hidden and the toggle goes away.
    rerender(
      <LabelFilter results={many} selected={['label-6', 'label-7']} onChange={() => {}} matchMode="any" onMatchModeChange={() => {}} />
    );
    expect(screen.queryByText(/^more/)).not.toBeInTheDocument();
  });

  it('sorts pinned prefixes ahead of more common labels', () => {
    const data = [
      ...Array.from({ length: 5 }, (_, i) => result(`t${i}`, ['time-30s'])),
      result('d', ['finger-drill-balanced']),
    ];
    render(
      <LabelFilter
        results={data}
        selected={[]}
        onChange={() => {}}
        matchMode="any"
        onMatchModeChange={() => {}}
        pinnedPrefixes={['finger-drill']}
      />
    );
    const chips = screen.getAllByRole('button', { pressed: false });
    expect(chips[0]).toHaveTextContent('finger-drill-balanced(1)');
    expect(chips[1]).toHaveTextContent('time-30s(5)');
  });
});
