import { useEffect, useRef } from 'react';

export function ExitMatchDialog({ onCancel, onExit }: {
  onCancel: () => void;
  onExit: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="exit-match-title"
      className="m-auto w-[min(90vw,24rem)] rounded-xl border border-slate-700 bg-slate-900 p-5 text-white backdrop:bg-black/75"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <h2 id="exit-match-title" className="text-lg font-bold">Exit this match?</h2>
      <p className="mt-2 text-sm text-slate-300">You’ll leave this duel and return to the menu.</p>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button type="button" autoFocus onClick={onCancel} className="rounded-lg bg-slate-700 px-3 py-2 font-bold">
          Keep playing
        </button>
        <button type="button" onClick={onExit} className="rounded-lg bg-amber-400 px-3 py-2 font-bold text-slate-950">
          Exit match
        </button>
      </div>
    </dialog>
  );
}
