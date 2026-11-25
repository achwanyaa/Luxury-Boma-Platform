"use client";

import { useActionState, useState } from "react";
import { slugify, type PropertyField, type PropertyInput } from "@/lib/console/property-form";
import type { ClientOption } from "@/lib/console/properties";
import { ui } from "../ui";
import type { PropertyFormState } from "./actions";

type Props = {
  mode: "new" | "edit";
  action: (prev: PropertyFormState, formData: FormData) => Promise<PropertyFormState>;
  initial: PropertyInput;
  clients: ClientOption[];
  isLive?: boolean;
};

export function PropertyForm(props: Props) {
  const [state, action, pending] = useActionState(props.action, undefined);
  const values = state?.input ?? props.initial;
  // Remount after each answer so every field shows what was last submitted.
  return (
    <form action={action} className="flex flex-col gap-5" key={JSON.stringify(values)}>
      <Fields {...props} values={values} errors={state?.errors ?? {}} />
      {state?.message && !state.saved && (
        <p role="alert" className={ui.error}>
          {state.message}
        </p>
      )}
      {state?.saved && (
        <p role="status" className="rounded-control border border-available/30 bg-available-bg px-3 py-2 text-sm text-available">
          Saved.
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className={ui.button}>
          {pending ? "Saving…" : props.mode === "new" ? "Create property" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function Fields({
  mode,
  clients,
  isLive,
  values,
  errors,
}: Props & { values: PropertyInput; errors: Partial<Record<PropertyField, string>> }) {
  const [slug, setSlug] = useState(values.slug);
  // On a new property the slug follows the name until it is typed by hand.
  const [slugTouched, setSlugTouched] = useState(mode === "edit" || values.slug !== "");

  const field = (
    name: PropertyField,
    label: string,
    input: React.ReactNode,
    help?: React.ReactNode,
  ) => (
    <label className={ui.field}>
      <span className={ui.label}>{label}</span>
      {input}
      {help && !errors[name] && <span className="text-sm text-muted">{help}</span>}
      {errors[name] && (
        <span id={`${name}-error`} className="text-sm font-semibold text-fit-red">
          {errors[name]}
        </span>
      )}
    </label>
  );

  const text = (name: PropertyField, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input
      name={name}
      defaultValue={values[name]}
      aria-invalid={errors[name] ? true : undefined}
      aria-describedby={errors[name] ? `${name}-error` : undefined}
      className={`${ui.input} ${errors[name] ? "border-fit-red" : ""}`}
      {...extra}
    />
  );

  const group = "grid gap-4 sm:grid-cols-2";
  const section = `${ui.card} flex flex-col gap-4`;

  return (
    <>
      <fieldset className={section}>
        <legend className={`${ui.h2} float-left mb-1 w-full`}>The property</legend>
        {mode === "new" ? (
          field(
            "client_id",
            "Listed for",
            <select
              name="client_id"
              defaultValue={values.client_id || (clients.length === 1 ? clients[0].id : "")}
              required
              className={ui.input}
            >
              <option value="">Choose a client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>,
            "A property stays with this client; it can't be moved later.",
          )
        ) : (
          <>
            <input type="hidden" name="client_id" value={values.client_id} />
            <p className="text-sm text-body">
              Listed for <strong>{clients.find((c) => c.id === values.client_id)?.name ?? "its client"}</strong>
            </p>
          </>
        )}
        <div className={group}>
          {field("reference", "Reference", text("reference", { required: true, placeholder: "RL-RFK-A7" }), "The client's own unit reference.")}
          {field(
            "name",
            "Name",
            text("name", {
              required: true,
              placeholder: "Rafiki Machinery Industrial Park, Godown A7",
              onChange: (e) => {
                if (!slugTouched) setSlug(slugify(e.target.value));
              },
            }),
          )}
        </div>
        {field(
          "slug",
          "Web address",
          <div className="flex items-center gap-1.5">
            <span className="text-sm whitespace-nowrap text-muted">/properties/</span>
            <input
              name="slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              required
              pattern="[a-z0-9\-]+"
              aria-invalid={errors.slug ? true : undefined}
              aria-describedby={errors.slug ? "slug-error" : undefined}
              className={`${ui.input} ${errors.slug ? "border-fit-red" : ""}`}
            />
          </div>,
          isLive
            ? "This property is live: changing the address breaks links people have already shared."
            : "Lower-case letters, numbers and hyphens.",
        )}
      </fieldset>

      <fieldset className={section}>
        <legend className={`${ui.h2} float-left mb-1 w-full`}>Location</legend>
        {field("address", "Address", text("address", { placeholder: "Plot, road, town" }))}
        <div className={group}>
          {field("area_label", "Area", text("area_label", { placeholder: "Ruiru" }), "Shown on listing cards and the area filter.")}
          {field("near", "Near", text("near", { placeholder: "Off the Eastern Bypass" }))}
          {field("latitude", "Latitude", text("latitude", { inputMode: "decimal", placeholder: "-1.1450" }))}
          {field("longitude", "Longitude", text("longitude", { inputMode: "decimal", placeholder: "36.9600" }))}
        </div>
      </fieldset>

      <fieldset className={section}>
        <legend className={`${ui.h2} float-left mb-1 w-full`}>Who built it, and our visit</legend>
        <div className={group}>
          {field("designed_by", "Designed by", text("designed_by", { placeholder: "Sketch3D Ltd" }))}
          {field("developed_by", "Developed by", text("developed_by"))}
        </div>
        {field(
          "site_visited_on",
          "LuxuryBoma site visit",
          text("site_visited_on", { type: "date" }),
          "Needed before the property can go live.",
        )}
      </fieldset>
    </>
  );
}
