"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import {
  CAPTION_LIMIT,
  MEDIA_BUCKET,
  storagePath,
  UPLOAD_RULES,
  uploadProblem,
  sizeText,
  type UploadKind,
} from "@/lib/console/media-rules";
import { createClient } from "@/lib/supabase/client";
import { ui } from "../ui";
import {
  deleteMedia,
  discardUpload,
  makeMainPhoto,
  recordUpload,
  reorderPhoto,
  saveCaption,
  saveTourLink,
  type MediaResult,
} from "./media-actions";

export type PhotoView = { id: string; url: string; caption: string; isMain: boolean };
export type VideoView = { id: string; url: string };

type Props = {
  propertyId: string;
  clientId: string;
  photos: PhotoView[];
  video: VideoView | null;
  tourUrl: string | null;
};

const notice = (result: MediaResult | null) =>
  result && (
    <p role={result.ok ? "status" : "alert"} className={result.ok ? "text-sm font-semibold text-available" : ui.error}>
      {result.message}
    </p>
  );

export function MediaSection(props: Props) {
  return (
    <section className="flex flex-col gap-3" aria-labelledby="media-heading">
      <div className="flex flex-col gap-0.5">
        <h2 id="media-heading" className={ui.h2}>
          Photos, video and 3D tour
        </h2>
        <p className="text-sm text-muted">
          Files are public once uploaded, at addresses nobody can guess, and show on the portal when the property is live.
          Upload only photos you are happy to publish: no faces or number plates.
        </p>
      </div>
      <Photos {...props} />
      <Video {...props} />
      <Tour {...props} />
    </section>
  );
}

/** Uploads files from the browser straight to Storage, then records each one on the server. */
function useUploader(propertyId: string, clientId: string, kind: UploadKind) {
  const [status, setStatus] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function upload(files: File[]) {
    const errors: string[] = [];
    const ready = files.filter((file) => {
      const problem = uploadProblem(kind, file);
      if (problem) errors.push(problem);
      return !problem;
    });
    setProblems(errors);
    if (ready.length === 0) return;

    setBusy(true);
    const supabase = createClient();
    let added = 0;
    for (const [i, file] of ready.entries()) {
      setStatus(
        ready.length > 1
          ? `Uploading ${i + 1} of ${ready.length}…`
          : `Uploading ${file.name} (${sizeText(file.size)})${kind === "video" ? ". On mobile data this can take a few minutes." : "…"}`,
      );
      const path = storagePath(clientId, propertyId, crypto.randomUUID(), file.type, kind);
      const { error } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
      if (error) {
        errors.push(`${file.name} didn't upload: ${error.message}. Check you're still signed in, then try again.`);
        await discardUpload(propertyId, kind, path);
        continue;
      }
      const result = await recordUpload(propertyId, kind, path, "");
      if (result.ok) added += 1;
      else errors.push(`${file.name}: ${result.message}`);
    }
    setProblems(errors);
    setStatus(added > 0 ? (kind === "video" ? "Video walkthrough saved." : `${added} ${added === 1 ? "photo" : "photos"} added.`) : null);
    setBusy(false);
  }

  return { upload, status, problems, busy };
}

function FilePicker({
  kind,
  label,
  multiple,
  busy,
  onFiles,
}: {
  kind: UploadKind;
  label: string;
  multiple: boolean;
  busy: boolean;
  onFiles: (files: File[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        ref={input}
        type="file"
        accept={Object.keys(UPLOAD_RULES[kind].types).join(",")}
        multiple={multiple}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length) onFiles(files);
        }}
      />
      <button type="button" disabled={busy} onClick={() => input.current?.click()} className={ui.button}>
        {busy ? "Uploading…" : label}
      </button>
      <span className="text-sm text-muted">{UPLOAD_RULES[kind].describe}</span>
    </div>
  );
}

