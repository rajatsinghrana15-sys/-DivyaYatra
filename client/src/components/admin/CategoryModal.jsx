import { Check, X } from "lucide-react";
import { useApp } from "../../context/AppContext";

export default function CategoryModal() {
  const { catForm, setCatForm, saveCat } = useApp();
  return (
    <div className="modalShade">
      <div className="modal">
        <button type="button" className="modalClose" onClick={() => setCatForm(null)}>
          <X />
        </button>
        <div className="kicker">JOURNEY TYPES</div>
        <h2>
          {catForm._id ? "Edit" : "Add"} a <em>category.</em>
        </h2>
        <form onSubmit={saveCat}>
          <label>
            Category name
            <input name="name" required defaultValue={catForm.name} />
          </label>
          <label>
            Description
            <textarea name="description" rows="4" defaultValue={catForm.description} />
          </label>
          <button type="submit" className="btn btn-dark full">
            Save category <Check />
          </button>
        </form>
      </div>
    </div>
  );
}
