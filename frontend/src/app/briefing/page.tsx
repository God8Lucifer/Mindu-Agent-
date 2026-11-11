'use client';

import { useState } from 'react';
import { PageNav } from '@/components/PageNav';

type Chamber = {
  id: string;
  name: string;
  summary: string;
  discussion: string;
  sourceLabel: string;
  sourceUrl: string;
  reviewedOn: string | null;
};

// This pinned source identifies the project material used for the draft.
// Replace it with the relevant approved exhibit source for each chamber.
const projectSource = {
  sourceLabel: 'GMC Experience Centre exhibit notes',
  sourceUrl:
    'https://github.com/God8Lucifer/Mindu-Agent-/blob/b5e4381/frontend/src/features/map/layout-data.ts',
  reviewedOn: null,
};

const chambers: Chamber[] = [
  {
    ...projectSource,
    id: 'chamber1',
    name: 'The Vision',
    summary:
      'An introduction to the idea behind Gelephu Mindfulness City. Use this chamber to open a discussion about what mindfulness could mean in everyday city life.',
    discussion:
      'What would make a city feel mindful to someone who lives there?',
  },
  {
    ...projectSource,
    id: 'chamber2',
    name: 'Urban Blueprint',
    summary:
      'Explore the city through its masterplan. Use the layout to discuss how people might move between places and how the landscape shapes those connections.',
    discussion:
      'Which two places would you most want to connect, and why?',
  },
  {
    ...projectSource,
    id: 'chamber3',
    name: 'The Economy of Tomorrow',
    summary:
      'Consider the people and businesses that could participate in the city’s economy. Use this chamber to discuss what participation might look like for a local entrepreneur.',
    discussion:
      'What would a small Bhutanese business need to participate?',
  },
  {
    ...projectSource,
    id: 'chamber4',
    name: 'My City. My Future.',
    summary:
      'Reflect on the city from a personal perspective. Invite participants to identify one feature they would value in a future neighbourhood and explain their choice.',
    discussion:
      'What is one thing you would want a future neighbourhood to preserve?',
  },
];

function reviewLabel(chamber: Chamber) {
  return chamber.reviewedOn
    ? `Reviewed ${chamber.reviewedOn}`
    : 'Draft exhibit summary · GMC review pending';
}

async function downloadBriefing(selected: Chamber[]) {
  const { default: PptxGenJS } = await import('pptxgenjs');
  const pptx = new PptxGenJS();

  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'GMC Experience Centre';
  pptx.title = 'GMC Experience Centre Briefing';
  pptx.subject = selected.map((chamber) => chamber.name).join(', ');

  const navy = '122C39';
  const green = '006554';
  const muted = '48616A';

  for (const chamber of selected) {
    const slide = pptx.addSlide();
    slide.background = { color: 'FAF9F5' };

    slide.addText('GMC EXPERIENCE CENTRE', {
      x: 0.6, y: 0.42, w: 11.9, h: 0.28,
      fontSize: 13, bold: true, color: green, margin: 0,
    });

    slide.addText(chamber.name, {
      x: 0.6, y: 0.95, w: 12.1, h: 0.72,
      fontSize: 36, bold: true, color: navy, margin: 0,
    });

    slide.addText(chamber.summary, {
      x: 0.6, y: 1.95, w: 11.9, h: 1.05,
      fontSize: 21, color: navy, margin: 0, valign: 'middle',
    });

    // Editable PowerPoint shapes show where this chamber sits in the visit.
    chambers.forEach((stop, index) => {
      const active = stop.id === chamber.id;
      const x = 0.6 + index * 3.05;

      slide.addShape(pptx.ShapeType.rect, {
        x, y: 3.45, w: 2.85, h: 0.76,
        rectRadius: 0,
        line: { color: active ? green : 'CAD8D3', width: 1 },
        fill: { color: active ? green : 'E8EFEB' },
      });

      slide.addText(stop.name, {
        x: x + 0.06, y: 3.49, w: 2.73, h: 0.68,
        fontSize: 14, bold: active,
        color: active ? 'FFFFFF' : navy,
        align: 'center', valign: 'middle', margin: 0.03,
      });
    });

    slide.addText('Discuss with your group', {
      x: 0.6, y: 4.7, w: 12, h: 0.35,
      fontSize: 16, bold: true, color: green, margin: 0,
    });

    slide.addText(chamber.discussion, {
      x: 0.6, y: 5.15, w: 11.9, h: 0.7,
      fontSize: 23, color: navy, margin: 0,
    });

    slide.addText(chamber.sourceLabel, {
      x: 0.6, y: 6.4, w: 7.9, h: 0.3,
      fontSize: 12, color: green, margin: 0,
      hyperlink: { url: chamber.sourceUrl },
    });

    slide.addText(reviewLabel(chamber), {
      x: 0.6, y: 6.88, w: 11.9, h: 0.25,
      fontSize: 11, color: muted, margin: 0,
    });
  }

  await pptx.writeFile({ fileName: 'GMC-Experience-Centre-Briefing.pptx' });
}

