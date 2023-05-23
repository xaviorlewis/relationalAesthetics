import { controls, evalScope } from '@strudel.cycles/core';
import { CodeMirror, useHighlighting, useKeydown, useStrudel, flash } from '@strudel.cycles/react';
import { getAudioContext, initAudioOnFirstClick, panic, webaudioOutput } from '@strudel.cycles/webaudio';
import { useCallback, useState } from 'react';
import './style.css';

initAudioOnFirstClick();

evalScope(
  controls,
  import('@strudel.cycles/core'),
  import('@strudel.cycles/tonal'),
  import('@strudel.cycles/mini'),
  import('@strudel.cycles/xen'),
  import('@strudel.cycles/webaudio'),
  import('@strudel.cycles/osc'),
);

// Add state variables for user-controllable parameters
const [speed, setSpeed] = useState(0.7);
const [gain, setGain] = useState(0.4);

// Interpolate state variables into Strudel script
const code = `samples({
  // ...
  s("bd,[~ <sd!3 sd(3,4,2)>],hh*8") // drums
  .speed(perlin.range(${speed},${speed+0.2})) // user-controlled speed
  // ...
  ,"<a1 b1*2 a1(3,8) e2>" // bassline
  // ...
  .gain(${gain}) // user-controlled gain
  // ...
}).fast(2/3)`;

const ctx = getAudioContext();
const getTime = () => ctx.currentTime;

function App() {
  const [view, setView] = useState();
  const { scheduler, evaluate, schedulerError, evalError, isDirty, activeCode, pattern, started } = useStrudel({
    code,
    defaultOutput: webaudioOutput,
    getTime,
  });

  useHighlighting({
    view,
    pattern,
    active: started && !activeCode?.includes('strudel disable-highlighting'),
    getTime: () => scheduler.now(),
  });

  const error = evalError || schedulerError;
  useKeydown(
    useCallback(
      async (e) => {
        if (e.ctrlKey || e.altKey) {
          if (e.code === 'Enter') {
            e.preventDefault();
            flash(view);
            await evaluate(code);
            if (e.shiftKey) {
              panic();
              scheduler.stop();
              scheduler.start();
            }
            if (!scheduler.started) {
              scheduler.start();
            }
          } else if (e.code === 'Period') {
            scheduler.stop();
            panic();
            e.preventDefault();
          }
        }
      },
      [scheduler, evaluate, view],
    ),
  );
  return (
    <div>
      <nav className="z-[12] w-full flex justify-center fixed bottom-0">
        <div className="bg-slate-500 space-x-2 px-2 rounded-t-md">
          {/* Add UI controls for user-controllable parameters */}
          <div>
            <label>Speed: </label>
            <input type="range" min="0.1" max="1.0" step="0.1" value={speed} onChange={e => setSpeed(e.target.value)} />
          </div>
          <div>
            <label>Gain: </label>
            <input type="range" min="0.1" max="1.0" step="0.1" value={gain} onChange={e => setGain(e.target.value)} />
          </div>
          <button
            onClick={async ()=> {
await evaluate(code);
scheduler.start();
}}
>
start
</button>
<button onClick={() => scheduler.stop()}>stop</button>
{isDirty && <button onClick={() => evaluate(code)}>eval</button>}
</div>
{error && <p>error {error.message}</p>}
</nav>
<CodeMirror value={code} onChange={setCode} onViewChanged={setView} />
</div>
);
}

export default App;
