import { Monitor, Moon, Sun } from "lucide-react";

const options = [
  { value: "system", label: "Match system theme", icon: Monitor },
  { value: "light", label: "Light theme", icon: Sun },
  { value: "dark", label: "Dark theme", icon: Moon }
];

export function ThemeToggle() {
  return (
    <div className="theme-toggle" data-theme-toggle role="group" aria-label="Theme">
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
            <Icon aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