export default function BriefingPage() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const selected = chambers.filter((chamber) =>
    selectedIds.includes(chamber.id),
  );

  function toggle(id: string) {
    setError('');
    setSelectedIds((previous) =>
      previous.includes(id)
        ? previous.filter((value) => value !== id)
        : [...previous, id],
    );
  }

  async function handleDownload() {
    if (busy || selected.length === 0) return;
    setBusy(true);
    setError('');

    try {
      await downloadBriefing(selected);
    } catch {
      setError('The PowerPoint could not be created. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
    <PageNav />
    <main className="briefing">
      <h1>Build your GMC briefing</h1>
      <p>Choose the chambers to include. Each becomes one editable PowerPoint slide.</p>

      <fieldset disabled={busy}>
        <legend>Chambers</legend>
        {chambers.map((chamber) => (
          <label key={chamber.id}>
            <input
              type="checkbox"
              checked={selectedIds.includes(chamber.id)}
              onChange={() => toggle(chamber.id)}
            />
            {chamber.name}
          </label>
        ))}
      </fieldset>

      {selected.length > 0 && (
        <section aria-label="Slide preview">
          <h2>Slide preview</h2>
          {selected.map((chamber) => (
            <article key={chamber.id}>
              <h3>{chamber.name}</h3>
              <p>{chamber.summary}</p>
              <p><strong>Discussion</strong> · {chamber.discussion}</p>
              <small>{reviewLabel(chamber)}</small>
            </article>
          ))}
        </section>
      )}

      <button
        type="button"
        disabled={busy || selected.length === 0}
        onClick={handleDownload}
      >
        {busy
          ? 'Creating PowerPoint…'
          : `Download PowerPoint (${selected.length} ${selected.length === 1 ? 'slide' : 'slides'})`}
      </button>

      {error && <p role="alert">{error}</p>}

      <style>{`
        .briefing {
          box-sizing: border-box;
          max-width: 760px;
          margin: 0 auto;
          padding: 40px 22px 64px;
          --b-text: #122c39; --b-bg: #faf9f5; --b-accent: #006554; --b-line: #b9cbc3;
          --b-rule: #d9e2de; --b-off-bg: #dce5e0; --b-off-text: #42554c; --b-alert: #922f21;
          color: var(--b-text);
          background: var(--b-bg);
          min-height: 100dvh;
          font-family: Arial, sans-serif;
          line-height: 1.5;
        }
        :root[data-theme='dark'] .briefing {
          --b-text: #eef0f6; --b-bg: #12172a; --b-accent: #5fc4a8; --b-line: #343c5c;
          --b-rule: #2a3150; --b-off-bg: #252c47; --b-off-text: #a4aac0; --b-alert: #f08a7a;
        }
        .briefing a, .briefing small { color: var(--b-accent); }
        .briefing h1 { margin: 40px 0 6px; font-size: clamp(2rem, 5vw, 3rem); line-height: 1.1; }
        .briefing h2 { margin: 28px 0 8px; }
        .briefing h3, .briefing p { margin: 8px 0; }
        .briefing fieldset { margin: 24px 0; padding: 12px 18px; border: 1px solid var(--b-line); }
        .briefing legend { padding: 0 6px; font-weight: 700; }
        .briefing label { display: flex; align-items: center; gap: 12px; padding: 9px 0; cursor: pointer; }
        .briefing input { width: 18px; height: 18px; accent-color: var(--b-accent); }
        .briefing article { padding: 14px 0; border-bottom: 1px solid var(--b-rule); }
        .briefing button {
          margin-top: 24px; padding: 13px 18px; border: 0; border-radius: 8px;
          background: var(--b-accent); color: var(--b-bg); font: inherit; font-weight: 700; cursor: pointer;
        }
        .briefing button:disabled { background: var(--b-off-bg); color: var(--b-off-text); cursor: default; }
        .briefing [role='alert'] { color: var(--b-alert); }
      `}</style>
    </main>
    </>
  );
}