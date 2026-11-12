import { useId } from "react";
import { OTHER_DESTINATION } from "../../services/destinations";

/**
 * Destination dropdown with an "Other" choice.
 * When the traveller can't find their place in the list they pick "Other" and type it in.
 *
 * value       : "" | "all" | one of options | OTHER_DESTINATION
 * otherValue  : text typed by the traveller when value === OTHER_DESTINATION
 * onChange    : ({ value, otherValue }) => void
 */
export default function DestinationSelect({
  label = "Destination",
  value,
  otherValue = "",
  options = [],
  offered = [],
  allLabel,
  placeholder = "Choose a destination",
  required = false,
  onChange,
}) {
  const listId = useId();
  const isOther = value === OTHER_DESTINATION;
  return (
    <>
      <label>
        {label}
        <select
          required={required}
          value={value}
          onChange={(event) => onChange({ value: event.target.value, otherValue: "" })}
        >
          {allLabel ? <option value="all">{allLabel}</option> : <option value="">{placeholder}</option>}
          {options.map((destination) => (
            <option key={destination} value={destination}>
              {destination}{offered.includes(destination) ? " · offered" : ""}
            </option>
          ))}
          <option value={OTHER_DESTINATION}>Other – type your destination</option>
        </select>
      </label>
      {isOther && (
        <label>
          Your destination
          <input
            required={required}
            autoFocus
            list={listId}
            maxLength="100"
            value={otherValue}
            onChange={(event) => onChange({ value: OTHER_DESTINATION, otherValue: event.target.value })}
            placeholder="Type any place, e.g. Spiti Valley"
          />
          <datalist id={listId}>{options.map((destination) => <option key={destination} value={destination} />)}</datalist>
        </label>
      )}
    </>
  );
}
