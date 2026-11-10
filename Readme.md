# Mindu — GMC guide

Mindu is an AI guide for Gelephu Mindfulness City. Instead of a mascot, the guide is the GMC logo itself, animated line by line.

## Run it

```bash
node serve.js
```

Then open http://localhost:4321.

## Logo states

| State | Animation |
| --- | --- |
| `wake` | Lines draw in one by one |
| `idle` | Gentle breathing, light flows down the river |
| `listening` | Frame pulses orange, ripples spread (while typing or using the mic) |
| `thinking` | A spark runs through every line |
| `speaking` | Logo pulses, river flows fast, reply is read aloud |

## Files

- `guide/gmc-guide.js` — the guide (`MinduGuide.mount(element, options)`)
- `guide/gmc-guide.css` — logo animations and chat styles (light and dark)
- `index.html` — demo page

## Plugging in the real AI

Replies are scripted placeholders for now. Pass an `answer` function that returns the reply text:

```js
MinduGuide.mount(document.getElementById('guide'), {
  answer: async (question) => {
    const res = await fetch('/api/mindu/chat', { method: 'POST', body: JSON.stringify({ question }) });
    return (await res.json()).reply;
  },
});
```
