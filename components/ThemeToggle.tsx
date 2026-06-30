import { Monitor, Moon, Sun } from "lucide-react";

const options = [
  { value: "system", label: "Use system theme", icon: Monitor },
  { value: "light", label: "Use light theme", icon: Sun },
  { value: "dark", label: "Use dark theme", icon: Moon }
];

export function ThemeToggle() {
  return (
    <div className="theme-toggle" data-theme-toggle aria-label="Theme preference">
      {options.map((option) => {
        const Icon = option.icon;
        return (
          <button
            type="button"
            key={option.value}
            aria-label={option.label}
            aria-pressed={option.value === "system"}
            data-theme-choice={option.value}
          >
            <Icon size={16} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
