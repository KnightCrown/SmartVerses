import React, { useEffect, useMemo, useState } from "react";
import type { Template } from "../types";

export type BlankPresentationAttachment =
  | { type: "none" }
  | { type: "live-slides" }
  | { type: "template"; templateName: string };

interface CreateBlankPresentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string, attachment: BlankPresentationAttachment) => void;
  templates: Template[];
}

const NONE_VALUE = "__none__";
const LIVE_SLIDES_VALUE = "__live_slides__";
const TEMPLATE_PREFIX = "template:";

const CreateBlankPresentationModal: React.FC<CreateBlankPresentationModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  templates,
}) => {
  const [title, setTitle] = useState("");
  const [attachValue, setAttachValue] = useState<string>(NONE_VALUE);

  useEffect(() => {
    if (!isOpen) return;
    setTitle("");
    setAttachValue(NONE_VALUE);
  }, [isOpen]);

  const templateOptions = useMemo(
    () =>
      templates.map((template) => ({
        value: `${TEMPLATE_PREFIX}${template.name}`,
        label: template.name,
      })),
    [templates]
  );

  if (!isOpen) return null;

  const handleCreate = () => {
    const trimmed = title.trim();
    if (!trimmed) return;

    if (attachValue === NONE_VALUE) {
      onCreate(trimmed, { type: "none" });
      onClose();
      return;
    }

    if (attachValue === LIVE_SLIDES_VALUE) {
      onCreate(trimmed, { type: "live-slides" });
      onClose();
      return;
    }

    if (attachValue.startsWith(TEMPLATE_PREFIX)) {
      const templateName = attachValue.slice(TEMPLATE_PREFIX.length).trim();
      if (templateName) {
        onCreate(trimmed, { type: "template", templateName });
        onClose();
      }
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal-content" onMouseDown={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>New Blank Presentation</h2>

        <div className="form-group">
          <label htmlFor="blank-presentation-title">Name</label>
          <input
            id="blank-presentation-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label htmlFor="blank-presentation-attach-template">Attach Template</label>
          <select
            id="blank-presentation-attach-template"
            value={attachValue}
            onChange={(e) => setAttachValue(e.target.value)}
          >
            <option value={NONE_VALUE}>None</option>
            <option value={LIVE_SLIDES_VALUE}>Live Slides</option>
            {templateOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div
            style={{
              marginTop: "6px",
              fontSize: "0.8rem",
              color: "var(--app-text-color-secondary)",
            }}
          >
            Choose a template to apply its trigger rules. Choose None for no tag
            and no template rules.
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button
            onClick={handleCreate}
            className="primary"
            disabled={!title.trim()}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateBlankPresentationModal;