function UploadFeedback({ status, problems }: { status: string | null; problems: string[] }) {
  return (
    <>
      {status && (
        <p role="status" className="text-sm font-semibold text-body">
          {status}
        </p>
      )}
      {problems.length > 0 && (
        <ul role="alert" className={`${ui.error} flex flex-col gap-1`}>
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
    </>
  );
}

function Photos({ propertyId, clientId, photos }: Props) {
  const uploader = useUploader(propertyId, clientId, "photo");
  const [result, setResult] = useState<MediaResult | null>(null);
  const [pending, start] = useTransition();
  const run = (action: () => Promise<MediaResult>) => start(async () => setResult(await action()));

  return (
    <div className={`${ui.card} flex flex-col gap-4`}>
      <div className="flex flex-col gap-0.5">
        <h3 className="font-lb font-bold text-lb-deep">Photos</h3>
        <p className="text-sm text-muted">
          {photos.length === 0
            ? "No photos yet. The first one you add becomes the main photo, used on listing cards and when the link is shared."
            : `${photos.length} ${photos.length === 1 ? "photo" : "photos"}, shown in this order. The main photo leads the gallery and the listing card.`}
        </p>
      </div>
      <FilePicker kind="photo" label="Add photos" multiple busy={uploader.busy} onFiles={uploader.upload} />
      <UploadFeedback status={uploader.status} problems={uploader.problems} />

      {photos.length > 0 && (
        <ol className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy={pending}>
          {photos.map((photo, i) => (
            <li key={photo.id} className="flex flex-col gap-2 rounded-control border border-line bg-page p-2">
              <div className="relative aspect-[4/3] overflow-hidden rounded-chip bg-line-soft">
                {/* eslint-disable-next-line @next/next/no-img-element -- console thumbnails from Storage, no optimisation needed */}
                <img src={photo.url} alt={photo.caption || `Photo ${i + 1}`} loading="lazy" className="size-full object-cover" />
                {photo.isMain && (
                  <span className="absolute top-2 left-2 rounded-chip bg-lb px-2 py-0.5 text-xs font-bold text-white">
                    Main photo
                  </span>
                )}
              </div>
              <CaptionField
                key={photo.caption}
                initial={photo.caption}
                disabled={pending}
                onSave={(caption) => run(() => saveCaption(propertyId, photo.id, caption))}
              />
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  aria-label="Move earlier"
                  disabled={pending || i === 0}
                  onClick={() => run(() => reorderPhoto(propertyId, photo.id, "up"))}
                  className={`${ui.secondaryButton} px-3 disabled:opacity-40`}
                >
                  ←
                </button>
                <button
                  type="button"
                  aria-label="Move later"
                  disabled={pending || i === photos.length - 1}
                  onClick={() => run(() => reorderPhoto(propertyId, photo.id, "down"))}
                  className={`${ui.secondaryButton} px-3 disabled:opacity-40`}
                >
                  →
                </button>
                {!photo.isMain && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => makeMainPhoto(propertyId, photo.id))}
                    className={ui.secondaryButton}
                  >
                    Make main
                  </button>
                )}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (confirm("Remove this photo? The file is deleted and can't be brought back.")) {
                      run(() => deleteMedia(propertyId, photo.id));
                    }
                  }}
                  className="ml-auto min-h-11 px-2 text-sm font-semibold text-fit-red hover:underline"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
      {notice(result)}
    </div>
  );
}

function CaptionField({ initial, disabled, onSave }: { initial: string; disabled: boolean; onSave: (caption: string) => void }) {
  const [text, setText] = useState(initial);
  const changed = text.trim() !== initial;
  return (
    <form
      className="flex gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (changed) onSave(text);
      }}
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={CAPTION_LIMIT}
        placeholder="Caption, e.g. Loading door"
        aria-label="Caption"
        className={`${ui.input} h-10 text-sm`}
      />
      {changed && (
        <button type="submit" disabled={disabled} className={`${ui.secondaryButton} h-10`}>
          Save
        </button>
      )}
    </form>
  );
}

function Video({ propertyId, clientId, video, photos }: Props) {
  const uploader = useUploader(propertyId, clientId, "video");
  const [result, setResult] = useState<MediaResult | null>(null);
  const [pending, start] = useTransition();
  const poster = photos.find((p) => p.isMain)?.url;

  return (
    <div className={`${ui.card} flex flex-col gap-4`}>
      <div className="flex flex-col gap-0.5">
        <h3 className="font-lb font-bold text-lb-deep">Video walkthrough</h3>
        <p className="text-sm text-muted">
          One short video, 30 to 45 seconds, shown first in the gallery. It loads only when a buyer taps play, and uses the main
          photo as its cover.
        </p>
      </div>
      {video && (
        <div className="flex flex-col gap-2 sm:max-w-[480px]">
          <video src={video.url} poster={poster} controls preload="none" playsInline className="aspect-video w-full rounded-control bg-navy" />
          <button
            type="button"
            disabled={pending || uploader.busy}
            onClick={() => {
              if (confirm("Remove the video walkthrough? The file is deleted.")) {
                start(async () => setResult(await deleteMedia(propertyId, video.id)));
              }
            }}
            className="w-fit min-h-11 text-sm font-semibold text-fit-red hover:underline"
          >
            Remove video
          </button>
        </div>
      )}
      <FilePicker
        kind="video"
        label={video ? "Replace video" : "Upload video"}
        multiple={false}
        busy={uploader.busy}
        onFiles={uploader.upload}
      />
      <UploadFeedback status={uploader.status} problems={uploader.problems} />
      {notice(result)}
    </div>
  );
}

function Tour({ propertyId, tourUrl }: Props) {
  const [result, action, pending] = useActionState(saveTourLink.bind(null, propertyId), undefined);
  return (
    <form action={action} className={`${ui.card} flex flex-col gap-3`}>
      <div className="flex flex-col gap-0.5">
        <h3 className="font-lb font-bold text-lb-deep">3D tour</h3>
        <p className="text-sm text-muted">The Realsee link. Buyers open it from a “Walk through in 3D” button. Clear the box to remove it.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          name="tour_url"
          type="url"
          defaultValue={tourUrl ?? ""}
          placeholder="https://realsee.ai/…"
          aria-label="Realsee tour link"
          className={`${ui.input} min-w-0 flex-1 sm:min-w-[320px]`}
        />
        <button type="submit" disabled={pending} className={ui.button}>
          {pending ? "Saving…" : "Save link"}
        </button>
      </div>
      {tourUrl && (
        <a href={tourUrl} target="_blank" rel="noopener noreferrer" className="w-fit text-sm font-semibold text-lb hover:text-lb-deep">
          Open the tour ↗
        </a>
      )}
      {notice(result ?? null)}
    </form>
  );
}
