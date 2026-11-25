"use client";

import { useActionState, useState } from "react";
import {
  DESCRIPTION_LIMIT,
  LISTING_STATUS_LABEL,
  LISTING_STATUSES,
  listingVisibility,
  NOTE_LIMIT,
  parsePrice,
  PERIODS_FOR,
  readListingForm,
  type Deal,
  type ListingField,
  type ListingInput,
} from "@/lib/console/listing-form";
import { availabilityText, DEAL_LABEL, formatPrice } from "@/lib/portal/listing-model";
import { ui } from "../ui";
import type { ListingFormState } from "./actions";

type Props = {
  deal: Deal;
  exists: boolean;
  propertyStatus: string;
  initial: ListingInput;
  action: (prev: ListingFormState, formData: FormData) => Promise<ListingFormState>;
};

const todayIso = () => new Date().toISOString().slice(0, 10);

/** How the price and availability lines will read on the portal. */
function preview(deal: Deal, input: ListingInput) {
  const price = input.price_on_request ? null : parsePrice(input.price);
  return {
    price: formatPrice(price, "KES", deal === "sale" ? "total" : input.price_period, input.price_on_request),
    availability: availabilityText(input.available_from || null, input.availability_note || null, todayIso()),
  };
}

export function ListingForm(props: Props) {
  const [open, setOpen] = useState(props.exists);
  const [state, action, pending] = useActionState(props.action, undefined);
  const values = state?.input ?? props.initial;
  const saved = props.exists || state?.saved === true;

  if (!open) {
    return (
      <section className={`${ui.card} flex flex-wrap items-center justify-between gap-3`}>
        <div className="flex flex-col gap-0.5">
          <h3 className="font-lb font-bold text-lb-deep">{DEAL_LABEL[props.deal]}</h3>
          <p className="text-sm text-muted">Not offered {props.deal === "lease" ? "to let" : "for sale"}.</p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className={ui.secondaryButton}>
          Add {props.deal === "lease" ? "a to-let" : "a for-sale"} listing
        </button>
      </section>
    );
  }

  const visibility = saved ? listingVisibility(values.status, props.propertyStatus) : "Not saved yet.";
  return (
    <form action={action} className={`${ui.card} flex flex-col gap-4`} key={JSON.stringify(values)}>
      <Fields {...props} values={values} errors={state?.errors ?? {}} />
      <p className="text-sm text-muted">{visibility ?? "Showing on the portal."}</p>
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
      <button type="submit" disabled={pending} className={`${ui.button} w-fit`}>
        {pending ? "Saving…" : `Save ${props.deal === "lease" ? "to-let" : "for-sale"} listing`}
      </button>
    </form>
  );
}

function Fields({
  deal,
  values,
  errors,
}: Props & { values: ListingInput; errors: Partial<Record<ListingField, string>> }) {
  const [current, setCurrent] = useState(values);
  const shown = preview(deal, current);
  const periods = PERIODS_FOR[deal];

  const error = (name: ListingField) =>
    errors[name] && (
      <span id={`${deal}-${name}-error`} className="text-sm font-semibold text-fit-red">
        {errors[name]}
      </span>
    );
  const described = (name: ListingField) =>
    errors[name] ? { "aria-invalid": true as const, "aria-describedby": `${deal}-${name}-error` } : {};

  return (
    // Reading the whole form on every change keeps the preview in step without
    // making each field controlled.
    <div
      className="flex flex-col gap-4"
      onChange={(e) => {
        const form = (e.target as HTMLElement).closest("form");
        if (form) setCurrent(readListingForm(new FormData(form)));
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="font-lb text-lg font-bold text-lb-deep">{DEAL_LABEL[deal]}</h3>
        <label className="flex items-center gap-2 text-sm font-semibold text-body">
          Status
          <select name="status" defaultValue={values.status} className={`${ui.input} w-auto`} {...described("status")}>
            {LISTING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {LISTING_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error("status")}

      <label className="flex min-h-11 items-center gap-2.5 text-body">
        <input
          type="checkbox"
          name="price_on_request"
          defaultChecked={values.price_on_request}
          className="size-5 accent-lb"
        />
        Price on request
      </label>

      {!current.price_on_request && (
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_200px]">
          <label className={ui.field}>
            <span className={ui.label}>Price in KES</span>
            <input
              name="price"
              inputMode="numeric"
              defaultValue={values.price}
              placeholder={deal === "lease" ? "650000" : "45000000"}
              className={ui.input}
              {...described("price")}
            />
            {error("price")}
          </label>
          <label className={ui.field}>
            <span className={ui.label}>Period</span>
            <select
              name="price_period"
              defaultValue={periods.some((p) => p.value === values.price_period) ? values.price_period : periods[0].value}
              className={ui.input}
              {...described("price_period")}
            >
              {periods.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            {error("price_period")}
          </label>
        </div>
      )}
      {current.price_on_request && (
        // Keep any typed price in the form so unticking doesn't lose it.
        <>
          <input type="hidden" name="price" value={current.price} />
          <input type="hidden" name="price_period" value={current.price_period} />
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={ui.field}>
          <span className={ui.label}>Available from</span>
          <input type="date" name="available_from" defaultValue={values.available_from} className={ui.input} {...described("available_from")} />
          {errors.available_from ? error("available_from") : <span className="text-sm text-muted">Blank or a past date means available now.</span>}
        </label>
        <label className={ui.field}>
          <span className={ui.label}>Availability note</span>
          <input
            name="availability_note"
            defaultValue={values.availability_note}
            maxLength={NOTE_LIMIT}
            placeholder="Optional, replaces the date line"
            className={ui.input}
            {...described("availability_note")}
          />
          {error("availability_note")}
        </label>
      </div>

      <label className={ui.field}>
        <span className={ui.label}>Description</span>
        <textarea
          name="description"
          defaultValue={values.description}
          maxLength={DESCRIPTION_LIMIT}
          rows={5}
          className={`${ui.input} h-auto py-2.5 leading-6`}
          {...described("description")}
        />
        {errors.description ? (
          error("description")
        ) : (
          <span className="text-sm text-muted">
            Plain words about the space and the deal. Facts with numbers go in the facts section, where they carry their label.
          </span>
        )}
      </label>

      <div className="rounded-control border border-line bg-page px-4 py-3">
        <span className="text-xs font-semibold tracking-[0.5px] text-muted uppercase">On the portal</span>
        <p className="text-lg font-bold text-navy tabular-nums">{shown.price}</p>
        <p className="text-sm text-available">{shown.availability}</p>
      </div>
    </div>
  );
}
